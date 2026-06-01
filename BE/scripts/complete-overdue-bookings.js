require("dotenv").config();
const mongoose = require("mongoose");
const { runAutoCompleteBookings } = require("../services/bookingAutoCompleteService");

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI or MONGO_URI in environment");
}

(async () => {
  await mongoose.connect(mongoUri);
  const { updated } = await runAutoCompleteBookings();
  console.log(`[complete-overdue-bookings] Updated ${updated} booking(s) to completed.`);
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error("[complete-overdue-bookings] Error:", error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
