const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["cash", "upi", "card"],
      required: true,
    },
    status: {
      type: String,
      enum: ["received", "refunded"],
      default: "received",
      required: true,
    },
    transactionReference: { type: String, trim: true, maxlength: 100 },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receivedAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: true },
);

paymentSchema.index({ booking: 1, receivedAt: -1 });
paymentSchema.index({ customer: 1, receivedAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
