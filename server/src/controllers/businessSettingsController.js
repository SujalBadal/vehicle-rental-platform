const BusinessSettings = require("../models/BusinessSettings");
const { configureCloudinary, uploadVehicleImage, deleteVehicleImage } = require("../services/cloudinaryService");

const settingsFields = ["businessName", "phone", "email", "address", "city", "state", "pincode", "gstin"];

async function getBusinessSettings(req, res) {
  try {
    const settings = await BusinessSettings.findOne({ singletonKey: "main" });
    return res.json({ success: true, message: "Business settings loaded.", data: { settings } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load business settings.", errors: [] });
  }
}

async function saveBusinessSettings(req, res) {
  const values = {};
  for (const field of settingsFields) values[field] = typeof req.body[field] === "string" ? req.body[field].trim() : "";

  if (!values.businessName || !values.phone || !values.address || !values.city) {
    return res.status(400).json({ success: false, message: "Business name, phone, address, and city are required.", errors: [] });
  }
  if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) {
    return res.status(400).json({ success: false, message: "Enter a valid business email address.", errors: [] });
  }

  try {
    const previous = await BusinessSettings.findOne({ singletonKey: "main" });
    let logo = previous?.logo;

    if (req.file) {
      if (!configureCloudinary()) {
        return res.status(503).json({ success: false, message: "Business logo uploads are not configured.", errors: [] });
      }
      const uploaded = await uploadVehicleImage(req.file.buffer, "smart-car-rental/business");
      logo = uploaded;
    }

    const settings = await BusinessSettings.findOneAndUpdate(
      { singletonKey: "main" },
      { $set: { ...values, logo }, $setOnInsert: { singletonKey: "main" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    if (req.file && previous?.logo?.publicId) {
      try {
        await deleteVehicleImage(previous.logo.publicId);
      } catch (error) {
        // Keep the saved logo even if the old Cloudinary image cannot be removed.
      }
    }

    return res.json({ success: true, message: "Business settings saved.", data: { settings } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not save business settings.", errors: [] });
  }
}

module.exports = { getBusinessSettings, saveBusinessSettings };
