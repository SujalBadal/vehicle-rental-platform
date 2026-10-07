const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function optionalAuthenticate(req, res, next) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return next();
  }

  const token = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "The authorization header must use a bearer token.",
      errors: [],
    });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedToken.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "This account is unavailable. Please log in again.",
        errors: [],
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Your session is invalid or expired. Please log in again.",
      errors: [],
    });
  }
}

module.exports = optionalAuthenticate;
