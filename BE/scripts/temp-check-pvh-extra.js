require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const sheet = require("./sheet-bookings.js");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const Booking = require("../models/booking");
  const Restaurant = require("../models/restaurant");

  const pvh = await Restaurant.findOne({ name: "Mì cay Seoul 117 Phan Văn Hớn" }).select("_id").lean();
  const dbPvh = await Booking.find({ restaurantId: pvh._id })
    .select("bookingNumber bookingDetails createdAt status pricing tableId")
    .sort({ createdAt: 1 })
    .lean();

  const sheetPvh = new Set(sheet.filter((s) => s.branch === "PVH").map((s) => s.num));

  const inDbOnly = dbPvh.filter((b) => !sheetPvh.has(b.bookingNumber));
  const missingFromDb = sheet.filter((s) => s.branch === "PVH" && !dbPvh.some((b) => b.bookingNumber === s.num)).map((s) => s.num);

  console.log(`Sheet PVH: ${sheetPvh.size} đơn`);
  console.log(`DB PVH: ${dbPvh.length} đơn`);
  console.log(`\n── Trong DB mà KHÔNG có trong sheet (${inDbOnly.length}) ──`);
  inDbOnly.forEach((b) =>
    console.log(`${b.bookingNumber} | ngày ${b.bookingDetails?.date} ${b.bookingDetails?.time} | bàn "${b.tableId ? String(b.tableId) : "?"}" | ${b.bookingDetails?.partySize} kh | status=${b.status} | cọc ${b.pricing?.depositAmount}`)
  );
  if (missingFromDb.length) console.log(`\n── Trong sheet PVH mà DB thiếu (${missingFromDb.length}) ──`, missingFromDb);

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});