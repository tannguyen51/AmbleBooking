const Booking = require("../models/booking");
const Table = require("../models/table");
const Restaurant = require("../models/restaurant");
const paymentConfig = require("../config/paymentConfig");
const AnalyticsEvent = require('../models/analyticsEvent');

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

    // Lấy danh sách booking đang active (pending/confirmed/occupied)
    const activeBookings = await Booking.find({
      restaurantId: req.params.restaurantId,
      status: { $in: ["pending", "confirmed", "occupied"] },
    })
      .select("tableId")
      .lean();

    const bookedTableIds = new Set(
      activeBookings.map((b) => b.tableId?.toString()).filter(Boolean)
    );

    // Đánh dấu bàn đang có booking active là không available
    const updatedTables = tables.map((t) => ({
      ...t,
      isAvailable: t.isAvailable && !bookedTableIds.has(t._id.toString()),
    }));

    return res.json({ success: true, tables: updatedTables });
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

    const isPaid = booking.payment?.status === "paid";
    const depositAmount = booking.pricing?.depositAmount || 0;

    return res.json({
      success: true,
      preview: {
        isPaid,
        refundAmount: isPaid ? depositAmount : 0,
        refundPercent: isPaid ? 100 : 0,
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
    const userId = req.user?.id || req.body.userId;
    const {
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

    // Kiểm tra ngày mở cửa (U1)
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayOfWeek = dayNames[new Date(date + 'T' + normalizedTime).getDay()];
    if (restaurant.openDays && restaurant.openDays.length > 0 && !restaurant.openDays.includes(dayOfWeek)) {
      return res.status(400).json({
        success: false,
        message: `Nhà hàng không mở cửa ngày này. Ngày hoạt động: ${restaurant.openDays.join(', ')}`,
      });
    }

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

    // ── Atomic lock bàn (R1 fix) ──
    // Lock ngay lập tức cho mọi phương thức thanh toán
    const locked = await Table.findOneAndUpdate(
      { _id: tableId, status: 'available' },
      { status: 'reserved', isAvailable: false, currentBookingId: null },
      { new: false }
    );
    if (!locked) {
      return res.status(409).json({
        success: false,
        message: "Bàn này vừa được người khác đặt. Vui lòng chọn bàn khác.",
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

    // Cập nhật currentBookingId
    await Table.findByIdAndUpdate(tableId, {
      currentBookingId: booking._id,
    });

      try {
        await AnalyticsEvent.create({
          restaurantId,
          event: 'booking_start',
          userId,
          metadata: { bookingId: booking._id, partySize, tableId, paymentMethod },
        });
      } catch (_) {}

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

    // Atomic lock bàn khi xác nhận (T3 fix)
    const locked = await Table.findOneAndUpdate(
      { _id: booking.tableId, status: { $in: ['available', 'reserved'] } },
      { status: 'reserved', isAvailable: false, currentBookingId: booking._id },
      { new: false }
    );
    if (!locked) {
      // Rollback booking status nếu không lock được bàn
      booking.status = "pending";
      await booking.save();
      return res.status(409).json({
        success: false,
        message: "Bàn không còn trống, không thể xác nhận.",
      });
    }

      try {
        await AnalyticsEvent.create({
          restaurantId: booking.restaurantId,
          event: 'booking_confirm',
          userId: booking.userId,
          metadata: { bookingId: booking._id },
        });
      } catch (_) {}

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
    // Verify token matches requested user
    if (req.user && req.params.userId !== req.user.id && req.user.id !== req.params.userId) {
      return res.status(403).json({ success: false, message: "Không có quyền xem dữ liệu này" });
    }
    const bookings = await Booking.find({ userId: req.params.userId, hiddenByUser: { $ne: true } })
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

// ── GET /api/booking/notifications/:userId ─────────────────────
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const today = now.toISOString().slice(0, 10);
    const upcoming = await Booking.find({ userId, status: 'confirmed', 'bookingDetails.date': today }).populate('restaurantId', 'name images').lean();
    const upcomingSoon = upcoming.filter(b => {
      if (!b.bookingDetails?.time) return false;
      const bt = new Date(today + 'T' + b.bookingDetails.time);
      return bt > now && bt <= inOneHour;
    });
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentlyConfirmed = await Booking.find({ userId, status: { $in: ['confirmed', 'occupied', 'completed'] }, confirmedAt: { $gte: yesterday } }).populate('restaurantId', 'name images').lean();
    const notifications = [];
    upcomingSoon.forEach(b => { notifications.push({ id: 'upcoming_' + b._id, type: 'upcoming', title: 'Sắp đến giờ đặt bàn', subtitle: (b.restaurantId?.name || 'Nhà hàng') + ' • ' + (b.bookingDetails?.time || ''), bookingId: b._id, read: false, createdAt: b.bookingDetails?.date + 'T' + b.bookingDetails?.time }); });
    recentlyConfirmed.forEach(b => { notifications.push({ id: 'confirmed_' + b._id, type: 'confirmed', title: 'Đơn đặt bàn đã được xác nhận', subtitle: (b.restaurantId?.name || 'Nhà hàng') + ' • ' + (b.bookingDetails?.date || '') + ' ' + (b.bookingDetails?.time || ''), bookingId: b._id, read: false, createdAt: b.confirmedAt }); });
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({ success: true, notifications, unread: notifications.length });
  } catch (err) {
    console.error('[getUserNotifications]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
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
    const { reason, refundAccount } = req.body;
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });

    if (["cancelled", "completed", "occupied", "declined", "no_show"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể hủy booking ở trạng thái: ${booking.status}`,
      });
    }

    if (booking.payment?.status === "paid") {
      booking.payment.status = "refund_pending";
      booking.refund = {
        ...(booking.refund || {}),
        requestedAt: new Date(),
        bankName: String(refundAccount?.bankName || "").trim(),
        accountNumber: String(refundAccount?.accountNumber || "").trim(),
        accountName: String(refundAccount?.accountName || "").trim(),
      };
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

      try {
        await AnalyticsEvent.create({
          restaurantId: booking.restaurantId,
          event: 'booking_cancel',
          userId: booking.userId,
          metadata: { bookingId: booking._id, reason: booking.cancellationReason },
        });
      } catch (_) {}

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

// DELETE /api/booking/:bookingId
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking không tồn tại" });
    }

    // Cấm xóa đơn đang active
    if (["pending", "confirmed", "occupied"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa đơn đang hoạt động. Vui lòng hủy trước.",
      });
    }

    // Đơn completed → soft delete (ẩn khỏi lịch sử, giữ lại cho doanh thu)
    if (booking.status === "completed") {
      booking.hiddenByUser = true;
      await booking.save();
      return res.json({ success: true, message: "Đã ẩn đơn khỏi lịch sử" });
    }

    // Đơn cancelled/declined/no_show → xóa cứng + giải phóng bàn
    if (booking.tableId) {
      await Table.findByIdAndUpdate(booking.tableId, {
        isAvailable: true,
        currentBookingId: null,
        status: "available",
      });
    }

    await Booking.findByIdAndDelete(req.params.bookingId);
    return res.json({ success: true, message: "Đã xóa đơn" });
  } catch (err) {
    console.error("[deleteBooking]", err);
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

    if (['cancelled', 'completed', 'occupied', 'no_show', 'declined'].includes(booking.status)) {
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

      if (reason === 'no_show') {
        try {
          await AnalyticsEvent.create({
            restaurantId: booking.restaurantId,
            event: 'no_show',
            userId: booking.userId,
            metadata: { bookingId: booking._id },
          });
        } catch (_) {}
      }

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

      try {
        await AnalyticsEvent.create({
          restaurantId: booking.restaurantId,
          event: 'checkin',
          userId: booking.userId,
          metadata: { bookingId: booking._id },
        });
      } catch (_) {}

    return res.json({ success: true, message: 'Khách đã check-in' });
  } catch (err) {
    console.error('[checkInBooking]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── POST /api/booking/:bookingId/decline ──────────────
exports.declineBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking)
      return res.status(404).json({ success: false, message: "Booking không tồn tại" });

    if (!["pending"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể từ chối booking ở trạng thái: ${booking.status}`,
      });
    }

    booking.status = "declined";
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || "Nhà hàng từ chối";
    await booking.save();

    // Release bàn nếu đã lock (non-PayOS bookings lock table khi tạo)
    await Table.findByIdAndUpdate(booking.tableId, {
      status: "available",
      isAvailable: true,
      currentBookingId: null,
    });

    return res.json({ success: true, message: "Đã từ chối booking", booking });
  } catch (err) {
    console.error("[declineBooking]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
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
    booking.completedAt = new Date();
    await booking.save();

    // Cập nhật trạng thái bàn → available
    await Table.findByIdAndUpdate(booking.tableId, {
      status: 'available',
      isAvailable: true,
      currentBookingId: null,
    });

      try {
        await AnalyticsEvent.create({
          restaurantId: booking.restaurantId,
          event: 'complete',
          userId: booking.userId,
          metadata: { bookingId: booking._id },
        });
      } catch (_) {}

    return res.json({ success: true, message: 'Đã hoàn thành booking' });
  } catch (err) {
    console.error('[completeBooking]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};