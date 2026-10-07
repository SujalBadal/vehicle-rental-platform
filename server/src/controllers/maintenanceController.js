const mongoose = require("mongoose");
const Maintenance = require("../models/Maintenance");
const Vehicle = require("../models/Vehicle");
const { notifyUsersWithRoles } = require("../services/notificationService");

const openMaintenanceStatuses = ["scheduled", "in_progress"];

function sendMaintenanceError(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message, errors: [] });
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Please check the maintenance details.",
      errors: error.errors ? Object.values(error.errors).map((item) => item.message) : [error.message],
    });
  }

  if (error.code === 20 || error.message?.includes("Transaction numbers are only allowed")) {
    return res.status(503).json({ success: false, message: "Maintenance updates need MongoDB transactions. Use Atlas or a local replica set.", errors: [] });
  }

  return res.status(500).json({ success: false, message: "Could not update maintenance records.", errors: [] });
}

async function getMaintenanceRecords(req, res) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.vehicleId) {
      if (!mongoose.isValidObjectId(req.query.vehicleId)) {
        return res.status(400).json({ success: false, message: "Vehicle ID is invalid.", errors: [] });
      }
      filter.vehicle = req.query.vehicleId;
    }

    const records = await Maintenance.find(filter)
      .populate("vehicle", "make model year registrationNumber status")
      .populate("createdBy", "name role")
      .populate("performedBy", "name role")
      .sort({ scheduledAt: -1 });

    return res.status(200).json({ success: true, message: "Maintenance records loaded.", data: { maintenance: records } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load maintenance records.", errors: [] });
  }
}

async function scheduleMaintenance(req, res) {
  const { vehicleId, serviceType, description, scheduledAt, notes } = req.body;
  const cost = req.body.cost === undefined || req.body.cost === "" ? 0 : Number(req.body.cost);
  const scheduledDate = new Date(scheduledAt);

  if (!mongoose.isValidObjectId(vehicleId)) {
    return res.status(400).json({ success: false, message: "Vehicle ID is invalid.", errors: [] });
  }

  if (!serviceType?.trim() || !description?.trim() || Number.isNaN(scheduledDate.getTime()) || !Number.isFinite(cost) || cost < 0) {
    return res.status(400).json({ success: false, message: "Enter a service type, description, valid schedule date, and non-negative cost.", errors: [] });
  }

  const session = await mongoose.startSession();

  try {
    let maintenanceId;
    await session.withTransaction(async () => {
      const vehicle = await Vehicle.findById(vehicleId).session(session);

      if (!vehicle) {
        const error = new Error("Vehicle not found.");
        error.statusCode = 404;
        throw error;
      }

      if (!["available", "maintenance"].includes(vehicle.status)) {
        const error = new Error(`Cannot schedule maintenance while this vehicle is ${vehicle.status}.`);
        error.statusCode = 409;
        throw error;
      }

      const records = await Maintenance.create(
        [{ vehicle: vehicle._id, serviceType: serviceType.trim(), description, scheduledAt: scheduledDate, notes, cost, createdBy: req.user.id }],
        { session },
      );

      vehicle.status = "maintenance";
      await vehicle.save({ session });
      maintenanceId = records[0]._id;
    });

    const maintenance = await Maintenance.findById(maintenanceId)
      .populate("vehicle", "make model year registrationNumber status")
      .populate("createdBy", "name role")
      .populate("performedBy", "name role");

    await notifyUsersWithRoles(["admin"], {
      type: "maintenance",
      title: "Vehicle maintenance scheduled",
      message: `${maintenance.vehicle.make} ${maintenance.vehicle.model}: ${maintenance.description}`,
    });

    return res.status(201).json({ success: true, message: "Maintenance scheduled; vehicle is unavailable until work is completed or cancelled.", data: { maintenance } });
  } catch (error) {
    return sendMaintenanceError(res, error);
  } finally {
    await session.endSession();
  }
}

async function updateMaintenanceDetails(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Maintenance ID is invalid.", errors: [] });
  }

  const updates = {};
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.serviceType !== undefined) updates.serviceType = req.body.serviceType;
  if (req.body.scheduledAt !== undefined) updates.scheduledAt = req.body.scheduledAt;
  if (req.body.cost !== undefined) updates.cost = req.body.cost;
  if (req.body.notes !== undefined) updates.notes = req.body.notes;

  try {
    const maintenance = await Maintenance.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("vehicle", "make model year registrationNumber status");

    if (!maintenance) {
      return res.status(404).json({ success: false, message: "Maintenance record not found.", errors: [] });
    }

    return res.status(200).json({ success: true, message: "Maintenance details updated.", data: { maintenance } });
  } catch (error) {
    return sendMaintenanceError(res, error);
  }
}

async function startMaintenance(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Maintenance ID is invalid.", errors: [] });
  }

  try {
    const maintenance = await Maintenance.findOneAndUpdate(
      { _id: req.params.id, status: "scheduled" },
      { $set: { status: "in_progress" } },
      { new: true, runValidators: true },
    ).populate("vehicle", "make model year registrationNumber status");

    if (!maintenance) {
      return res.status(409).json({ success: false, message: "Only scheduled maintenance can be started.", errors: [] });
    }

    return res.status(200).json({ success: true, message: "Maintenance started.", data: { maintenance } });
  } catch (error) {
    return sendMaintenanceError(res, error);
  }
}

async function finishMaintenance(req, res, cancelled = false) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Maintenance ID is invalid.", errors: [] });
  }

  const session = await mongoose.startSession();

  try {
    let maintenanceId;
    await session.withTransaction(async () => {
      const maintenance = await Maintenance.findOne({
        _id: req.params.id,
        status: { $in: openMaintenanceStatuses },
      }).session(session);

      if (!maintenance) {
        const error = new Error("Open maintenance record not found.");
        error.statusCode = 404;
        throw error;
      }

      maintenance.status = cancelled ? "cancelled" : "completed";
      if (!cancelled) {
        maintenance.completedAt = new Date();
        maintenance.performedBy = req.user.id;
        if (req.body.cost !== undefined) maintenance.cost = req.body.cost;
      }
      await maintenance.save({ session });

      const otherOpenWork = await Maintenance.exists({
        vehicle: maintenance.vehicle,
        _id: { $ne: maintenance._id },
        status: { $in: openMaintenanceStatuses },
      }).session(session);

      if (!otherOpenWork) {
        await Vehicle.updateOne(
          { _id: maintenance.vehicle, status: "maintenance" },
          { $set: { status: "available" } },
          { session },
        );
      }

      maintenanceId = maintenance._id;
    });

    const maintenance = await Maintenance.findById(maintenanceId)
      .populate("vehicle", "make model year registrationNumber status")
      .populate("createdBy", "name role")
      .populate("performedBy", "name role");

    return res.status(200).json({
      success: true,
      message: cancelled ? "Maintenance cancelled." : "Maintenance completed.",
      data: { maintenance },
    });
  } catch (error) {
    return sendMaintenanceError(res, error);
  } finally {
    await session.endSession();
  }
}

async function completeMaintenance(req, res) {
  return finishMaintenance(req, res, false);
}

async function cancelMaintenance(req, res) {
  return finishMaintenance(req, res, true);
}

module.exports = {
  getMaintenanceRecords,
  scheduleMaintenance,
  updateMaintenanceDetails,
  startMaintenance,
  completeMaintenance,
  cancelMaintenance,
};
