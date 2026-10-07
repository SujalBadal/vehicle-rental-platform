const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const optionalAuthenticate = require("../middleware/optionalAuthenticate");
const imageUpload = require("../middleware/vehicleImageUpload");
const {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  updateVehicleStatus,
  deleteVehicle,
  checkVehicleAvailability,
  uploadVehicleImages,
  removeVehicleImage,
} = require("../controllers/vehicleController");

const router = express.Router();

router.get("/", optionalAuthenticate, getVehicles);
router.get("/:id/availability", checkVehicleAvailability);
router.get("/:id", optionalAuthenticate, getVehicleById);

router.post("/", authenticate, authorize("staff", "admin"), createVehicle);
router.put("/:id", authenticate, authorize("staff", "admin"), updateVehicle);
router.patch("/:id/status", authenticate, authorize("staff", "admin"), updateVehicleStatus);
router.delete("/:id", authenticate, authorize("admin"), deleteVehicle);
router.post(
  "/:id/images",
  authenticate,
  authorize("staff", "admin"),
  imageUpload.array("images", 5),
  uploadVehicleImages,
);
router.delete(
  "/:id/images",
  authenticate,
  authorize("staff", "admin"),
  removeVehicleImage,
);

module.exports = router;
