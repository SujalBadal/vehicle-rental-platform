const bcrypt = require("bcryptjs");
const User = require("../models/User");
const createAccessToken = require("../utils/authToken");

function getSafeUser(user) {
  const safeUser = user.toObject();
  delete safeUser.password;
  return safeUser;
}

function sendAuthenticationResponse(res, user, message, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data: {
      token: createAccessToken(user._id.toString()),
      user: getSafeUser(user),
    },
  });
}

async function register(req, res) {
  try {
    const { name, email, password, mobile } = req.body;

    const normalizedMobile = typeof mobile === "string" ? mobile.replace(/[\s-]/g, "") : "";

    if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim() || typeof password !== "string" || !password || !normalizedMobile) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone number, and password are required.",
        errors: [],
      });
    }

    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit Indian mobile number.",
        errors: [],
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
        errors: [],
      });
    }

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
        errors: [],
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      mobile: normalizedMobile,
      role: "customer",
    });

    return sendAuthenticationResponse(res, user, "Account created successfully.", 201);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
        errors: [],
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Please check the registration details.",
        errors: Object.values(error.errors).map((validationError) => validationError.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not create the account.",
      errors: [],
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
        errors: [],
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    const passwordMatches = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!user || !passwordMatches || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Email or password is incorrect.",
        errors: [],
      });
    }

    return sendAuthenticationResponse(res, user, "Logged in successfully.");
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not log in. Please try again.",
      errors: [],
    });
  }
}

async function getCurrentUser(req, res) {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "This account is unavailable.",
        errors: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Current user loaded.",
      data: { user: getSafeUser(user) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not load the current user.",
      errors: [],
    });
  }
}

module.exports = { register, login, getCurrentUser };
