const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Vehicle = require("../models/Vehicle");
const { notifyUser, notifyUsersWithRoles } = require("../services/notificationService");

const reservingStatuses = ["pending", "approved"];

function parseDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return parsedDate;
}

function getOverlapQuery(vehicleId, pickupDate, returnDate, excludedBookingId) {
  const query = {
    vehicle: vehicleId,
    status: { $in: reservingStatuses },
    pickupDate: { $lt: returnDate },
    returnDate: { $gt: pickupDate },
  };

  if (excludedBookingId) query._id = { $ne: excludedBookingId };
  return query;
}

function sendBookingError(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message, errors: [] });
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Please check the booking details.",
      errors: error.errors ? Object.values(error.errors).map((item) => item.message) : [error.message],
    });
  }

  if (error.code === 20 || error.message?.includes("Transaction numbers are only allowed")) {
    return res.status(503).json({
      success: false,
      message: "Booking creation needs MongoDB transactions. Use MongoDB Atlas or a local replica set.",
      errors: [],
    });
  }

  return res.status(500).json({ success: false, message: "Could not complete the booking request.", errors: [] });
}

async function createBooking(req, res) {
  const pickupDate = parseDateOnly(req.body.pickupDate);
  const returnDate = parseDateOnly(req.body.returnDate);

  if (!pickupDate || !returnDate || returnDate <= pickupDate) {
    return res.status(400).json({
      success: false,
      message: "Provide valid YYYY-MM-DD dates, and make the return date later than pickup.",
      errors: [],
    });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (pickupDate < today) {
    return res.status(400).json({ success: false, message: "Pickup date cannot be in the past.", errors: [] });
  }

  if (!mongoose.isValidObjectId(req.body.vehicleId)) {
    return res.status(400).json({ success: false, message: "Vehicle ID is invalid.", errors: [] });
  }

  const session = await mongoose.startSession();
  let createdBooking;

  try {
    await session.withTransaction(async () => {
      const vehicle = await Vehicle.findById(req.body.vehicleId).session(session);

      if (!vehicle) {
        const error = new Error("Vehicle not found.");
        error.statusCode = 404;
        throw error;
      }

      if (vehicle.status !== "available") {
        const error = new Error("This vehicle is not currently available for booking.");
        error.statusCode = 409;
        throw error;
      }

      // Both concurrent requests update the same vehicle document. A write conflict
      // makes MongoDB retry one transaction so it sees the booking saved by the other.
      const vehicleLock = await Vehicle.updateOne(
        { _id: vehicle._id, status: "available" },
        { $inc: { bookingLockVersion: 1 } },
        { session },
      );

      if (vehicleLock.modifiedCount !== 1) {
        const error = new Error("Vehicle status changed. Check availability again.");
        error.statusCode = 409;
        throw error;
      }

      const overlappingBooking = await Booking.findOne(
        getOverlapQuery(vehicle._id, pickupDate, returnDate),
      ).session(session);

      if (overlappingBooking) {
        const error = new Error("This vehicle already has a booking for some of those dates.");
        error.statusCode = 409;
        throw error;
      }

      const numberOfRentalDays = Math.ceil((returnDate - pickupDate) / (24 * 60 * 60 * 1000));
      const dailyRate = vehicle.pricePerDay;
      const bookingDocuments = await Booking.create(
        [{
          customer: req.user.id,
          vehicle: vehicle._id,
          pickupDate,
          returnDate,
          pickupLocation: req.body.pickupLocation,
          dailyRate,
          totalPrice: dailyRate * numberOfRentalDays,
          status: "pending",
        }],
        { session },
      );

      createdBooking = bookingDocuments[0];
    });

    const booking = await Booking.findById(createdBooking._id)
      .populate("vehicle", "make model year registrationNumber pricePerDay images")
      .populate("customer", "name email");

    await notifyUser(req.user.id, {
      type: "booking",
      title: "Booking request received",
      message: `Your booking request for ${booking.vehicle.make} ${booking.vehicle.model} is waiting for staff approval.`,
    });
    await notifyUsersWithRoles(["staff", "admin"], {
      type: "booking",
      title: "New booking request",
      message: `${booking.customer.name} requested ${booking.vehicle.make} ${booking.vehicle.model}. Review the request in the staff dashboard.`,
    });

    return res.status(201).json({
      success: true,
      message: "Booking request submitted for approval.",
      data: { booking },
    });
  } catch (error) {
    return sendBookingError(res, error);
  } finally {
    await session.endSession();
  }
}

async function getBookings(req, res) {
  try {
    const filter = {};
    if (req.user.role === "customer") filter.customer = req.user.id;
    if (req.query.status) filter.status = req.query.status;

    const bookings = await Booking.find(filter)
      .populate("vehicle", "make model year registrationNumber pricePerDay images")
      .populate("customer", "name email")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, message: "Bookings loaded.", data: { bookings } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load bookings.", errors: [] });
  }
}

async function getBookingById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Booking ID is invalid.", errors: [] });
  }

  try {
    const booking = await Booking.findById(req.params.id)
      .populate("vehicle", "make model year registrationNumber pricePerDay images")
      .populate("customer", "name email mobile driverLicenseNumber")
      .populate("reviewedBy", "name");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found.", errors: [] });
    }

    const isBookingCustomer = booking.customer._id.toString() === req.user.id;
    const isStaffOrAdmin = ["staff", "admin"].includes(req.user.role);

    if (!isBookingCustomer && !isStaffOrAdmin) {
      return res.status(403).json({ success: false, message: "You cannot view this booking.", errors: [] });
    }

    return res.status(200).json({ success: true, message: "Booking loaded.", data: { booking } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load booking.", errors: [] });
  }
}

async function cancelBooking(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Booking ID is invalid.", errors: [] });
  }

  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found.", errors: [] });
    }

    const isBookingCustomer = booking.customer.toString() === req.user.id;
    const canManageBookings = ["staff", "admin"].includes(req.user.role);

    if (!isBookingCustomer && !canManageBookings) {
      return res.status(403).json({ success: false, message: "You cannot cancel this booking.", errors: [] });
    }

    if (!["pending", "approved"].includes(booking.status) || booking.pickupDate <= new Date()) {
      return res.status(409).json({
        success: false,
        message: "Only pending or approved bookings with a future pickup date can be cancelled.",
        errors: [],
      });
    }

    booking.status = "cancelled";
    await booking.save();

    await notifyUser(booking.customer, {
      type: "booking",
      title: "Booking cancelled",
      message: `Booking ${booking._id} was cancelled.`,
    });
    await notifyUsersWithRoles(["staff", "admin"], {
      type: "booking",
      title: "Booking cancelled",
      message: `Booking ${booking._id} was cancelled.`,
    });

    return res.status(200).json({ success: true, message: "Booking cancelled.", data: { booking } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not cancel booking.", errors: [] });
  }
}

async function decideBooking(req, res) {
  const { status, rejectionReason } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ success: false, message: "Decision must be approved or rejected.", errors: [] });
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Booking ID is invalid.", errors: [] });
  }

  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found.", errors: [] });
    }

    if (booking.status !== "pending") {
      return res.status(409).json({ success: false, message: "Only pending bookings can be approved or rejected.", errors: [] });
    }

    booking.status = status;
    booking.reviewedBy = req.user.id;
    booking.reviewedAt = new Date();
    booking.rejectionReason = status === "rejected" ? rejectionReason?.trim() : undefined;
    await booking.save();

    await notifyUser(booking.customer, {
      type: "booking",
      title: `Booking ${status}`,
      message: status === "approved"
        ? `Your booking ${booking._id} has been approved.`
        : `Your booking ${booking._id} was rejected. ${booking.rejectionReason || ""}`.trim(),
    });

    return res.status(200).json({
      success: true,
      message: `Booking ${status}.`,
      data: { booking },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not update booking decision.", errors: [] });
  }
}

module.exports = { createBooking, getBookings, getBookingById, cancelBooking, decideBooking };
