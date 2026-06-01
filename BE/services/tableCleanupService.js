const Table = require("../models/table");

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 phút

const cleanupOrphanedTables = async () => {
  try {
    const result = await Table.updateMany(
      {
        isActive: true,
        isAvailable: false,
        currentBookingId: null,
      },
      { $set: { isAvailable: true } }
    );

    if (result.modifiedCount > 0) {
      console.log(`[table:cleanup-orphaned] Cleaned up ${result.modifiedCount} orphaned table(s).`);
    }

    return { cleaned: result.modifiedCount };
  } catch (error) {
    console.error("[table:cleanup-orphaned] Error:", error.message);
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
        console.log(`[table:cleanup-orphaned] Initial run cleaned ${cleaned} table(s).`);
      }
    })
    .catch((error) => {
      console.error("[table:cleanup-orphaned] Initial run error:", error.message);
    });

  // Chạy định kỳ
  timer = setInterval(async () => {
    try {
      const { cleaned } = await cleanupOrphanedTables();
      if (cleaned > 0) {
        console.log(`[table:cleanup-orphaned] Periodic run cleaned ${cleaned} table(s).`);
      }
    } catch (error) {
      console.error("[table:cleanup-orphaned] Periodic run error:", error.message);
    }
  }, CHECK_INTERVAL_MS);
};

const stopTableCleanupJob = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("[table:cleanup-orphaned] Job stopped.");
  }
};

module.exports = {
  cleanupOrphanedTables,
  startTableCleanupJob,
  stopTableCleanupJob,
};
