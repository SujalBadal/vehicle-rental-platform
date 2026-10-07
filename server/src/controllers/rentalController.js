const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Rental = require("../models/Rental");
const Vehicle = require("../models/Vehicle");
const { notifyUser } = require("../services/notificationService");

function readOdometer(value) {
  const odometer = Number(value);
  return Number.isFinite(odometer) && odometer >= 0 ? odometer : null;
}

function sendRentalError(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message, errors: [] });
  }

  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: "This booking already has a rental record.", errors: [] });
  }

  if (error.code === 20 || error.message?.includes("Transaction numbers are only allowed")) {
    return res.status(503).json({
      success: false,
      message: "Pickup and return processing need MongoDB transactions. Use Atlas or a local replica set.",
      errors: [],
    });
  }

  return res.status(500).json({ success: false, message: "Could not complete the rental operation.", errors: [] });
}

async function getRentals(req, res) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const rentals = await Rental.find(filter)
      .populate("booking", "pickupDate returnDate totalPrice status")
      .populate("vehicle", "make model year registrationNumber status")
      .populate("customer", "name email mobile")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, message: "Rental records loaded.", data: { rentals } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load rental records.", errors: [] });
  }
}

async function pickUpVehicle(req, res) {
  if (!mongoose.isValidObjectId(req.params.bookingId)) {
    return res.status(400).json({ success: false, message: "Booking ID is invalid.", errors: [] });
  }

  const pickupOdometer = readOdometer(req.body.pickupOdometer);
  if (pickupOdometer === null) {
    return res.status(400).json({ success: false, message: "Enter a valid pickup odometer reading.", errors: [] });
  }

  const session = await mongoose.startSession();
  let rentalId;

  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findById(req.params.bookingId).session(session);

      if (!booking) {
        const error = new Error("Booking not found.");
        error.statusCode = 404;
        throw error;
      }

      if (booking.status !== "approved") {
        const error = new Error("Only approved bookings can be picked up.");
        error.statusCode = 409;
        throw error;
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (booking.pickupDate > today) {
        const error = new Error("Pickup date has not arrived yet.");
        error.statusCode = 409;
        throw error;
      }

      const paymentTotals = await Payment.aggregate([
        { $match: { booking: booking._id, status: "received" } },
        { $group: { _id: "$booking", amountReceived: { $sum: "$amount" } } },
      ]).session(session);
      const amountReceived = paymentTotals[0]?.amountReceived || 0;

      if (amountReceived + 0.000001 < booking.totalPrice) {
        const error = new Error("Record payment for the full booking total before pickup.");
        error.statusCode = 409;
        throw error;
      }

      const vehicle = await Vehicle.findById(booking.vehicle).session(session);
      if (!vehicle || vehicle.status !== "available") {
        const error = new Error("The booked vehicle is not currently available for pickup.");
        error.statusCode = 409;
        throw error;
      }

      const vehicleUpdate = await Vehicle.updateOne(
        { _id: vehicle._id, status: "available" },
        { $set: { status: "rented" } },
        { session },
      );

      if (vehicleUpdate.modifiedCount !== 1) {
        const error = new Error("Vehicle status changed. Refresh and check the booking again.");
        error.statusCode = 409;
        throw error;
      }

      const rentals = await Rental.create(
        [{
          booking: booking._id,
          vehicle: vehicle._id,
          customer: booking.customer,
          status: "active",
          pickedUpAt: new Date(),
          pickupOdometer,
          pickupConditionNotes: req.body.pickupConditionNotes?.trim(),
        }],
        { session },
      );

      rentalId = rentals[0]._id;
    });

    const rental = await Rental.findById(rentalId)
      .populate("booking", "pickupDate returnDate totalPrice status")
      .populate("vehicle", "make model year registrationNumber status")
      .populate("customer", "name email");

    await notifyUser(rental.customer._id, {
      type: "rental",
      title: "Vehicle pickup recorded",
      message: `Pickup for ${rental.vehicle.make} ${rental.vehicle.model} has been recorded.`,
    });

    return res.status(201).json({ success: true, message: "Vehicle pickup recorded.", data: { rental } });
  } catch (error) {
    return sendRentalError(res, error);
  } finally {
    await session.endSession();
  }
}

async function returnVehicle(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Rental ID is invalid.", errors: [] });
  }

  const returnOdometer = readOdometer(req.body.returnOdometer);
  if (returnOdometer === null) {
    return res.status(400).json({ success: false, message: "Enter a valid return odometer reading.", errors: [] });
  }

  const session = await mongoose.startSession();

  try {
    let returnedRentalId;

    await session.withTransaction(async () => {
      const rental = await Rental.findOne({ _id: req.params.id, status: "active" }).session(session);

      if (!rental) {
        const error = new Error("Active rental not found. It may already have been returned.");
        error.statusCode = 404;
        throw error;
      }

      if (returnOdometer < rental.pickupOdometer) {
        const error = new Error("Return odometer must be at least the pickup odometer.");
        error.statusCode = 400;
        throw error;
      }

      const damageReported = req.body.damageReported === true || req.body.damageReported === "true";
      const nextVehicleStatus = damageReported ? "maintenance" : "available";
      const vehicleUpdate = await Vehicle.updateOne(
        { _id: rental.vehicle, status: "rented" },
        { $set: { status: nextVehicleStatus } },
        { session },
      );

      if (vehicleUpdate.modifiedCount !== 1) {
        const error = new Error("Vehicle status is inconsistent with this active rental.");
        error.statusCode = 409;
        throw error;
      }

      rental.status = "completed";
      rental.returnedAt = new Date();
      rental.returnOdometer = returnOdometer;
      rental.returnConditionNotes = req.body.returnConditionNotes?.trim();
      rental.damageReported = damageReported;
      rental.damageNotes = damageReported ? req.body.damageNotes?.trim() : undefined;
      await rental.save({ session });

      await Booking.updateOne(
        { _id: rental.booking, status: "approved" },
        { $set: { status: "completed" } },
        { session },
      );

      returnedRentalId = rental._id;
    });

    const rental = await Rental.findById(returnedRentalId)
      .populate("booking", "pickupDate returnDate totalPrice status")
      .populate("vehicle", "make model year registrationNumber status")
      .populate("customer", "name email");

    await notifyUser(rental.customer._id, {
      type: "rental",
      title: "Vehicle return recorded",
      message: rental.damageReported
        ? `Return of ${rental.vehicle.make} ${rental.vehicle.model} was recorded; the vehicle was referred for maintenance.`
        : `Return of ${rental.vehicle.make} ${rental.vehicle.model} was recorded.`,
    });

    return res.status(200).json({
      success: true,
      message: rental.damageReported ? "Vehicle return recorded and vehicle marked for maintenance." : "Vehicle return recorded.",
      data: { rental },
    });
  } catch (error) {
    return sendRentalError(res, error);
  } finally {
    await session.endSession();
  }
}

module.exports = { getRentals, pickUpVehicle, returnVehicle };
