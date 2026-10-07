const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const { notifyUser } = require("../services/notificationService");

function sendPaymentError(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message, errors: [] });
  }

  if (error.code === 20 || error.message?.includes("Transaction numbers are only allowed")) {
    return res.status(503).json({
      success: false,
      message: "Payment recording needs MongoDB transactions. Use Atlas or a local replica set.",
      errors: [],
    });
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Please check the payment details.",
      errors: error.errors ? Object.values(error.errors).map((item) => item.message) : [error.message],
    });
  }

  return res.status(500).json({ success: false, message: "Could not record payment.", errors: [] });
}

async function getPayments(req, res) {
  if (req.query.bookingId && !mongoose.isValidObjectId(req.query.bookingId)) {
    return res.status(400).json({ success: false, message: "Booking ID is invalid.", errors: [] });
  }

  try {
    const filter = {};
    if (req.user.role === "customer") filter.customer = req.user.id;
    if (req.query.bookingId) filter.booking = req.query.bookingId;

    const payments = await Payment.find(filter)
      .populate({
        path: "booking",
        select: "pickupDate returnDate totalPrice status",
        populate: { path: "vehicle", select: "make model" },
      })
      .populate("customer", "name email")
      .populate("recordedBy", "name role")
      .sort({ receivedAt: -1 });

    return res.status(200).json({ success: true, message: "Payment records loaded.", data: { payments } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load payment records.", errors: [] });
  }
}

async function recordPayment(req, res) {
  const { bookingId, method, transactionReference } = req.body;
  const amount = Number(req.body.amount);
  const allowedMethods = ["cash", "upi", "card"];

  if (!mongoose.isValidObjectId(bookingId)) {
    return res.status(400).json({ success: false, message: "Booking ID is invalid.", errors: [] });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: "Payment amount must be greater than zero.", errors: [] });
  }

  if (!allowedMethods.includes(method)) {
    return res.status(400).json({ success: false, message: "Choose cash, UPI, or card as the recorded payment method.", errors: [] });
  }

  const cleanReference = typeof transactionReference === "string" ? transactionReference.trim() : "";
  if (["upi", "card"].includes(method) && !cleanReference) {
    return res.status(400).json({
      success: false,
      message: `${method.toUpperCase()} transaction reference is required.`,
      errors: [],
    });
  }

  const session = await mongoose.startSession();
  let paymentId;

  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(session);

      if (!booking) {
        const error = new Error("Booking not found.");
        error.statusCode = 404;
        throw error;
      }

      if (!["approved", "completed"].includes(booking.status)) {
        const error = new Error("Payments can be recorded only for approved or completed bookings.");
        error.statusCode = 409;
        throw error;
      }

      const bookingLock = await Booking.updateOne(
        { _id: booking._id },
        { $inc: { paymentLockVersion: 1 } },
        { session },
      );

      if (bookingLock.modifiedCount !== 1) {
        const error = new Error("Booking changed. Reload it and try again.");
        error.statusCode = 409;
        throw error;
      }

      const paymentTotals = await Payment.aggregate([
        { $match: { booking: booking._id, status: "received" } },
        { $group: { _id: "$booking", amountReceived: { $sum: "$amount" } } },
      ]).session(session);
      const amountAlreadyReceived = paymentTotals[0]?.amountReceived || 0;
      const remainingAmount = Math.max(0, booking.totalPrice - amountAlreadyReceived);

      if (remainingAmount <= 0) {
        const error = new Error("Payment has already been recorded.");
        error.statusCode = 409;
        throw error;
      }

      if (Math.abs(amount - remainingAmount) > 0.000001) {
        const error = new Error(`Payment amount must equal the outstanding balance of ${remainingAmount.toFixed(2)}.`);
        error.statusCode = 409;
        throw error;
      }

      const paymentDocuments = await Payment.create(
        [{
          booking: booking._id,
          customer: booking.customer,
          amount,
          method,
          status: "received",
          transactionReference: cleanReference,
          recordedBy: req.user.id,
        }],
        { session },
      );
      paymentId = paymentDocuments[0]._id;
    });

    const payment = await Payment.findById(paymentId)
      .populate({
        path: "booking",
        select: "pickupDate returnDate totalPrice status",
        populate: { path: "vehicle", select: "make model" },
      })
      .populate("customer", "name email")
      .populate("recordedBy", "name role");

    await notifyUser(payment.customer._id, {
      type: "payment",
      title: "Payment receipt recorded",
      message: `A ${payment.method.toUpperCase()} payment receipt for INR ${payment.amount.toFixed(2)} was recorded for booking ${payment.booking._id}.`,
    });

    return res.status(201).json({
      success: true,
      message: "Payment receipt recorded. No online transaction was processed.",
      data: { payment },
    });
  } catch (error) {
    return sendPaymentError(res, error);
  } finally {
    await session.endSession();
  }
}

module.exports = { getPayments, recordPayment };
