const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Booking = require("../models/booking");

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error("Error: MONGODB_URI or MONGO_URI not found in .env");
  process.exit(1);
}

const checkBookingStatus = async () => {
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

    const createdAt = new Date(booking.createdAt);
    const now = new Date();
    const ageMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 1000 / 60);

    console.log("📌 Latest Booking:");
    console.log(`  Booking Number: ${booking.bookingNumber}`);
    console.log(`  Status: ${booking.status}`);
    console.log(`  Created: ${createdAt.toISOString()}`);
    console.log(`  Age: ${ageMinutes} minutes ago`);
    console.log(`  Amount: ${booking.pricing?.totalAmount}`);
    console.log("");

    if (booking.status === "pending_payment") {
      console.log("⏳ Status: CHỜ THANH TOÁN");
      console.log("  Webhook chưa được gọi hoặc chưa thành công");
      console.log("  Hãy gọi webhook để cập nhật status");
    } else if (booking.status === "pending") {
      console.log("✅ Status: ĐÃ THANH TOÁN");
      console.log("  Webhook đã được gọi thành công!");
      console.log("  Booking đã chuyển sang chờ nhà hàng duyệt");
      console.log("");
      console.log("💳 Payment Info:");
      console.log(`  Transaction ID: ${booking.payment?.transactionId}`);
      console.log(`  Paid At: ${booking.payment?.paidAt ? new Date(booking.payment.paidAt).toISOString() : "N/A"}`);
      console.log("");
      console.log("📍 Booking sẽ hiển thị ở tab: 'Đang đặt'");
      console.log("  Hãy vào app, pull-to-refresh, rồi click tab 'Đang đặt'");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

checkBookingStatus();
