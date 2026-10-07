const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  getMaintenanceRecords,
  scheduleMaintenance,
  updateMaintenanceDetails,
  startMaintenance,
  completeMaintenance,
  cancelMaintenance,
} = require("../controllers/maintenanceController");

const router = express.Router();
router.use(authenticate, authorize("staff", "admin"));

router.get("/", getMaintenanceRecords);
router.post("/", scheduleMaintenance);
router.put("/:id", updateMaintenanceDetails);
router.patch("/:id/start", startMaintenance);
router.patch("/:id/complete", completeMaintenance);
router.patch("/:id/cancel", cancelMaintenance);

module.exports = router;
