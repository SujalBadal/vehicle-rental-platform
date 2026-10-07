const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    pickupLocation: { type: String, trim: true, maxlength: 200 },
    dailyRate: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "completed"],
      default: "pending",
      required: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    paymentLockVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  { timestamps: true },
);

bookingSchema.path("returnDate").validate(function (returnDate) {
  return !this.pickupDate || returnDate > this.pickupDate;
}, "Return date must be after pickup date.");

bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ vehicle: 1, pickupDate: 1, returnDate: 1, status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
