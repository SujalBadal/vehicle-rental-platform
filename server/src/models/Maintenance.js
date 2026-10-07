const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    serviceType: { type: String, trim: true, maxlength: 100 },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
      required: true,
    },
    scheduledAt: { type: Date, required: true },
    completedAt: Date,
    cost: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true, maxlength: 2000 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

maintenanceSchema.index({ vehicle: 1, scheduledAt: -1 });

module.exports = mongoose.model("Maintenance", maintenanceSchema);
