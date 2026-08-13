require("dotenv").config();
const mongoose = require("mongoose");
const Booking = require("../models/booking");
const Restaurant = require("../models/restaurant");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const bookings = await Booking.find({}).select("pricing payment status restaurantId source bookingNumber").lean();

  const validRestIds = new Set(
    (await Restaurant.find({}, { _id: 1 }).lean()).map((r) => r._id.toString()),
  );

  const sum = (arr) => arr.reduce((s, b) => s + (b.pricing?.totalAmount || 0), 0);
  const sumDep = (arr) => arr.reduce((s, b) => s + (b.pricing?.depositAmount || 0), 0);

  const all = bookings;
  const paid = bookings.filter((b) => b.payment?.status === "paid");
  const unpaid = bookings.filter((b) => b.payment?.status !== "paid");
  const orphan = bookings.filter((b) => !validRestIds.has(b.restaurantId?.toString()));
  const real = bookings.filter((b) => validRestIds.has(b.restaurantId?.toString()));

  const fmt = (n) => n.toLocaleString("vi-VN") + "đ";

  console.log("=== TỔNG DOANH THU ===\n");
  console.log(`TỔNG GIÁ TRỊ TẤT CẢ ĐƠN (151): ${fmt(sum(all))}  (cọc: ${fmt(sumDep(all))})`);
  console.log(`DOANH THU ĐÃ THU (đơn paid, 100): ${fmt(sum(paid))}`);
  console.log(`  (không thu - unpaid/declined/cancel, 51): ${fmt(sum(unpaid))}`);

  console.log(`\n--- Tách dữ liệu mồ côi (nhà hàng đã xóa) ---`);
  console.log(`Đơn mồ côi: ${orphan.length} đơn = ${fmt(sum(orphan))}`);
  console.log(`Đơn hợp lệ: ${real.length} đơn = ${fmt(sum(real))}`);
  console.log(`Doanh thu đã thu từ đơn hợp lệ: ${fmt(sum(real.filter((b) => b.payment?.status === "paid")))}`);

  console.log(`\n--- Nguồn (toàn bộ) ---`);
  const bySrc = {};
  paid.forEach((b) => { bySrc[b.source || "app"] = (bySrc[b.source || "app"] || 0) + (b.pricing?.totalAmount || 0); });
  Object.entries(bySrc).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${fmt(v)}`));

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});