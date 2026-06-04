/**
 * Booking Cleanup Service
 *
 * Xóa/cancel các booking pending quá hạn (không thanh toán, không xác nhận)
 * Chạy mỗi 15 phút
 */

const Booking = require('../models/booking');
const Table = require('../models/table');

const PENDING_TIMEOUT_MS = 60 * 60 * 1000; // 60 phút
const CHECK_INTERVAL_MS = 15 * 60 * 1000;   // 15 phút

async function cleanupStaleBookings() {
  const cutoff = new Date(Date.now() - PENDING_TIMEOUT_MS);

  // Cancel pending bookings > 60 min (không lock bàn nên không cần release)
  const staleBookings = await Booking.find({
    status: 'pending',
    createdAt: { $lt: cutoff },
  }).lean();

  if (staleBookings.length === 0) return { cancelled: 0 };

  const ids = staleBookings.map(b => b._id);
  await Booking.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: 'Tự động hủy do quá hạn thanh toán',
      },
    }
  );

  console.log(`[booking:cleanup] Cancelled ${ids.length} stale pending bookings`);
  return { cancelled: ids.length };
}

function startBookingCleanupJob() {
  // Initial run
  cleanupStaleBookings().catch(err => {
    console.error('[booking:cleanup] Initial error:', err.message);
  });

  setInterval(async () => {
    try {
      await cleanupStaleBookings();
    } catch (err) {
      console.error('[booking:cleanup] Interval error:', err.message);
    }
  }, CHECK_INTERVAL_MS);

  console.log('[booking:cleanup] Cleanup job started (every 15 min)');
}

module.exports = { cleanupStaleBookings, startBookingCleanupJob };
