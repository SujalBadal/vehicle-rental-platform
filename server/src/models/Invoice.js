const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    issuedAt: { type: Date, default: Date.now, required: true },
    pdfUrl: { type: String, trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Invoice", invoiceSchema);
