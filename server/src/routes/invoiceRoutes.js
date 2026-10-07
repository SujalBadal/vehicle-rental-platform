const express = require("express");
const authenticate = require("../middleware/authenticate");
const {
  getInvoices,
  createInvoice,
  getInvoiceById,
  downloadInvoicePdf,
} = require("../controllers/invoiceController");

const router = express.Router();
router.use(authenticate);

router.get("/", getInvoices);
router.post("/bookings/:bookingId", createInvoice);
router.get("/:id/pdf", downloadInvoicePdf);
router.get("/:id", getInvoiceById);

module.exports = router;
