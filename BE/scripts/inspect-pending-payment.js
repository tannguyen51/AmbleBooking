const mongoose = require("mongoose");
require("dotenv").config();

const Booking = require("../models/booking");
const Table = require("../models/table");

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error("Missing MONGODB_URI or MONGO_URI in environment");
  process.exit(1);
}

const inspectPendingPaymentBookings = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected\n");

    // Load models
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // Tìm booking pending_payment
    const pendingPaymentBookings = await Booking.find({
      status: "pending_payment",
    })
      .populate("tableId", "name isAvailable currentBookingId")
      .lean();

    console.log(`=== PENDING_PAYMENT BOOKINGS (${pendingPaymentBookings.length}) ===`);
    if (pendingPaymentBookings.length === 0) {
      console.log("Không có booking pending_payment");
    } else {
      pendingPaymentBookings.forEach((b) => {
        const createdAt = new Date(b.createdAt);
        const ageMinutes = Math.floor((now - createdAt) / (1000 * 60));
        const isExpired = createdAt < thirtyMinutesAgo;
        const status = isExpired ? "⚠️ EXPIRED" : "✓";
        console.log(`${status} ${b.bookingNumber}`);
        console.log(`   Created: ${createdAt.toISOString()}`);
        console.log(`   Age: ${ageMinutes} phút`);
        console.log(`   Table: ${b.tableId?.name} (available=${b.tableId?.isAvailable})`);
        if (isExpired) {
          console.log(`   ⚠️ Sẽ bị hủy tự động (quá 30 phút)`);
        }
        console.log();
      });
    }

    // Tóm tắt
    const expiredCount = pendingPaymentBookings.filter(
      (b) => new Date(b.createdAt) < thirtyMinutesAgo
    ).length;

    console.log("=== SUMMARY ===");
    console.log(`Total pending_payment: ${pendingPaymentBookings.length}`);
    console.log(`Expired (> 30 min): ${expiredCount}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

inspectPendingPaymentBookings();
