const mongoose = require("mongoose");
require("dotenv").config();

const Table = require("../models/table");
const Booking = require("../models/booking");

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error("Missing MONGODB_URI or MONGO_URI in environment");
  process.exit(1);
}

const cleanupOrphanedTables = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");

    // Tìm bàn "mồ côi" (isAvailable=false nhưng currentBookingId=null)
    const orphanedTables = await Table.find({
      isActive: true,
      isAvailable: false,
      currentBookingId: null,
    });

    if (orphanedTables.length === 0) {
      console.log("✓ Không có bàn mồ côi nào");
      await mongoose.disconnect();
      return;
    }

    console.log(`Tìm thấy ${orphanedTables.length} bàn mồ côi:`);
    orphanedTables.forEach((t) => {
      console.log(`  - ${t.name} (${t._id})`);
    });

    // Giải phóng tất cả bàn mồ côi
    const result = await Table.updateMany(
      {
        isActive: true,
        isAvailable: false,
        currentBookingId: null,
      },
      { $set: { isAvailable: true } }
    );

    console.log(`✓ Đã giải phóng ${result.modifiedCount} bàn`);

    // Kiểm tra booking "treo" (pending/confirmed nhưng không có bàn)
    const hangingBookings = await Booking.find({
      status: { $in: ["pending", "pending_payment", "confirmed", "paid"] },
      tableId: { $exists: false },
    });

    if (hangingBookings.length > 0) {
      console.log(`\nTìm thấy ${hangingBookings.length} booking không có bàn:`);
      hangingBookings.forEach((b) => {
        console.log(`  - ${b.bookingNumber} (${b._id})`);
      });
    }

    await mongoose.disconnect();
    console.log("\n✓ Dọn dẹp hoàn thành");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

cleanupOrphanedTables();
