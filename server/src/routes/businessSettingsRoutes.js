const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const imageUpload = require("../middleware/vehicleImageUpload");
const { getBusinessSettings, saveBusinessSettings } = require("../controllers/businessSettingsController");

const router = express.Router();
router.use(authenticate, authorize("admin"));
router.get("/", getBusinessSettings);
router.put("/", imageUpload.single("logo"), saveBusinessSettings);

module.exports = router;
