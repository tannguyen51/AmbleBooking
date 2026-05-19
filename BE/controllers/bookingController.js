const Booking = require("../models/booking");
const Table = require("../models/table");
const Restaurant = require("../models/restaurant");
const paymentConfig = require("../config/paymentConfig");

const buildVietQrImageUrl = (amount, content) => {
  if (!paymentConfig.accountNumber || !paymentConfig.accountName) return null;
  const addInfo = encodeURIComponent(content || "");
  const accountName = encodeURIComponent(paymentConfig.accountName);
  return `${paymentConfig.imageBase}/${paymentConfig.bankCode}-${paymentConfig.accountNumber}-${paymentConfig.template}.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
};

const generateTransferContent = (bookingRef) => {
  const randomCode = Math.floor(100000 + Math.random() * 900000);
  return `${paymentConfig.contentPrefix}-${bookingRef}-${randomCode}`;
};

const BOOKING_VOUCHERS = [
  { code: "AMBLE10", discount: 10, minBill: 50000, isPercent: true },
  { code: "GENZ2025", discount: 20000, minBill: 100000, isPercent: false },
  { code: "VIP50", discount: 50000, minBill: 200000, isPercent: false },
];

// ── GET /api/booking/vouchers ────────────────────────────
exports.getBookingVouchers = async (req, res) => {
  return res.json({ success: true, vouchers: BOOKING_VOUCHERS });
};

// ── GET /api/booking/tables/:restaurantId ─────────────────
exports.getTablesByRestaurant = async (req, res) => {
  try {
    const tables = await Table.find({
      restaurantId: req.params.restaurantId,
      isActive: true,
    }).lean();
    return res.json({ success: true, tables });
  } catch (err) {
    console.error("[getTablesByRestaurant]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── POST /api/booking/create ──────────────────────────────
exports.createBooking = async (req, res) => {
  try {
    const {
      userId,
      restaurantId,
      tableId,
      date,
      time,
      partySize,
      purpose,
      specialRequests,
      paymentMethod,
      voucherCode,
      voucherDiscount,
    } = req.body;

    if (!userId || !restaurantId || !tableId || !date || !time || !partySize) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant)
      return res
        .status(404)
        .json({ success: false, message: "Nhà hàng không tồn tại" });

    const table = await Table.findById(tableId);
    if (!table)
      return res
        .status(404)
        .json({ success: false, message: "Bàn không tồn tại" });

    if (!table.isAvailable) {
      return res
        .status(400)
        .json({ success: false, message: "Bàn này đã được đặt" });
    }

    if (partySize < table.capacity.min || partySize > table.capacity.max) {
      return res.status(400).json({
        success: false,
        message: `Bàn phù hợp cho ${table.capacity.min}–${table.capacity.max} người`,
      });
    }

    const depositAmount = table.pricing.baseDeposit;
    const discount = voucherDiscount || 0;
    const totalAmount = Math.max(0, depositAmount - discount);

    // ── Generate bookingNumber tại đây để tránh lỗi validation ──
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `BK-${dateStr}-${random}`;

    const booking = await Booking.create({
      bookingNumber,
      userId,
      restaurantId,
      tableId,
      bookingDetails: {
        date,
        time,
        partySize,
        purpose: purpose || "casual",
        specialRequests: specialRequests || "",
      },
      pricing: {
        depositAmount,
        voucherDiscount: discount,
        totalAmount,
        appliedVoucher: voucherCode
          ? { code: voucherCode, discountValue: discount }
          : undefined,
      },
      payment: paymentMethod ? { method: paymentMethod } : undefined,
      status: paymentMethod === "bank" ? "pending_payment" : "pending",
    });

    if (paymentMethod === "bank") {
      const bookingRef = booking.bookingNumber || booking._id.toString();
      const expectedContent = generateTransferContent(bookingRef);
      const qrUrl = buildVietQrImageUrl(totalAmount, expectedContent);
      booking.payment = {
        ...(booking.payment || {}),
        method: "bank",
        expectedContent,
        qrUrl,
        bankCode: paymentConfig.bankCode,
        accountNumber: paymentConfig.accountNumber,
        amount: totalAmount,
      };
      booking.status = "pending_payment";
      await booking.save();
    }

    // Cập nhật trạng thái bàn → đã đặt
    await Table.findByIdAndUpdate(tableId, {
      isAvailable: false,
      currentBookingId: booking._id,
    });

    return res.json({
      success: true,
      booking,
      message: "Yeu cau dat ban da duoc gui cho nha hang",
    });
  } catch (err) {
    console.error("[createBooking]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── PUT /api/booking/:bookingId/confirm ───────────────────
exports.confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });

    booking.status = "confirmed";
    booking.confirmedAt = new Date();
    await booking.save();

    return res.json({ success: true, booking });
  } catch (err) {
    console.error("[confirmBooking]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── POST /api/booking/:bookingId/payment ──────────────────
exports.processPayment = async (req, res) => {
  try {
    const { method } = req.body;
    const VALID = ["momo", "zalopay", "bank", "credit"];
    if (!method || !VALID.includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Phương thức thanh toán không hợp lệ",
      });
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });
    if (booking.status === "paid")
      return res
        .status(400)
        .json({ success: false, message: "Booking đã được thanh toán" });

    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    booking.status = "paid";
    booking.payment = { transactionId, method, paidAt: new Date() };
    await booking.save();

    return res.json({ success: true, booking, transactionId });
  } catch (err) {
    console.error("[processPayment]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── GET /api/booking/:bookingId/payment/qr ───────────────
exports.getPaymentQr = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });

    if (booking.status === "paid") {
      return res
        .status(400)
        .json({ success: false, message: "Booking đã được thanh toán" });
    }

    if (booking.payment?.method && booking.payment.method !== "bank") {
      return res.status(400).json({
        success: false,
        message: "Booking không sử dụng thanh toán chuyển khoản",
      });
    }

    const bookingRef = booking.bookingNumber || booking._id.toString();
    const expectedContent =
      booking.payment?.expectedContent || generateTransferContent(bookingRef);
    const amount = booking.pricing?.totalAmount || 0;
    const qrUrl = buildVietQrImageUrl(amount, expectedContent);

    booking.payment = {
      ...(booking.payment || {}),
      method: "bank",
      expectedContent,
      qrUrl,
      bankCode: paymentConfig.bankCode,
      accountNumber: paymentConfig.accountNumber,
      amount,
    };
    if (booking.status !== "pending_payment") {
      booking.status = "pending_payment";
    }
    await booking.save();

    return res.json({
      success: true,
      qr: {
        imageUrl: qrUrl,
        amount,
        content: expectedContent,
        bankCode: paymentConfig.bankCode,
        accountNumber: paymentConfig.accountNumber,
        accountName: paymentConfig.accountName,
      },
    });
  } catch (err) {
    console.error("[getPaymentQr]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── POST /api/booking/payment/vietqr-webhook ─────────────
exports.vietqrWebhook = async (req, res) => {
  try {
    const payload = req.body?.data || req.body || {};
    const content = payload.content || payload.addInfo || payload.description;
    const amount = Number(payload.amount || 0);
    const transactionId = payload.transactionId || payload.refId;
    const bankCode = payload.bankCode || paymentConfig.bankCode;
    const accountNumber =
      payload.accountNumber || paymentConfig.accountNumber || "";
    const paidAt = payload.paidAt || payload.transactionTime;

    if (!content) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu nội dung chuyển khoản" });
    }

    const booking = await Booking.findOne({
      "payment.expectedContent": content,
    });

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }

    if (booking.status === "paid") {
      return res.json({ success: true, bookingId: booking._id });
    }

    if (accountNumber && accountNumber !== paymentConfig.accountNumber) {
      return res.status(400).json({
        success: false,
        message: "Thông tin tài khoản không khớp",
      });
    }

    if (amount < (booking.pricing?.totalAmount || 0)) {
      return res
        .status(400)
        .json({ success: false, message: "Số tiền không đủ" });
    }

    booking.status = "paid";
    booking.payment = {
      ...(booking.payment || {}),
      method: "bank",
      transactionId: transactionId || `VQR-${Date.now()}`,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      bankCode,
      accountNumber,
      amount: amount || booking.pricing?.totalAmount || 0,
    };
    await booking.save();

    return res.json({ success: true, bookingId: booking._id });
  } catch (err) {
    console.error("[vietqrWebhook]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── GET /api/booking/user/:userId ─────────────────────────
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId })
      .populate("restaurantId", "name images city address")
      .populate("tableId", "name type images")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, bookings });
  } catch (err) {
    console.error("[getUserBookings]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── GET /api/booking/:bookingId ───────────────────────────
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate("restaurantId")
      .populate("tableId")
      .populate("userId", "fullName email phone")
      .lean();

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });

    return res.json({ success: true, booking });
  } catch (err) {
    console.error("[getBookingById]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── DELETE /api/booking/:bookingId/cancel ─────────────────
exports.cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });

    if (["cancelled", "completed"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể hủy booking ở trạng thái: ${booking.status}`,
      });
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || "Người dùng hủy";
    await booking.save();

    // Giải phóng bàn → trống lại
    await Table.findByIdAndUpdate(booking.tableId, {
      isAvailable: true,
      currentBookingId: null,
    });

    return res.json({
      success: true,
      booking,
      message: "Hủy booking thành công",
    });
  } catch (err) {
    console.error("[cancelBooking]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
