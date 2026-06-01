const mongoose = require("mongoose");
require("dotenv").config();

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error("Missing MONGODB_URI or MONGO_URI in environment");
  process.exit(1);
}

const inspectBookingState = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected\n");

    // Load models
    const Table = require("../models/table");
    const Booking = require("../models/booking");

    // Kiểm tra booking active
    const activeBookings = await Booking.find({
      status: { $in: ["pending", "pending_payment", "confirmed", "paid"] },
    })
      .populate("tableId", "name isAvailable currentBookingId")
      .lean();

    console.log(`=== ACTIVE BOOKINGS (${activeBookings.length}) ===`);
    if (activeBookings.length === 0) {
      console.log("Không có booking active");
    } else {
      activeBookings.forEach((b) => {
        const table = b.tableId;
        const mismatch = table && table.currentBookingId?.toString() !== b._id.toString();
        const status = mismatch ? "⚠️ MISMATCH" : "✓";
        console.log(`${status} ${b.bookingNumber}`);
        console.log(`   Status: ${b.status}`);
        console.log(`   Table: ${table?.name} (available=${table?.isAvailable})`);
        console.log(`   Date/Time: ${b.bookingDetails?.date} ${b.bookingDetails?.time}`);
        if (mismatch) {
          console.log(`   ⚠️ Table.currentBookingId=${table?.currentBookingId} vs Booking._id=${b._id}`);
        }
        console.log();
      });
    }

    // Kiểm tra bàn booked
    const bookedTables = await Table.find({
      isActive: true,
      isAvailable: false,
    })
      .populate("currentBookingId", "bookingNumber status")
      .lean();

    console.log(`=== BOOKED TABLES (${bookedTables.length}) ===`);
    if (bookedTables.length === 0) {
      console.log("Không có bàn nào đang booked");
    } else {
      bookedTables.forEach((t) => {
        const booking = t.currentBookingId;
        const orphaned = !booking;
        const status = orphaned ? "⚠️ ORPHANED" : "✓";
        console.log(`${status} ${t.name}`);
        if (booking) {
          console.log(`   Booking: ${booking.bookingNumber} (${booking.status})`);
        } else {
          console.log(`   ⚠️ Không có booking liên kết`);
        }
        console.log();
      });
    }

    // Tóm tắt
    console.log("=== SUMMARY ===");
    console.log(`Active bookings: ${activeBookings.length}`);
    console.log(`Booked tables: ${bookedTables.length}`);
    const orphanedTables = bookedTables.filter((t) => !t.currentBookingId).length;
    console.log(`Orphaned tables: ${orphanedTables}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

inspectBookingState();
