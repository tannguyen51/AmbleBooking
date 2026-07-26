const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percent", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    minBill: {
      type: Number,
      default: 0,
    },
    maxUses: {
      type: Number,
      default: null,
    },
    currentUses: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxPerUser: {
      type: Number,
      default: null,
    },
    usedBy: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Voucher", voucherSchema);
