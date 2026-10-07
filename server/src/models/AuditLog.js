const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    targetType: { type: String, trim: true, maxlength: 80 },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    summary: { type: String, required: true, trim: true, maxlength: 1000 },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
