require("dotenv").config();
const mongoose = require("mongoose");
const Booking = require("../models/booking");

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose
  .connect(mongoUri)
  .then(async () => {
    console.log("? MongoDB connected");
    
    // L?y booking m?i nh?t
    const booking = await Booking.findOne().sort({ createdAt: -1 }).limit(1);
    
    if (!booking) {
      console.log("? Không tìm th?y booking nào");
      process.exit(0);
    }
    
    console.log("\n?? Booking m?i nh?t:");
    console.log("ID:", booking._id);
    console.log("User ID:", booking.userId);
    console.log("Status:", booking.status);
    console.log("Total Amount:", booking.pricing?.totalAmount);
    console.log("Expected Content:", booking.payment?.expectedContent);
    console.log("\n? Copy thông tin trên d? test webhook");
    
    process.exit(0);
  })
  .catch((err) => {
    console.error("? MongoDB error:", err);
    process.exit(1);
  });
