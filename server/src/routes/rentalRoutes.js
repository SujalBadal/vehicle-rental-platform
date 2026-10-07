const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { getRentals, pickUpVehicle, returnVehicle } = require("../controllers/rentalController");

const router = express.Router();
router.use(authenticate, authorize("staff", "admin"));

router.get("/", getRentals);
router.post("/bookings/:bookingId/pickup", pickUpVehicle);
router.patch("/:id/return", returnVehicle);

module.exports = router;
