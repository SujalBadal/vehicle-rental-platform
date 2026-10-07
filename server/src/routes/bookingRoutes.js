const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  createBooking,
  getBookings,
  getBookingById,
  cancelBooking,
  decideBooking,
} = require("../controllers/bookingController");

const router = express.Router();

router.use(authenticate);
router.get("/", getBookings);
router.post("/", authorize("customer"), createBooking);
router.get("/:id", getBookingById);
router.patch("/:id/cancel", cancelBooking);
router.patch("/:id/decision", authorize("staff", "admin"), decideBooking);

module.exports = router;
