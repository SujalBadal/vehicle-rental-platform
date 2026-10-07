const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address."],
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: 8,
      select: false,
    },
    mobile: {
      type: String,
      required: [true, "Phone number is required."],
      trim: true,
      set: (value) => value?.replace(/[\s-]/g, ""),
      match: [/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."],
    },
    role: {
      type: String,
      enum: ["customer", "staff", "admin"],
      default: "customer",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    driverLicenseNumber: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    driverLicenseExpiry: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
