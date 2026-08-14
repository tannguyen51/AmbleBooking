require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const sheet = require("./sheet-bookings.js");

const DRY_RUN = false; // đổi false khi muốn ghi thật

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const Booking = require("../models/booking");
  const User = require("../models/user");
  const Restaurant = require("../models/restaurant");
  const Table = require("../models/table");

  const brands = { PVH: "Mì cay Seoul 117 Phan Văn Hớn", BĐ: "Seoul Bà Điểm", DTM: "Seoul Dương Thị Mười" };
  const restMap = {};
  for (const [k, name] of Object.entries(brands)) {
    const r = await Restaurant.findOne({ name }).select("_id").lean();
    if (!r) throw new Error(`Không tìm thấy nhà hàng ${name}`);
    restMap[k] = r._id;
  }

  const dbNums = new Set((await Booking.find({}).select("bookingNumber").lean()).map((b) => b.bookingNumber));
  const missing = sheet.filter((s) => !dbNums.has(s.num));

  // Tạo user chung cho khách không có tài khoản
  let walkinUser = await User.findOne({ email: "khach.vanglai.munchmap@gmail.com" }).select("_id").lean();
  const createWalkin = async () => {
    const u = await User.create({
      fullName: "Khách vãng lai",
      email: "khach.vanglai.munchmap@gmail.com",
      password: "Walkin@2026", // user chung, không dùng để đăng nhập
      phone: "",
      role: "customer",
      isActive: true,
    });
    return u._id;
  };

  const tableCache = {};
  const resolveTable = async (restId, tableStr) => {
    const normal = String(tableStr || "").trim();
    // Lấy số bàn (phần đầu trước "->" hoặc "("), ví dụ "13 ->12" → "13", "2->6 (...)" → "2"
    const first = normal.split(/->|\(/)[0].trim();
    if (!first) return null;
    // Tên bàn trong DB dạng "Bàn 02"/"Bàn 13"/"Bàn B01" → pad số lẻ thành 2 chữ số
    const cand = /^\d+$/.test(first) ? first.padStart(2, "0") : first;
    const key = `${restId}|${cand}`;
    if (tableCache[key]) return tableCache[key];
    const regex = new RegExp(`\\b${cand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const tables = await Table.find({ restaurantId: restId, name: regex }).select("_id name isAvailable").lean();
    const hit = tables.find((t) => t.isAvailable) || tables[0];
    tableCache[key] = hit ? hit._id : null;
    return tableCache[key];
  };

  const results = [];
  const unresolved = [];
  for (const m of missing) {
    const tid = await resolveTable(restMap[m.branch], m.table);
    if (!tid) { unresolved.push(`${m.num} (${m.branch}, bàn "${m.table}")`); continue; }
    let uid = null;
    const byName = await User.findOne({ fullName: m.name }).select("_id isActive").lean();
    if (byName) uid = byName._id;
    results.push({ m, restId: restMap[m.branch], tid, uid });
  }

  console.log(`Tổng thiếu: ${missing.length}, khớp được: ${results.length}`);
  if (unresolved.length) {
    console.log("⚠ Không nối được bàn (sẽ BỎ qua):");
    unresolved.forEach((u) => console.log("  " + u));
  }

  if (DRY_RUN) {
    console.log("\n[Dry-run] Dự kiến chèn (đã nối bàn + user kèm sẵn, tổng cọc = "
      + results.reduce((s, r) => s + r.m.deposit, 0) + "đ):");
    results.forEach((r) => console.log(`  ${r.m.num} | ${r.m.date} ${r.m.time} | ${r.m.branch} | ${r.m.name} | cọc ${r.m.deposit} | ${r.m.guests} kh | bàn="${r.m.table}" → uid=${r.uid ? "có-user" : "walkin"}`));
    await mongoose.disconnect();
    return;
  }

  // ── Ghi thật ──
  const walkinId = walkinUser ? walkinUser._id : await createWalkin();
  const docs = results.map((r) => {
    const dt = new Date(`${r.m.date}T${r.m.time}`);
    return {
      bookingNumber: r.m.num,
      userId: r.uid || walkinId,
      restaurantId: r.restId,
      tableId: r.tid,
      bookingDetails: { date: r.m.date, time: r.m.time, partySize: r.m.guests, purpose: "casual", specialRequests: "" },
      pricing: { depositAmount: r.m.deposit, voucherDiscount: 0, totalAmount: r.m.deposit },
      status: "completed",
      payment: { status: "paid", method: "cash", amount: r.m.deposit, paidAt: dt },
      source: "app",
      customerInfo: { name: r.m.name, phone: "" },
      confirmedAt: dt,
      completedAt: dt,
      createdAt: dt,
      updatedAt: dt,
    };
  });
  const res = await Booking.insertMany(docs, { ordered: false });
  console.log(`Đã chèn ${res.length}/${results.length} đơn. Tổng cọc bổ sung: ${results.reduce((s, r) => s + r.m.deposit, 0)}đ`);

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});