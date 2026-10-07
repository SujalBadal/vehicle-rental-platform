const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      required: true,
    },
    pickedUpAt: Date,
    returnedAt: Date,
    pickupOdometer: { type: Number, min: 0 },
    returnOdometer: { type: Number, min: 0 },
    pickupConditionNotes: { type: String, trim: true, maxlength: 2000 },
    returnConditionNotes: { type: String, trim: true, maxlength: 2000 },
    damageReported: { type: Boolean, default: false },
    damageNotes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Rental", rentalSchema);
