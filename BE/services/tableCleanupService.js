const Table = require("../models/table");
const Booking = require("../models/booking");

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 phút
const FINAL_STATUSES = ["completed", "cancelled", "refund_pending", "refunded", "released", "no_show"];

const cleanupOrphanedTables = async () => {
  try {
    // 1. Bàn không có currentBookingId
    const result1 = await Table.updateMany(
      {
        isActive: true,
        isAvailable: false,
        currentBookingId: null,
      },
      { $set: { isAvailable: true, status: 'available' } }
    );

    if (result1.modifiedCount > 0) {
      console.log(`[table:cleanup] Cleaned ${result1.modifiedCount} orphaned table(s) (no booking ref).`);
    }

    // 2. Bàn bị lock bởi booking đã kết thúc (completed/cancelled/refunded)
    const stuckTables = await Table.find({
      isActive: true,
      isAvailable: false,
      currentBookingId: { $ne: null },
    }).lean();

    const stuckBookingIds = stuckTables
      .map((t) => t.currentBookingId)
      .filter(Boolean);
    if (stuckBookingIds.length === 0) return { cleaned: result1.modifiedCount };

    const finishedBookings = await Booking.find({
      _id: { $in: stuckBookingIds },
      status: { $in: FINAL_STATUSES },
    })
      .select("_id")
      .lean();

    const finishedIds = new Set(finishedBookings.map((b) => b._id.toString()));
    const toRelease = stuckTables.filter((t) =>
      finishedIds.has(t.currentBookingId.toString())
    );

    if (toRelease.length > 0) {
      const tableIds = toRelease.map((t) => t._id);
      await Table.updateMany(
        { _id: { $in: tableIds } },
        { $set: { isAvailable: true, currentBookingId: null, status: 'available' } }
      );
      console.log(`[table:cleanup] Released ${toRelease.length} table(s) from finished bookings.`);
    }

    // 3. Bàn bị lock nhưng booking không còn tồn tại (đã xóa khỏi DB)
    const allExistingBookings = await Booking.find({
      _id: { $in: stuckBookingIds },
    })
      .select("_id")
      .lean();
    const allExistingIds = new Set(allExistingBookings.map((b) => b._id.toString()));
    const missingTableIds = stuckTables
      .filter((t) => !allExistingIds.has(t.currentBookingId.toString()))
      .map((t) => t._id);

    if (missingTableIds.length > 0) {
      await Table.updateMany(
        { _id: { $in: missingTableIds } },
        { $set: { isAvailable: true, currentBookingId: null, status: 'available' } }
      );
      console.log(`[table:cleanup] Released ${missingTableIds.length} table(s) from deleted/non-existent bookings.`);
    }

    return { cleaned: result1.modifiedCount + toRelease.length + missingTableIds.length };
  } catch (error) {
    console.error("[table:cleanup] Error:", error.message);
    return { cleaned: 0, error: error.message };
  }
};

let timer = null;

const startTableCleanupJob = () => {
  if (timer) return;

  // Chạy lần đầu ngay
  cleanupOrphanedTables()
    .then(({ cleaned }) => {
      if (cleaned > 0) {
        console.log(`[table:cleanup] Initial run cleaned ${cleaned} table(s).`);
      }
    })
    .catch((error) => {
      console.error("[table:cleanup] Initial run error:", error.message);
    });

  // Chạy định kỳ
  timer = setInterval(async () => {
    try {
      const { cleaned } = await cleanupOrphanedTables();
      if (cleaned > 0) {
        console.log(`[table:cleanup] Periodic run cleaned ${cleaned} table(s).`);
      }
    } catch (error) {
      console.error("[table:cleanup] Periodic run error:", error.message);
    }
  }, CHECK_INTERVAL_MS);
};

const stopTableCleanupJob = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("[table:cleanup] Job stopped.");
  }
};

module.exports = {
  cleanupOrphanedTables,
  startTableCleanupJob,
  stopTableCleanupJob,
};
