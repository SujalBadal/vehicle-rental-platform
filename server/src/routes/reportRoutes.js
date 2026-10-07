const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  getOverview,
  getBookingReport,
  getFleetReport,
  getMaintenanceReport,
  getRevenueReport,
} = require("../controllers/reportController");

const router = express.Router();
router.use(authenticate, authorize("staff", "admin"));

router.get("/overview", getOverview);
router.get("/bookings", getBookingReport);
router.get("/fleet", getFleetReport);
router.get("/maintenance", getMaintenanceReport);
router.get("/revenue", authorize("admin"), getRevenueReport);

module.exports = router;
