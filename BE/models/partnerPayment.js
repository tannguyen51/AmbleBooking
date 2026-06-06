const mongoose = require("mongoose");

const partnerPaymentSchema = new mongoose.Schema({
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Partner",
    required: true,
  },
  subscriptionPackage: {
    type: String,
    enum: ["pro", "premium"],
    required: true,
  },
  amount: { type: Number, required: true },
  paymentType: {
    type: String,
    enum: ["initial", "upgrade"],
    default: "initial",
  },
  status: {
    type: String,
    enum: ["pending", "paid", "cancelled", "expired"],
    default: "pending",
  },
  payosOrderCode: { type: Number },
  payosPaymentLinkId: { type: String },
  payosStatus: { type: String },
  paidAt: { type: Date },
  expiryDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("PartnerPayment", partnerPaymentSchema);
