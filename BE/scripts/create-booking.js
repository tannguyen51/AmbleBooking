require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");
const Restaurant = require("../models/restaurant");
const Table = require("../models/table");
const Booking = require("../models/booking");

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose
  .connect(mongoUri)
  .then(async () => {
    console.log("? MongoDB connected");
    
    // L?y user, restaurant, table d?u tiên
    const user = await User.findOne();
    const restaurant = await Restaurant.findOne();
    const table = await Table.findOne();
    
    if (!user || !restaurant || !table) {
      console.log("? Missing user, restaurant, or table");
      process.exit(1);
    }
    
    // T?o booking m?i
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 7);
    
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `BK-${dateStr}-${random}`;
    
    const expectedContent = `AMBLE-${Math.floor(Math.random() * 100000)}`;
    
    const newBooking = new Booking({
      bookingNumber: bookingNumber,
      userId: user._id,
      restaurantId: restaurant._id,
      tableId: table._id,
      bookingDetails: {
        date: bookingDate.toISOString().split('T')[0],
        time: "19:00",
        partySize: 2,
        purpose: "casual",
        specialRequests: "Test webhook"
      },
      pricing: {
        depositAmount: 100000,
        voucherDiscount: 0,
        totalAmount: 500000
      },
      status: "pending_payment",
      payment: {
        method: "bank",
        expectedContent: expectedContent
      }
    });

    await newBooking.save();
    
    console.log("\n? Booking m?i du?c t?o:");
    console.log("ID:", newBooking._id);
    console.log("Booking Number:", newBooking.bookingNumber);
    console.log("Status:", newBooking.status);
    console.log("Expected Content:", newBooking.payment.expectedContent);
    console.log("Total Amount:", newBooking.pricing.totalAmount);
    
    process.exit(0);
  })
  .catch((err) => {
    console.error("? Error:", err.message);
    process.exit(1);
  });
