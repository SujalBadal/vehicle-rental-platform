const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");

function getSafeUser(user) {
  const safeUser = user.toObject();
  delete safeUser.password;
  return safeUser;
}

function normalizePhone(value) {
  return typeof value === "string" ? value.trim().replace(/[\s-]/g, "") : "";
}

function isValidPhone(value) {
  return /^[6-9]\d{9}$/.test(value);
}

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message, errors: [] });
}

async function getMyProfile(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return sendError(res, 404, "Account not found.");

  return res.json({ success: true, message: "Profile loaded.", data: { user: getSafeUser(user) } });
}

async function updateMyProfile(req, res) {
  const { name } = req.body;
  const mobile = normalizePhone(req.body.mobile);

  if (typeof name !== "string" || !name.trim()) return sendError(res, 400, "Enter your name.");
  if (!isValidPhone(mobile)) return sendError(res, 400, "Enter a valid 10-digit Indian mobile number.");

  const user = await User.findById(req.user.id);
  if (!user) return sendError(res, 404, "Account not found.");

  user.name = name.trim();
  user.mobile = mobile;
  await user.save();
  return res.json({ success: true, message: "Profile updated.", data: { user: getSafeUser(user) } });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) return sendError(res, 400, "Enter your current and new passwords.");
  if (newPassword.length < 8) return sendError(res, 400, "New password must be at least 8 characters long.");

  const user = await User.findById(req.user.id).select("+password");
  if (!user) return sendError(res, 404, "Account not found.");

  const passwordMatches = await bcrypt.compare(currentPassword, user.password);
  if (!passwordMatches) return sendError(res, 400, "Current password is incorrect.");

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();
  return res.json({ success: true, message: "Password changed successfully." });
}

async function listManagedUsers(req, res) {
  const { role } = req.query;
  if (role !== "staff") return sendError(res, 400, "Only staff accounts can be managed here.");

  const users = await User.find({ role }).select("name email mobile role isActive createdAt").sort({ name: 1 });
  return res.json({ success: true, message: "Users loaded.", data: { users } });
}

async function createStaff(req, res) {
  const { name, email, password } = req.body;
  const mobile = normalizePhone(req.body.mobile);

  if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim() || typeof password !== "string" || !password || !mobile) {
    return sendError(res, 400, "Name, email, phone number, and password are required.");
  }
  if (!isValidPhone(mobile)) return sendError(res, 400, "Enter a valid 10-digit Indian mobile number.");
  if (password.length < 8) return sendError(res, 400, "Password must be at least 8 characters long.");

  try {
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile,
      password: await bcrypt.hash(password, 12),
      role: "staff",
    });
    return res.status(201).json({ success: true, message: "Staff account created.", data: { user: getSafeUser(user) } });
  } catch (error) {
    if (error.code === 11000) return sendError(res, 409, "An account with this email already exists.");
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: "Please check the staff details.", errors: Object.values(error.errors).map((item) => item.message) });
    }
    return sendError(res, 500, "Could not create the staff account.");
  }
}

async function updateManagedUser(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 400, "Staff account ID is invalid.");

  const { name } = req.body;
  const mobile = normalizePhone(req.body.mobile);
  if (typeof name !== "string" || !name.trim()) return sendError(res, 400, "Enter a name.");
  if (!isValidPhone(mobile)) return sendError(res, 400, "Enter a valid 10-digit Indian mobile number.");

  const user = await User.findById(req.params.id);
  if (!user || user.role !== "staff") return sendError(res, 404, "Staff account not found.");

  user.name = name.trim();
  user.mobile = mobile;
  await user.save();
  return res.json({ success: true, message: "User details updated.", data: { user: getSafeUser(user) } });
}

async function updateManagedUserStatus(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 400, "Staff account ID is invalid.");

  if (typeof req.body.isActive !== "boolean") return sendError(res, 400, "Choose an account status.");

  const user = await User.findById(req.params.id);
  if (!user || user.role !== "staff" || user._id.toString() === req.user.id) {
    return sendError(res, 404, "Staff account not found.");
  }

  user.isActive = req.body.isActive;
  await user.save();
  return res.json({ success: true, message: "Account status updated.", data: { user: getSafeUser(user) } });
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  changePassword,
  listManagedUsers,
  createStaff,
  updateManagedUser,
  updateManagedUserStatus,
};
