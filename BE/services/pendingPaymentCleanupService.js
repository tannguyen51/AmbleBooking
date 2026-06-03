const Booking = require("../models/booking");
const Table = require("../models/table");

// Timeout cho pending_payment: 10 phút (thay vì 30 phút)
const PENDING_PAYMENT_TIMEOUT_MS = 10 * 60 * 1000;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Kiểm tra mỗi 5 phút

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

const cleanupPendingPaymentBookings = async () => {
  try {
    const now = new Date();
    const timeoutThreshold = new Date(now.getTime() - PENDING_PAYMENT_TIMEOUT_MS);

    // Tìm booking pending_payment quá lâu (> 10 phút)
    const expiredBookings = await Booking.find({
      status: "pending_payment",
      createdAt: { $lt: timeoutThreshold },
    }).lean();

    if (expiredBookings.length === 0) {
      return { cancelled: 0 };
    }

    console.log(`[booking:pending-payment-cleanup] Found ${expiredBookings.length} expired pending_payment booking(s)`);

    const ids = expiredBookings.map((b) => b._id);
    
    // Cập nhật booking thành cancelled
    await Booking.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancellationReason: "Hết thời gian thanh toán (10 phút) - hệ thống tự động hủy",
        },
      }
    );

    // Giải phóng bàn
    const tableIds = expiredBookings.map((b) => b.tableId).filter(Boolean);
    if (tableIds.length) {
      await Table.updateMany(
        { _id: { $in: tableIds } },
        { $set: { isAvailable: true, currentBookingId: null, status: 'available' } }
      );
    }

    console.log(`[booking:pending-payment-cleanup] Cancelled ${ids.length} booking(s) and freed ${tableIds.length} table(s)`);

    return { cancelled: ids.length };
  } catch (error) {
    console.error("[booking:pending-payment-cleanup] Error:", error.message);
    return { cancelled: 0, error: error.message };
  }
};

let timer = null;

const startPendingPaymentCleanupJob = () => {
  if (timer) return;

  // Chạy lần đầu ngay
  cleanupPendingPaymentBookings()
    .then(({ cancelled }) => {
      if (cancelled > 0) {
        console.log(`[booking:pending-payment-cleanup] Initial run cancelled ${cancelled} booking(s).`);
      }
    })
    .catch((error) => {
      console.error("[booking:pending-payment-cleanup] Initial run error:", error.message);
    });

  // Chạy định kỳ
  timer = setInterval(async () => {
    try {
      const { cancelled } = await cleanupPendingPaymentBookings();
      if (cancelled > 0) {
        console.log(`[booking:pending-payment-cleanup] Periodic run cancelled ${cancelled} booking(s).`);
      }
    } catch (error) {
      console.error("[booking:pending-payment-cleanup] Periodic run error:", error.message);
    }
  }, CHECK_INTERVAL_MS);
};

const stopPendingPaymentCleanupJob = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("[booking:pending-payment-cleanup] Job stopped.");
  }
};

module.exports = {
  cleanupPendingPaymentBookings,
  startPendingPaymentCleanupJob,
  stopPendingPaymentCleanupJob,
};
