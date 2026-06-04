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
  const cleanRef = String(bookingRef).replace(/[^0-9A-Za-z]/g, "");
  const shortRef = cleanRef.slice(-2).toUpperCase();
  const randomCode = Math.floor(100 + Math.random() * 900);
  return `${paymentConfig.contentPrefix}-${shortRef}${randomCode}`;
};

const BOOKING_VOUCHERS = [
  { code: "AMBLE10", discount: 10, minBill: 50000, isPercent: true },
  { code: "GENZ2025", discount: 20000, minBill: 100000, isPercent: false },
  { code: "VIP50", discount: 50000, minBill: 200000, isPercent: false },
];

const parseBookingDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const iso = `${dateStr}T${timeStr}:00`;
  const parsed = new Date(iso);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const [y, m, d] = String(dateStr).split("-").map(Number);
  const [hh, mm] = String(timeStr).split(":").map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return new Date(y, m - 1, d, hh, mm, 0, 0);
};

const computeRefund = (booking) => {
  const bookingDate = parseBookingDateTime(
    booking?.bookingDetails?.date,
    booking?.bookingDetails?.time,
  );
  if (!bookingDate) {
    return {
      hoursRemaining: 0,
      refundPercent: 0,
      refundAmount: 0,
    };
  }

  const now = new Date();
  const diffMs = bookingDate.getTime() - now.getTime();
  const hoursRemaining = Math.max(0, diffMs / (1000 * 60 * 60));
  const refundPercent = hoursRemaining >= 24 ? 100 : hoursRemaining >= 12 ? 50 : 0;
  const depositAmount = Math.max(0, Number(booking?.pricing?.depositAmount || 0));
  const refundAmount = Math.max(0, Math.round((depositAmount * refundPercent) / 100));

  return { hoursRemaining, refundPercent, refundAmount };
};

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

// ── GET /api/booking/:bookingId/refund-preview ───────────
exports.getRefundPreview = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).lean();
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });
    }

    const { hoursRemaining, refundPercent, refundAmount } = computeRefund(booking);

    return res.json({
      success: true,
      preview: {
        hoursRemaining,
        refundPercent,
        refundAmount,
      },
    });
  } catch (err) {
    console.error("[getRefundPreview]", err);
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

    // Chuẩn hóa time về HH:MM để so sánh string an toàn
    const normalizedTime = time?.padStart(5, '0').slice(0, 5) || time;

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

    // ── Kiểm tra thời gian hợp lệ ──
    const hour = parseInt(normalizedTime.split(':')[0], 10);
    const isLunchTime = hour >= 11 && hour < 15;
    const isDinnerTime = hour >= 17 && hour < 23;
    if (!isLunchTime && !isDinnerTime) {
      return res.status(400).json({
        success: false,
        message: 'Giờ đặt không nằm trong khung hoạt động (11:00-14:59 hoặc 17:00-22:59)',
      });
    }

    // ── Kiểm tra trùng lặp thời gian ──
    const existingBooking = await Booking.findOne({
      tableId,
      'bookingDetails.date': date,
      'bookingDetails.time': normalizedTime,
      status: { $in: ['pending', 'confirmed', 'occupied'] }
    });
    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: `Bàn này đã được đặt lúc ${normalizedTime}. Vui lòng chọn giờ khác.`
      });
    }

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
      payment: {
        method: paymentMethod || 'app',
        status: 'unpaid',
      },
      status: "pending",
      source: paymentMethod || 'app',
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
        status: 'unpaid',
      };
      await booking.save();
    }

    // Cập nhật trạng thái bàn → đã đặt (chỉ với các phương thức đã xác nhận)
    // PayOS: không lock bàn, chỉ lock khi thanh toán thành công
    if (paymentMethod !== "payos") {
      await Table.findByIdAndUpdate(tableId, {
        isAvailable: false,
        currentBookingId: booking._id,
        status: 'reserved',
      });
    }

    return res.json({
      success: true,
      booking,
      message: "Yêu cầu đặt bàn đã được gửi cho nhà hàng",
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

    if (!['pending'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể xác nhận booking ở trạng thái: ${booking.status}`,
      });
    }

    booking.status = "confirmed";
    booking.confirmedAt = new Date();
    await booking.save();

    // Lock bàn khi partner xác nhận booking
    await Table.findByIdAndUpdate(booking.tableId, {
      isAvailable: false,
      currentBookingId: booking._id,
      status: 'reserved',
    });

    return res.json({ success: true, booking });
  } catch (err) {
    console.error("[confirmBooking]", err);
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

    if (booking.payment?.status === "paid") {
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

    if (booking.payment?.status === "paid") {
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

    booking.payment = {
      ...(booking.payment || {}),
      status: "paid",
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

    bookings.forEach(attachPaymentTimer);

    return res.json({ success: true, bookings });
  } catch (err) {
    console.error("[getUserBookings]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── GET /api/booking/:bookingId ───────────────────────────
const PAYMENT_TIMEOUT_MS = 10 * 60 * 1000; // 10 phút

const attachPaymentTimer = (booking) => {
  if (!booking || booking.payment?.status !== 'unpaid') return;
  const createdAt = booking.createdAt;
  if (!createdAt) return;
  const expiresAt = new Date(new Date(createdAt).getTime() + PAYMENT_TIMEOUT_MS);
  const now = new Date();
  const timeRemainingMs = Math.max(0, expiresAt.getTime() - now.getTime());
  booking.paymentTimeRemainingSeconds = Math.floor(timeRemainingMs / 1000);
  booking.paymentExpiresAt = expiresAt.toISOString();
};

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

    attachPaymentTimer(booking);

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

    if (["cancelled", "completed", "occupied"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể hủy booking ở trạng thái: ${booking.status}`,
      });
    }

    if (booking.payment?.status === "paid") {
      booking.payment.status = "refund_pending";
    }
    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || "Người dùng hủy";
    await booking.save();

    // Giải phóng bàn → trống lại
    await Table.findByIdAndUpdate(booking.tableId, {
      isAvailable: true,
      currentBookingId: null,
      status: 'available',
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

// ── Helper: cập nhật trạng thái bàn khi release ─────────
const updateTableForRelease = async (tableId, nextStatus) => {
  const update = {
    isAvailable: nextStatus === 'available',
    currentBookingId: null,
    status: nextStatus,
  };
  return Table.findByIdAndUpdate(tableId, update);
};

// ── POST /api/booking/:bookingId/release ────────────────
// Chỉ Owner & Manager mới có quyền (check ở route layer)
exports.releaseBooking = async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking không tồn tại' });
    }

    if (['cancelled', 'completed', 'no_show'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể release booking ở trạng thái: ${booking.status}`,
      });
    }

    const newBookingStatus = reason === 'no_show' ? 'no_show' : 'cancelled';
    booking.status = newBookingStatus;
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || 'Released by staff';
    await booking.save();

    // Giải phóng bàn
    await updateTableForRelease(booking.tableId, 'available');

    return res.json({
      success: true,
      booking,
      message: 'Đã giải phóng bàn thành công',
    });
  } catch (err) {
    console.error('[releaseBooking]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── POST /api/booking/:bookingId/check-in ───────────────
exports.checkInBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking không tồn tại' });
    }

    if (!['confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể check-in booking ở trạng thái: ${booking.status}`,
      });
    }

    booking.status = 'occupied';
    await booking.save();

    // Cập nhật trạng thái bàn → occupied
    await Table.findByIdAndUpdate(booking.tableId, {
      isAvailable: false,
      status: 'occupied',
    });

    return res.json({ success: true, message: 'Khách đã check-in' });
  } catch (err) {
    console.error('[checkInBooking]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── POST /api/booking/:bookingId/complete ──────────────
exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking không tồn tại' });
    }

    if (!['occupied'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Booking chưa check-in, không thể hoàn thành',
      });
    }

    booking.status = 'completed';
    booking.completedAt = Date.now();
    await booking.save();

    // Cập nhật trạng thái bàn → available
    await Table.findByIdAndUpdate(booking.tableId, {
      status: 'available',
      isAvailable: true,
      currentBookingId: null,
    });

    return res.json({ success: true, message: 'Đã hoàn thành booking' });
  } catch (err) {
    console.error('[completeBooking]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── PUT /api/booking/table/:tableId/cleaning-done ───────
exports.setCleaningDone = async (req, res) => {
  try {
    const table = await Table.findById(req.params.tableId);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Bàn không tồn tại' });
    }

    table.status = 'available';
    table.isAvailable = true;
    table.currentBookingId = null;
    await table.save();

    return res.json({ success: true, message: 'Bàn đã sẵn sàng' });
  } catch (err) {
    console.error('[setCleaningDone]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};