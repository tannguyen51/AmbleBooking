const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },
    bookingDetails: {
      date: { type: String, required: true },
      time: { type: String, required: true },
      partySize: { type: Number, required: true },
      purpose: { type: String, default: "casual" },
      specialRequests: { type: String, default: "" },
    },
    pricing: {
      depositAmount: { type: Number, required: true },
      voucherDiscount: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
      appliedVoucher: {
        code: String,
        discountValue: Number,
      },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "occupied",
        "completed",
        "cancelled",
        "declined",
        "no_show",
      ],
      default: "pending",
    },
    payment: {
      status: {
        type: String,
        enum: ["unpaid", "paid", "refund_pending", "refunded"],
        default: "unpaid",
      },
      transactionId: String,
      method: {
        type: String,
        enum: ["momo", "bank", "credit", "apple", "payos", "cash"],
      },
      paidAt: Date,
      expectedContent: String,
      qrUrl: String,
      bankCode: String,
      accountNumber: String,
      amount: Number,
      payosOrderCode: Number,
      payosPaymentLinkId: String,
      payosStatus: String,
    },
    // Nguồn đặt
    source: {
      type: String,
      enum: ['app', 'walkin', 'phone', 'facebook', 'google', 'zalo', 'payos', 'bank', 'other'],
      default: 'app',
    },
    // Thông tin khách (cho walk-in)
    customerInfo: {
      name:  { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    // Refund
    refund: {
      refundPercent: { type: Number, default: 0 },
      refundAmount: { type: Number, default: 0 },
      requestedAt: Date,
      refundedAt: Date,
      bankName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      accountName: { type: String, default: "" },
    },
    confirmedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    walkedInAt: Date,
    completedAt: Date,
    hiddenByUser: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Generate booking number
bookingSchema.pre("save", async function (next) {
  if (!this.bookingNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.bookingNumber = `BK-${dateStr}-${random}`;
  }
  next();
});

module.exports = mongoose.model("Booking", bookingSchema);
