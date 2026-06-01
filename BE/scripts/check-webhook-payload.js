const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Booking = require("../models/booking");

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error("Error: MONGODB_URI or MONGO_URI not found in .env");
  process.exit(1);
}

const checkPendingPaymentBooking = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB\n");

    // Tìm booking pending_payment gần đây nhất
    const booking = await Booking.findOne({ status: "pending_payment" })
      .sort({ createdAt: -1 })
      .lean();

    if (!booking) {
      console.log("No pending_payment booking found");
      await mongoose.disconnect();
      return;
    }

    console.log("📌 Booking Pending Payment:");
    console.log(`  Booking Number: ${booking.bookingNumber}`);
    console.log(`  Status: ${booking.status}`);
    console.log(`  Created: ${new Date(booking.createdAt).toISOString()}`);
    console.log(`  Amount: ${booking.pricing?.totalAmount}`);
    console.log("");
    console.log("💳 Payment Info:");
    console.log(`  Method: ${booking.payment?.method}`);
    console.log(`  Expected Content: ${booking.payment?.expectedContent}`);
    console.log(`  QR URL: ${booking.payment?.qrUrl ? "✅ Yes" : "❌ No"}`);
    console.log(`  Bank Code: ${booking.payment?.bankCode}`);
    console.log(`  Account Number: ${booking.payment?.accountNumber}`);
    console.log("");
    console.log("🔍 Webhook Test:");
    console.log(`  To test webhook, send POST to: /api/booking/payment/vietqr-webhook`);
    console.log(`  With payload:`);
    console.log(`  {`);
    console.log(`    "content": "${booking.payment?.expectedContent}",`);
    console.log(`    "amount": ${booking.pricing?.totalAmount},`);
    console.log(`    "transactionId": "TEST-${Date.now()}"`);
    console.log(`  }`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

checkPendingPaymentBooking();
