const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const Booking = require("../models/Booking");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const BusinessSettings = require("../models/BusinessSettings");
const { notifyUser } = require("../services/notificationService");

function canViewCustomerData(req, customerId) {
  return ["staff", "admin"].includes(req.user.role) || req.user.id === customerId.toString();
}

async function getInvoices(req, res) {
  try {
    const filter = {};
    if (req.user.role === "customer") filter.customer = req.user.id;

    const invoices = await Invoice.find(filter)
      .populate("booking", "pickupDate returnDate totalPrice status")
      .populate("customer", "name email")
      .sort({ issuedAt: -1 });

    return res.status(200).json({ success: true, message: "Invoices loaded.", data: { invoices } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load invoices.", errors: [] });
  }
}

async function createInvoice(req, res) {
  if (!mongoose.isValidObjectId(req.params.bookingId)) {
    return res.status(400).json({ success: false, message: "Booking ID is invalid.", errors: [] });
  }

  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate("vehicle", "make model year")
      .populate("customer", "name email");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found.", errors: [] });
    }

    if (!canViewCustomerData(req, booking.customer._id)) {
      return res.status(403).json({ success: false, message: "You cannot create an invoice for this booking.", errors: [] });
    }

    if (!["approved", "completed"].includes(booking.status)) {
      return res.status(409).json({ success: false, message: "An invoice is available only for an approved or completed booking.", errors: [] });
    }

    const paymentTotals = await Payment.aggregate([
      { $match: { booking: booking._id, status: "received" } },
      { $group: { _id: "$booking", amountReceived: { $sum: "$amount" } } },
    ]);
    const amountReceived = paymentTotals[0]?.amountReceived || 0;

    if (amountReceived + 0.000001 < booking.totalPrice) {
      return res.status(409).json({ success: false, message: "Record the full booking total before generating its invoice.", errors: [] });
    }

    let invoice = await Invoice.findOne({ booking: booking._id });
    let createdNow = false;

    if (!invoice) {
      const invoiceNumber = `INV-${booking._id.toString().toUpperCase()}`;

      try {
        invoice = await Invoice.create({
          invoiceNumber,
          booking: booking._id,
          customer: booking.customer._id,
          amount: booking.totalPrice,
          issuedAt: new Date(),
        });
        createdNow = true;
      } catch (error) {
        if (error.code !== 11000) throw error;
        invoice = await Invoice.findOne({ booking: booking._id });
      }
    }

    if (createdNow) {
      await notifyUser(booking.customer._id, {
        type: "invoice",
        title: "Invoice is ready",
        message: `Invoice ${invoice.invoiceNumber} is ready to download.`,
      });
    }

    return res.status(201).json({ success: true, message: "Invoice is ready to download.", data: { invoice } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not create invoice.", errors: [] });
  }
}

async function getInvoiceForUser(invoiceId, req) {
  const invoice = await Invoice.findById(invoiceId)
    .populate({
      path: "booking",
      populate: { path: "vehicle", select: "make model year registrationNumber" },
    })
    .populate("customer", "name email mobile");

  if (!invoice) return { invoice: null, forbidden: false };
  if (!canViewCustomerData(req, invoice.customer._id)) return { invoice: null, forbidden: true };
  return { invoice, forbidden: false };
}

async function getInvoiceById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invoice ID is invalid.", errors: [] });
  }

  try {
    const { invoice, forbidden } = await getInvoiceForUser(req.params.id, req);
    if (forbidden) return res.status(403).json({ success: false, message: "You cannot view this invoice.", errors: [] });
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found.", errors: [] });

    return res.status(200).json({ success: true, message: "Invoice loaded.", data: { invoice } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load invoice.", errors: [] });
  }
}

async function downloadInvoicePdf(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invoice ID is invalid.", errors: [] });
  }

  try {
    const { invoice, forbidden } = await getInvoiceForUser(req.params.id, req);
    if (forbidden) return res.status(403).json({ success: false, message: "You cannot download this invoice.", errors: [] });
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found.", errors: [] });

    const booking = invoice.booking;
    const vehicle = booking.vehicle;
    const [business, payments] = await Promise.all([
      BusinessSettings.findOne({ singletonKey: "main" }),
      Payment.find({ booking: booking._id, status: "received" }).populate("recordedBy", "name").sort({ receivedAt: 1 }),
    ]);
    const businessName = business?.businessName || "";
    const businessAddress = [business?.address, business?.city, business?.state, business?.pincode].filter(Boolean).join(", ");
    const paymentTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const rentalDays = Math.max(1, Math.ceil((new Date(booking.returnDate) - new Date(booking.pickupDate)) / (24 * 60 * 60 * 1000)));
    const invoiceFileName = `${invoice.invoiceNumber}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=" + invoiceFileName);

    const document = new PDFDocument({ size: "A4", margin: 48 });
    document.pipe(res);
    const pageWidth = document.page.width - document.page.margins.left - document.page.margins.right;
    const ensureSpace = (height) => {
      if (document.y + height > document.page.height - document.page.margins.bottom) document.addPage();
    };
    const addSection = (title) => {
      ensureSpace(34);
      document.moveDown(0.7);
      const top = document.y;
      document.fillColor("#0e7490").font("Helvetica-Bold").fontSize(11).text(title, document.page.margins.left, top, { width: pageWidth });
      document.y = top + 17;
      document.x = document.page.margins.left;
      document.fillColor("#1e293b").font("Helvetica").fontSize(10);
    };
    const addPair = (label, value) => {
      const left = document.page.margins.left;
      const labelWidth = 112;
      const valueWidth = pageWidth - labelWidth;
      const safeValue = value || "—";
      document.font("Helvetica").fontSize(9.5);
      const lineHeight = Math.max(13, document.heightOfString(safeValue, { width: valueWidth }));
      ensureSpace(lineHeight + 2);
      const top = document.y;
      document.font("Helvetica-Bold").fontSize(9.5).text(label, left, top, { width: labelWidth - 8 });
      document.font("Helvetica").fontSize(9.5).text(safeValue, left + labelWidth, top, { width: valueWidth });
      document.y = top + lineHeight + 2;
      document.x = left;
    };

    let logoBuffer;
    const logoUrlValue = typeof business?.logo === "string" ? business.logo : business?.logo?.url;
    if (logoUrlValue) {
      try {
        const logoUrl = new URL(logoUrlValue);
        if (logoUrl.protocol === "https:" && logoUrl.hostname === "res.cloudinary.com") {
          const response = await fetch(logoUrl, { signal: AbortSignal.timeout(5000) });
          if (response.ok && response.headers.get("content-type")?.startsWith("image/")) {
            logoBuffer = Buffer.from(await response.arrayBuffer());
          }
        }
      } catch (error) {
        // The business name and contact details still print when the logo is unavailable.
      }
    }

    const left = document.page.margins.left;
    const headerTop = document.y;
    if (logoBuffer) document.image(logoBuffer, left, headerTop, { fit: [76, 48] });
    const headerX = left + (logoBuffer ? 88 : 0);
    const headerWidth = pageWidth - (logoBuffer ? 88 : 0);
    let headerY = headerTop;
    if (businessName) {
      document.fillColor("#0f172a").font("Helvetica-Bold").fontSize(18).text(businessName, headerX, headerY, { width: headerWidth });
      headerY += 23;
    }
    document.font("Helvetica").fontSize(9).fillColor("#475569");
    for (const line of [businessAddress, [business?.phone, business?.email].filter(Boolean).join(" | "), business?.gstin && `GSTIN: ${business.gstin}`].filter(Boolean)) {
      document.text(line, headerX, headerY, { width: headerWidth });
      headerY += Math.max(12, document.heightOfString(line, { width: headerWidth }));
    }
    document.y = Math.max(headerY, headerTop + (logoBuffer ? 50 : 0)) + 7;
    document.x = left;
    document.moveTo(document.page.margins.left, document.y).lineTo(document.page.width - document.page.margins.right, document.y).strokeColor("#cbd5e1").stroke();
    document.moveDown(0.8);
    const titleY = document.y;
    document.fillColor("#0f172a").font("Helvetica-Bold").fontSize(18).text("RENTAL INVOICE", left, titleY, { width: pageWidth });
    document.y = titleY + 24;
    document.x = left;
    document.font("Helvetica").fontSize(9.5).fillColor("#475569");
    addPair("Invoice Number", invoice.invoiceNumber);
    addPair("Invoice Date", new Date(invoice.issuedAt).toLocaleDateString());
    addPair("Booking Reference", booking._id.toString());

    addSection("CUSTOMER");
    addPair("Name", invoice.customer.name);
    addPair("Email", invoice.customer.email);
    if (invoice.customer.mobile) addPair("Phone", invoice.customer.mobile);

    addSection("VEHICLE & RENTAL");
    addPair("Vehicle", `${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    addPair("Registration", vehicle.registrationNumber);
    addPair("Pickup", new Date(booking.pickupDate).toLocaleDateString());
    addPair("Return", new Date(booking.returnDate).toLocaleDateString());
    addPair("Total days", String(rentalDays));
    addPair("Daily rate", `INR ${booking.dailyRate.toFixed(2)}`);

    addSection("CHARGES");
    const tableTop = document.y;
    const descriptionX = document.page.margins.left + 6;
    const quantityX = document.page.margins.left + 174;
    const rateX = document.page.margins.left + 244;
    const amountX = document.page.width - document.page.margins.right - 125;
    document.fillColor("#f1f5f9").rect(document.page.margins.left, tableTop - 3, pageWidth, 22).fill();
    document.fillColor("#334155").font("Helvetica-Bold").fontSize(8)
      .text("DESCRIPTION", descriptionX, tableTop + 3, { width: 160 })
      .text("DAYS / QTY", quantityX, tableTop + 3, { width: 60, align: "right" })
      .text("RATE (INR)", rateX, tableTop + 3, { width: 100, align: "right" })
      .text("AMOUNT (INR)", amountX, tableTop + 3, { width: 118, align: "right" });
    document.y = tableTop + 28;
    document.font("Helvetica").fontSize(10).fillColor("#1e293b");
    const chargeY = document.y;
    document.text("Vehicle Rental", descriptionX, chargeY, { width: 160 });
    document.text(String(rentalDays), quantityX, chargeY, { width: 60, align: "right" });
    document.text(booking.dailyRate.toFixed(2), rateX, chargeY, { width: 100, align: "right" });
    document.text(booking.totalPrice.toFixed(2), amountX, chargeY, { width: 118, align: "right" });
    document.moveDown(1.6);
    document.moveTo(amountX, document.y).lineTo(document.page.width - document.page.margins.right, document.y).strokeColor("#94a3b8").stroke();
    document.moveDown(0.4);
    document.font("Helvetica").fontSize(10).text("Subtotal", amountX, document.y, { width: 80 });
    document.text(`INR ${booking.totalPrice.toFixed(2)}`, amountX + 80, document.y, { width: 170, align: "right" });
    document.moveDown(0.8);
    document.font("Helvetica-Bold").fontSize(13).text("TOTAL", amountX, document.y, { width: 80 });
    document.text(`INR ${booking.totalPrice.toFixed(2)}`, amountX + 80, document.y, { width: 170, align: "right" });

    addSection("PAYMENT");
    const paymentMethods = [...new Set(payments.map((payment) => payment.method.toUpperCase()))].join(", ");
    const latestPayment = payments[payments.length - 1];
    const references = [...new Set(payments.map((payment) => payment.transactionReference).filter(Boolean))].join(", ");
    addPair("Payment status", paymentTotal + 0.000001 >= booking.totalPrice ? "Paid" : paymentTotal > 0 ? "Partially paid" : "Unpaid");
    addPair("Payment method", paymentMethods || "No payment recorded");
    if (latestPayment) addPair("Payment date", new Date(latestPayment.receivedAt).toLocaleDateString());
    addPair("Amount paid", `INR ${paymentTotal.toFixed(2)}`);
    addPair("Outstanding balance", `INR ${Math.max(0, booking.totalPrice - paymentTotal).toFixed(2)}`);
    if (references) addPair("Transaction reference", references);
    document.moveDown(0.5);
    if (businessName) {
      document.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text(`Thank you for choosing ${businessName}.`, left, document.y, { width: pageWidth });
    } else {
      document.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text("Thank you for choosing us.", left, document.y, { width: pageWidth });
    }
    document.moveDown(0.3);
    document.font("Helvetica").fontSize(9).fillColor("#475569").text("Payments shown are records maintained by the rental business.", left, document.y, { width: pageWidth });
    document.end();
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: "Could not create invoice PDF.", errors: [] });
    }
    res.destroy(error);
  }
}

module.exports = { getInvoices, createInvoice, getInvoiceById, downloadInvoicePdf };
