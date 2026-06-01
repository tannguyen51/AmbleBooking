const mongoose = require("mongoose");
require("dotenv").config();

const Booking = require("../models/booking");
const Table = require("../models/table");

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

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

const inspectPendingBookings = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const now = new Date();
    console.log(`\nCurrent time: ${now.toISOString()}\n`);

    // Tìm tất cả booking pending
    const pendingBookings = await Booking.find({ status: "pending" })
      .populate("restaurantId", "name")
      .populate("tableId", "name")
      .lean();

    console.log(`Total pending bookings: ${pendingBookings.length}\n`);

    if (pendingBookings.length === 0) {
      console.log("No pending bookings found.");
      await mongoose.disconnect();
      return;
    }

    // Phân loại: overdue vs active
    const overdue = [];
    const active = [];

    pendingBookings.forEach((booking) => {
      const dateTime = parseBookingDateTime(
        booking?.bookingDetails?.date,
        booking?.bookingDetails?.time,
      );
      
      if (!dateTime) {
        console.log(`⚠️  Booking ${booking.bookingNumber}: Invalid date/time format`);
        return;
      }

      const isOverdue = dateTime.getTime() < now.getTime();
      
      if (isOverdue) {
        overdue.push({ booking, dateTime });
      } else {
        active.push({ booking, dateTime });
      }
    });

    console.log(`📌 ACTIVE (chờ xác nhận, chưa quá hạn): ${active.length}`);
    active.forEach(({ booking, dateTime }) => {
      console.log(`  - ${booking.bookingNumber} | ${booking.bookingDetails.date} ${booking.bookingDetails.time} | ${booking.restaurantId?.name || "N/A"} | Bàn: ${booking.tableId?.name || "N/A"}`);
    });

    console.log(`\n⏰ OVERDUE (quá hạn, sẽ bị hủy): ${overdue.length}`);
    overdue.forEach(({ booking, dateTime }) => {
      const diff = Math.floor((now.getTime() - dateTime.getTime()) / 1000 / 60);
      console.log(`  - ${booking.bookingNumber} | ${booking.bookingDetails.date} ${booking.bookingDetails.time} | Quá ${diff} phút | ${booking.restaurantId?.name || "N/A"} | Bàn: ${booking.tableId?.name || "N/A"}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

inspectPendingBookings();
