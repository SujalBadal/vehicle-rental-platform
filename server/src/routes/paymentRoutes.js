const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { getPayments, recordPayment } = require("../controllers/paymentController");

const router = express.Router();
router.use(authenticate);

router.get("/", getPayments);
router.post("/", authorize("staff", "admin"), recordPayment);

module.exports = router;
