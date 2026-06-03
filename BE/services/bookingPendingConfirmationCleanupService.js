const Booking = require("../models/booking");
const Table = require("../models/table");

const PENDING_STATUS = "pending";
const PENDING_TIMEOUT_MS = 60 * 60 * 1000; // 60 phút
const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 phút

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

const runPendingConfirmationCleanup = async () => {
  const now = new Date();

  // Tìm tất cả booking pending (chờ nhà hàng xác nhận)
  const candidates = await Booking.find({
    status: PENDING_STATUS,
  }).lean();

  // Lọc: (1) quá ngày đặt hoặc (2) quá 60 phút kể từ khi tạo
  const overdue = candidates.filter((booking) => {
    const dateTime = parseBookingDateTime(
      booking?.bookingDetails?.date,
      booking?.bookingDetails?.time,
    );
    if (dateTime && dateTime.getTime() < now.getTime()) return true;
    const createdAt = booking.createdAt ? new Date(booking.createdAt).getTime() : 0;
    return now.getTime() - createdAt > PENDING_TIMEOUT_MS;
  });

  if (!overdue.length) return { updated: 0 };

  const ids = overdue.map((b) => b._id);
  
  // Cập nhật booking: status = cancelled, cancellationReason = "Nhà hàng không xác nhận trong thời hạn"
  await Booking.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        status: "cancelled",
        cancelledAt: now,
        cancellationReason: "Nhà hàng không xác nhận trong thời hạn - hệ thống tự động hủy",
      },
    },
  );

  // Giải phóng bàn: isAvailable = true, currentBookingId = null
  const tableIds = overdue.map((b) => b.tableId).filter(Boolean);
  if (tableIds.length) {
    await Table.updateMany(
      { _id: { $in: tableIds } },
      { $set: { isAvailable: true, currentBookingId: null, status: 'available' } },
    );
  }

  console.log(`[booking:pending-confirmation-cleanup] Cancelled ${ids.length} overdue pending booking(s) and freed ${tableIds.length} table(s)`);

  return { updated: ids.length };
};

let timer = null;
const startPendingConfirmationCleanupJob = () => {
  if (timer) return;

  runPendingConfirmationCleanup()
    .then(({ updated }) => {
      if (updated > 0) {
        console.log(`[booking:pending-confirmation-cleanup] Initial run cancelled ${updated} overdue pending booking(s).`);
      }
    })
    .catch((error) => {
      console.error("[booking:pending-confirmation-cleanup] Initial run error:", error.message);
    });

  timer = setInterval(async () => {
    try {
      const { updated } = await runPendingConfirmationCleanup();
      if (updated > 0) {
        console.log(`[booking:pending-confirmation-cleanup] Cancelled ${updated} overdue pending booking(s).`);
      }
    } catch (error) {
      console.error("[booking:pending-confirmation-cleanup] Interval error:", error.message);
    }
  }, CHECK_INTERVAL_MS);
};

module.exports = {
  parseBookingDateTime,
  runPendingConfirmationCleanup,
  startPendingConfirmationCleanupJob,
};
