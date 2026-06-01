const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Booking = require("../models/booking");

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error("Error: MONGODB_URI or MONGO_URI not found in .env");
  process.exit(1);
}

const inspectPendingPaymentBookings = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB\n");

    const now = new Date();
    console.log(`Current time: ${now.toISOString()}\n`);

    // Tìm tất cả booking pending_payment
    const pendingPaymentBookings = await Booking.find({ status: "pending_payment" }).lean();

    console.log(`Total pending_payment bookings: ${pendingPaymentBookings.length}\n`);

    if (pendingPaymentBookings.length === 0) {
      console.log("No pending_payment bookings found.");
      await mongoose.disconnect();
      return;
    }

    pendingPaymentBookings.forEach((booking, index) => {
      const createdAt = new Date(booking.createdAt);
      const ageMs = now.getTime() - createdAt.getTime();
      const ageMinutes = Math.floor(ageMs / 1000 / 60);
      
      console.log(`${index + 1}. Booking ${booking.bookingNumber}`);
      console.log(`   User ID: ${booking.userId}`);
      console.log(`   Restaurant ID: ${booking.restaurantId}`);
      console.log(`   Table ID: ${booking.tableId}`);
      console.log(`   Date/Time: ${booking.bookingDetails?.date} ${booking.bookingDetails?.time}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Created: ${createdAt.toISOString()}`);
      console.log(`   Age: ${ageMinutes} minutes`);
      console.log(`   Amount: ${booking.pricing?.totalAmount || 0}`);
      console.log("");
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

inspectPendingPaymentBookings();
