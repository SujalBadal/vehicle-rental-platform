const mongoose = require("mongoose");

const businessSettingsSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, required: true, unique: true, default: "main" },
    businessName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    address: { type: String, required: true, trim: true, maxlength: 250 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 },
    pincode: { type: String, trim: true, maxlength: 20 },
    gstin: { type: String, trim: true, uppercase: true, maxlength: 20 },
    logo: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BusinessSettings", businessSettingsSchema);
