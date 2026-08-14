require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const sheet = require("./sheet-bookings.js");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const Booking = require("../models/booking");
  const Restaurant = require("../models/restaurant");

  const dbBookings = await Booking.find({}).select("bookingNumber status restaurantId").lean();
  const dbSet = new Set(dbBookings.map((b) => b.bookingNumber));

  const brands = { PVH: "Mì cay Seoul 117 Phan Văn Hớn", BĐ: "Seoul Bà Điểm", DTM: "Seoul Dương Thị Mười" };
  const restaurants = await Restaurant.find({}).select("name").lean();
  const restByBrand = {};
  for (const [k, name] of Object.entries(brands)) {
    const r = restaurants.find((x) => x.name === name);
    restByBrand[k] = r ? String(r._id) : null;
  }

  const missing = sheet.filter((s) => !dbSet.has(s.num));
  const present = sheet.filter((s) => dbSet.has(s.num));
  const missingByBranch = { PVH: 0, BĐ: 0, DTM: 0 };
  const missingKnownRest = [];
  const missingNoRest = [];
  missing.forEach((s) => {
    missingByBranch[s.branch] = (missingByBranch[s.branch] || 0) + 1;
    if (restByBrand[s.branch]) missingKnownRest.push(s);
    else missingNoRest.push(s);
  });

  console.log(`Sheet: ${sheet.length} đơn | Có trong DB: ${present.length} | THIẾU: ${missing.length}`);
  console.log(`Thiếu theo chi nhánh: PVH=${missingByBranch.PVH}, BĐ=${missingByBranch.BĐ}, DTM=${missingByBranch.DTM}`);
  if (missingNoRest.length) {
    console.log(`⚠ Nhà hàng chưa tìm thấy (${missingNoRest.length}):`, [...new Set(missingNoRest.map((m) => m.branch))]);
    await mongoose.disconnect();
    return;
  }
  console.log("\n── DANH SÁCH ĐƠN THIẾU ──");
  missing.forEach((m) =>
    console.log(`${m.num} | ${m.date} ${m.time} | ${m.branch} | ${m.name} | cọc ${m.deposit} | ${m.guests} khách | bàn "${m.table}"`)
  );

  // Đếm tổng tiền cọc của đơn thiếu (theo chi nhánh)
  const sumByBranch = {};
  missing.forEach((m) => { sumByBranch[m.branch] = (sumByBranch[m.branch] || 0) + m.deposit; });
  console.log("\n── TỔNG TIỀN CỌC ĐƠN THIẾU ──");
  Object.entries(sumByBranch).forEach(([k, v]) => console.log(`  ${k}: ${v}đ`));

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});