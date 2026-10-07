const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const rentalRoutes = require("./routes/rentalRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reportRoutes = require("./routes/reportRoutes");
const userRoutes = require("./routes/userRoutes");
const businessSettingsRoutes = require("./routes/businessSettingsRoutes");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const corsOrigin = process.env.CLIENT_URL
  || (process.env.NODE_ENV === "production" ? false : "http://localhost:5173");
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "20kb" }));

const authenticationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication requests. Wait a few minutes and try again.",
    errors: [],
  },
});

app.use("/api/v1/auth/login", authenticationRateLimit);
app.use("/api/v1/auth/register", authenticationRateLimit);
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/vehicles", vehicleRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/rentals", rentalRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/maintenance", maintenanceRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/business-settings", businessSettingsRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
    errors: [],
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.name === "MulterError") {
    const statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Each image must be 5 MB or smaller."
        : "Choose up to five images per upload.",
      errors: [],
    });
  }

  if (error.message === "Upload a JPG, PNG, or WebP image.") {
    return res.status(400).json({ success: false, message: error.message, errors: [] });
  }

  return res.status(500).json({ success: false, message: "An unexpected server error occurred.", errors: [] });
});

module.exports = app;
