const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Booking = require("../models/booking");

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error("Error: MONGODB_URI or MONGO_URI not found in .env");
  process.exit(1);
}

const computePaymentTimeRemaining = (booking) => {
  if (booking.status !== "pending_payment") {
    return { timeRemaining: 0, timeRemainingSeconds: 0 };
  }

  const createdAt = new Date(booking.createdAt);
  const now = new Date();
  const PAYMENT_TIMEOUT_MS = 10 * 60 * 1000;
  const elapsedMs = now.getTime() - createdAt.getTime();
  const timeRemainingMs = Math.max(0, PAYMENT_TIMEOUT_MS - elapsedMs);
  const timeRemainingSeconds = Math.floor(timeRemainingMs / 1000);
  const timeRemaining = Math.floor(timeRemainingMs / 1000 / 60);

  return { timeRemaining, timeRemainingSeconds };
};

const debugPaymentTimer = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB\n");

    const now = new Date();
    console.log(`Current time: ${now.toISOString()}\n`);

    // Tìm booking pending_payment gần đây nhất
    const booking = await Booking.findOne({ status: "pending_payment" })
      .sort({ createdAt: -1 })
      .lean();

    if (!booking) {
      console.log("❌ No pending_payment booking found");
      await mongoose.disconnect();
      return;
    }

    console.log("📌 Booking Found:");
    console.log(`  Booking Number: ${booking.bookingNumber}`);
    console.log(`  Status: ${booking.status}`);
    console.log(`  Created: ${new Date(booking.createdAt).toISOString()}`);
    console.log("");

    // Tính thời gian còn lại
    const { timeRemaining, timeRemainingSeconds } = computePaymentTimeRemaining(booking);

    console.log("⏱️ Payment Timer:");
    console.log(`  Time Remaining (minutes): ${timeRemaining}`);
    console.log(`  Time Remaining (seconds): ${timeRemainingSeconds}`);
    console.log(`  Formatted: ${timeRemaining}:${(timeRemainingSeconds % 60).toString().padStart(2, "0")}`);
    console.log("");

    if (timeRemainingSeconds > 0) {
      console.log("✅ Timer should be visible in app!");
    } else {
      console.log("⚠️ Timer expired - booking should be auto-cancelled");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

debugPaymentTimer();
