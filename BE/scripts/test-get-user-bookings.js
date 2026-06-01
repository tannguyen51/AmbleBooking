const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Booking = require("../models/booking");

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error("Error: MONGODB_URI or MONGO_URI not found in .env");
  process.exit(1);
}

const testGetUserBookings = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB\n");

    // User ID từ booking trên
    const userId = "69c400c2ee7fec1feaa45029";
    
    console.log(`Fetching bookings for user: ${userId}\n`);

    const bookings = await Booking.find({ userId }).lean();

    console.log(`Total bookings: ${bookings.length}\n`);

    bookings.forEach((booking, index) => {
      console.log(`${index + 1}. ${booking.bookingNumber} - Status: ${booking.status}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

testGetUserBookings();
