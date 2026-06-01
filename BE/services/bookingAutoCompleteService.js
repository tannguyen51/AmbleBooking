const Booking = require("../models/booking");
const Table = require("../models/table");

const ACTIVE_STATUSES = ["confirmed", "paid"];
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

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

const runAutoCompleteBookings = async () => {
  const now = new Date();
  const candidates = await Booking.find({
    status: { $in: ACTIVE_STATUSES },
  }).lean();

  const overdue = candidates.filter((booking) => {
    const dateTime = parseBookingDateTime(
      booking?.bookingDetails?.date,
      booking?.bookingDetails?.time,
    );
    return dateTime && dateTime.getTime() < now.getTime();
  });

  if (!overdue.length) return { updated: 0 };

  const ids = overdue.map((b) => b._id);
  await Booking.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        status: "completed",
      },
    },
  );

  // TRIỆT ĐỂ: Giải phóng bàn khi booking hoàn thành
  const tableIds = overdue.map((b) => b.tableId).filter(Boolean);
  if (tableIds.length) {
    await Table.updateMany(
      { _id: { $in: tableIds } },
      { $set: { isAvailable: true, currentBookingId: null } },
    );
  }

  return { updated: ids.length };
};

let timer = null;
const startBookingAutoCompleteJob = () => {
  if (timer) return;

  runAutoCompleteBookings()
    .then(({ updated }) => {
      if (updated > 0) {
        console.log(`[booking:auto-complete] Initial run completed ${updated} booking(s).`);
      }
    })
    .catch((error) => {
      console.error("[booking:auto-complete] Initial run error:", error.message);
    });

  timer = setInterval(async () => {
    try {
      const { updated } = await runAutoCompleteBookings();
      if (updated > 0) {
        console.log(`[booking:auto-complete] Completed ${updated} overdue booking(s).`);
      }
    } catch (error) {
      console.error("[booking:auto-complete] Interval error:", error.message);
    }
  }, CHECK_INTERVAL_MS);
};

module.exports = {
  parseBookingDateTime,
  runAutoCompleteBookings,
  startBookingAutoCompleteJob,
};
