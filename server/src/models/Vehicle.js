const mongoose = require("mongoose");

const vehicleImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
  },
  { _id: false },
);

const vehicleSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Vehicle category is required."],
    },
    make: { type: String, required: true, trim: true, maxlength: 60 },
    model: { type: String, required: true, trim: true, maxlength: 60 },
    year: { type: Number, required: true, min: 1900, max: 2100 },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    description: { type: String, trim: true, maxlength: 2000 },
    transmission: {
      type: String,
      enum: ["manual", "automatic"],
      required: true,
    },
    fuelType: {
      type: String,
      enum: ["petrol", "diesel", "hybrid", "electric", "other"],
      required: true,
    },
    seats: { type: Number, required: true, min: 1, max: 50 },
    pricePerDay: { type: Number, required: true, min: 0 },
    images: { type: [vehicleImageSchema], default: [] },
    status: {
      type: String,
      enum: ["available", "rented", "maintenance", "inactive"],
      default: "available",
      required: true,
    },
    // Incremented inside each booking transaction to serialize date checks per vehicle.
    bookingLockVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  { timestamps: true },
);

vehicleSchema.index({ category: 1, status: 1 });
vehicleSchema.index({ make: 1, model: 1 });

module.exports = mongoose.model("Vehicle", vehicleSchema);
