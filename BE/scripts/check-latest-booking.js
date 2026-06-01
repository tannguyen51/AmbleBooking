const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Booking = require("../models/booking");

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error("Error: MONGODB_URI or MONGO_URI not found in .env");
  process.exit(1);
}

const checkLatestBooking = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB\n");

    // Tìm booking gần đây nhất
    const booking = await Booking.findOne()
      .sort({ createdAt: -1 })
      .lean();

    if (!booking) {
      console.log("No booking found");
      await mongoose.disconnect();
      return;
    }

    console.log("📌 Latest Booking:");
    console.log(`  Booking Number: ${booking.bookingNumber}`);
    console.log(`  Status: ${booking.status}`);
    console.log(`  Created: ${new Date(booking.createdAt).toISOString()}`);
    console.log(`  Amount: ${booking.pricing?.totalAmount}`);
    console.log("");
    console.log("💳 Payment Info:");
    console.log(`  Method: ${booking.payment?.method}`);
    console.log(`  Expected Content: ${booking.payment?.expectedContent}`);
    console.log(`  Transaction ID: ${booking.payment?.transactionId}`);
    console.log(`  Paid At: ${booking.payment?.paidAt ? new Date(booking.payment.paidAt).toISOString() : "N/A"}`);
    console.log("");
    console.log("📊 Status Timeline:");
    console.log(`  Current Status: ${booking.status}`);
    console.log(`  Confirmed At: ${booking.confirmedAt ? new Date(booking.confirmedAt).toISOString() : "N/A"}`);
    console.log(`  Cancelled At: ${booking.cancelledAt ? new Date(booking.cancelledAt).toISOString() : "N/A"}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

checkLatestBooking();
