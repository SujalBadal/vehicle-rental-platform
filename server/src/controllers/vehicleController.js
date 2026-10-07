const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Category = require("../models/Category");
const Maintenance = require("../models/Maintenance");
const Vehicle = require("../models/Vehicle");
const {
  configureCloudinary,
  uploadVehicleImage,
  deleteVehicleImage,
} = require("../services/cloudinaryService");

const publicVehicleStatuses = ["available"];
const reservingBookingStatuses = ["pending", "approved"];
const imageLimitPerVehicle = 5;

function isFleetManager(req) {
  return req.user && ["staff", "admin"].includes(req.user.role);
}

function escapeRegularExpression(value) {
  const regularExpressionCharacters = "^$.*+?()[]{}|";
  const backslash = String.fromCharCode(92);
  let escapedValue = "";

  for (const character of value) {
    if (regularExpressionCharacters.includes(character) || character === backslash) {
      escapedValue += backslash;
    }
    escapedValue += character;
  }

  return escapedValue;
}

function parseDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return parsedDate.toISOString().slice(0, 10) === value ? parsedDate : null;
}

async function getVehicles(req, res) {
  try {
    const includeUnavailable = req.query.includeUnavailable === "true";

    if (includeUnavailable && !isFleetManager(req)) {
      return res.status(403).json({ success: false, message: "Staff or admin access is required.", errors: [] });
    }

    const filter = {};
    if (!includeUnavailable) filter.status = { $in: publicVehicleStatuses };

    if (req.query.search?.trim()) {
      const searchExpression = new RegExp(escapeRegularExpression(req.query.search.trim()), "i");
      filter.$or = [{ make: searchExpression }, { model: searchExpression }];
    }

    if (req.query.category) {
      if (!mongoose.isValidObjectId(req.query.category)) {
        return res.status(400).json({ success: false, message: "Category filter is invalid.", errors: [] });
      }
      filter.category = req.query.category;
    }

    if (req.query.transmission) filter.transmission = req.query.transmission;
    if (req.query.fuelType) filter.fuelType = req.query.fuelType;

    if (req.query.seats) {
      const seatCount = Number(req.query.seats);
      if (!Number.isInteger(seatCount) || seatCount < 1) {
        return res.status(400).json({ success: false, message: "Seats filter must be a positive whole number.", errors: [] });
      }
      filter.seats = { $gte: seatCount };
    }

    const minimumPrice = req.query.minPrice === undefined ? undefined : Number(req.query.minPrice);
    const maximumPrice = req.query.maxPrice === undefined ? undefined : Number(req.query.maxPrice);

    if ((minimumPrice !== undefined && (!Number.isFinite(minimumPrice) || minimumPrice < 0))
      || (maximumPrice !== undefined && (!Number.isFinite(maximumPrice) || maximumPrice < 0))) {
      return res.status(400).json({ success: false, message: "Price filters must be valid non-negative numbers.", errors: [] });
    }

    if (minimumPrice !== undefined || maximumPrice !== undefined) {
      filter.pricePerDay = {};
      if (minimumPrice !== undefined) filter.pricePerDay.$gte = minimumPrice;
      if (maximumPrice !== undefined) filter.pricePerDay.$lte = maximumPrice;
    }

    const sortOptions = {
      price_asc: { pricePerDay: 1 },
      price_desc: { pricePerDay: -1 },
      newest: { createdAt: -1 },
      year_desc: { year: -1 },
    };
    const sort = sortOptions[req.query.sort] || sortOptions.newest;
    const parsedPage = Number.parseInt(req.query.page, 10);
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 12;
    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter)
        .populate("category", "name")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Vehicle.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Vehicles loaded.",
      data: { vehicles, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load vehicles.", errors: [] });
  }
}

async function getVehicleById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Vehicle ID is invalid.", errors: [] });
  }

  try {
    const filter = { _id: req.params.id };
    if (!isFleetManager(req)) filter.status = "available";

    const vehicle = await Vehicle.findOne(filter).populate("category", "name description");

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found.", errors: [] });
    }

    return res.status(200).json({ success: true, message: "Vehicle loaded.", data: { vehicle } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load vehicle.", errors: [] });
  }
}

async function createVehicle(req, res) {
  try {
    const category = await Category.findOne({ _id: req.body.category, isActive: true });

    if (!category) {
      return res.status(400).json({ success: false, message: "Choose an active vehicle category.", errors: [] });
    }

    const vehicleDetails = {
      category: category._id,
      make: req.body.make,
      model: req.body.model,
      year: req.body.year,
      registrationNumber: req.body.registrationNumber,
      description: req.body.description,
      transmission: req.body.transmission,
      fuelType: req.body.fuelType,
      seats: req.body.seats,
      pricePerDay: req.body.pricePerDay,
      status: req.body.status || "available",
    };

    const vehicle = await Vehicle.create(vehicleDetails);
    return res.status(201).json({ success: true, message: "Vehicle created.", data: { vehicle } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "That registration number is already in use.", errors: [] });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Please check the vehicle details.",
        errors: error.errors ? Object.values(error.errors).map((item) => item.message) : [error.message],
      });
    }

    return res.status(500).json({ success: false, message: "Could not create vehicle.", errors: [] });
  }
}

async function updateVehicle(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Vehicle ID is invalid.", errors: [] });
  }

  try {
    const editableFields = [
      "category", "make", "model", "year", "registrationNumber", "description",
      "transmission", "fuelType", "seats", "pricePerDay", "status",
    ];
    const updates = {};

    for (const fieldName of editableFields) {
      if (req.body[fieldName] !== undefined) updates[fieldName] = req.body[fieldName];
    }

    if (updates.category) {
      const category = await Category.findOne({ _id: updates.category, isActive: true });
      if (!category) {
        return res.status(400).json({ success: false, message: "Choose an active vehicle category.", errors: [] });
      }
    }

    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("category", "name");

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found.", errors: [] });
    }

    return res.status(200).json({ success: true, message: "Vehicle updated.", data: { vehicle } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "That registration number is already in use.", errors: [] });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Please check the vehicle details.",
        errors: error.errors ? Object.values(error.errors).map((item) => item.message) : [error.message],
      });
    }

    return res.status(500).json({ success: false, message: "Could not update vehicle.", errors: [] });
  }
}

async function updateVehicleStatus(req, res) {
  const allowedStatuses = ["available", "rented", "maintenance", "inactive"];

  if (!allowedStatuses.includes(req.body.status)) {
    return res.status(400).json({ success: false, message: "Choose a valid vehicle status.", errors: [] });
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Vehicle ID is invalid.", errors: [] });
  }

  try {
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true },
    );

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found.", errors: [] });
    }

    return res.status(200).json({ success: true, message: "Vehicle status updated.", data: { vehicle } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not update vehicle status.", errors: [] });
  }
}

async function deleteVehicle(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Vehicle ID is invalid.", errors: [] });
  }

  try {
    const [hasBookings, hasMaintenance] = await Promise.all([
      Booking.exists({ vehicle: req.params.id }),
      Maintenance.exists({ vehicle: req.params.id }),
    ]);

    if (hasBookings || hasMaintenance) {
      return res.status(409).json({
        success: false,
        message: "This vehicle has rental history or maintenance records. Set its status to inactive instead.",
        errors: [],
      });
    }

    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found.", errors: [] });
    }

    return res.status(200).json({ success: true, message: "Vehicle deleted.", data: {} });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not delete vehicle.", errors: [] });
  }
}

async function checkVehicleAvailability(req, res) {
  const pickupDate = parseDateOnly(req.query.pickupDate);
  const returnDate = parseDateOnly(req.query.returnDate);

  if (!pickupDate || !returnDate || returnDate <= pickupDate) {
    return res.status(400).json({
      success: false,
      message: "Provide valid YYYY-MM-DD pickup and return dates; return must be after pickup.",
      errors: [],
    });
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Vehicle ID is invalid.", errors: [] });
  }

  try {
    const vehicle = await Vehicle.findById(req.params.id).select("status");

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found.", errors: [] });
    }

    const conflictingBooking = await Booking.findOne({
      vehicle: vehicle._id,
      status: { $in: reservingBookingStatuses },
      pickupDate: { $lt: returnDate },
      returnDate: { $gt: pickupDate },
    }).select("_id pickupDate returnDate status");

    const vehicleCanBeBooked = vehicle.status === "available";
    const isAvailable = vehicleCanBeBooked && !conflictingBooking;

    return res.status(200).json({
      success: true,
      message: "Availability checked.",
      data: {
        vehicleId: vehicle._id,
        pickupDate,
        returnDate,
        available: isAvailable,
        reason: !vehicleCanBeBooked ? `Vehicle is currently ${vehicle.status}.` : conflictingBooking ? "The dates overlap an existing booking." : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not check vehicle availability.", errors: [] });
  }
}

async function uploadVehicleImages(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Vehicle ID is invalid.", errors: [] });
  }



  if (!req.files?.length) {
    return res.status(400).json({ success: false, message: "Choose at least one image to upload.", errors: [] });
  }

  if (!configureCloudinary()) {
    return res.status(503).json({
      success: false,
      message: "Image uploads are not configured. Add the Cloudinary settings to server/.env.",
      errors: [],
    });
  }

  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found.", errors: [] });
    }

    const replaceExistingImages = req.query.replace === "true";
    const imageCountAfterUpload = replaceExistingImages
      ? req.files.length
      : vehicle.images.length + req.files.length;

    if (imageCountAfterUpload > imageLimitPerVehicle) {
      return res.status(400).json({
        success: false,
        message: `A vehicle can have no more than ${imageLimitPerVehicle} images.`,
        errors: [],
      });
    }

    const uploadedImages = await Promise.all(
      req.files.map((file) => uploadVehicleImage(file.buffer)),
    );

    const oldImages = replaceExistingImages ? [...vehicle.images] : [];
    if (replaceExistingImages) {
      vehicle.images = uploadedImages;
    } else {
      vehicle.images.push(...uploadedImages);
    }
    await vehicle.save();

    // Keep the saved database record pointing at the new images even if cleanup fails.
    const failedImageCleanup = [];
    for (const oldImage of oldImages) {
      if (!oldImage.publicId) continue;
      try {
        await deleteVehicleImage(oldImage.publicId);
      } catch (error) {
        failedImageCleanup.push(oldImage.publicId);
        console.error("Cloudinary cleanup failed for a replaced vehicle image.");
      }
    }

    return res.status(201).json({
      success: true,
      message: failedImageCleanup.length
        ? "New vehicle images saved, but an old Cloudinary image could not be removed."
        : "Vehicle images uploaded.",
      data: { vehicle, images: vehicle.images, cleanupFailed: failedImageCleanup.length > 0 },
    });
  } catch (error) {
    console.error("Cloudinary vehicle image upload failed.");
    return res.status(502).json({
      success: false,
      message: "Could not upload vehicle images. Check Cloudinary configuration and try again.",
      errors: [],
    });
  }
}

async function removeVehicleImage(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Vehicle ID is invalid.", errors: [] });
  }

  if (!configureCloudinary()) {
    return res.status(503).json({ success: false, message: "Image uploads are not configured.", errors: [] });
  }

  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found.", errors: [] });
    }

    const imageIndex = vehicle.images.findIndex((image) => image.publicId === req.body.publicId);

    if (imageIndex === -1) {
      return res.status(404).json({ success: false, message: "Image not found on this vehicle.", errors: [] });
    }

    const [image] = vehicle.images.splice(imageIndex, 1);
    await deleteVehicleImage(image.publicId);
    await vehicle.save();

    return res.status(200).json({ success: true, message: "Vehicle image deleted.", data: { images: vehicle.images } });
  } catch (error) {
    console.error("Cloudinary vehicle image removal failed.");
    return res.status(502).json({ success: false, message: "Could not delete vehicle image.", errors: [] });
  }
}

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  updateVehicleStatus,
  deleteVehicle,
  checkVehicleAvailability,
  uploadVehicleImages,
  removeVehicleImage,
};
