require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const Booking = require("../models/booking");

  const MONTHS = ["2026-06", "2026-07", "2026-08"];

  const rows = await Booking.aggregate([
    {
      $lookup: {
        from: "restaurants",
        localField: "restaurantId",
        foreignField: "_id",
        as: "r",
      },
    },
    { $unwind: { path: "$r", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        restName: { $ifNull: ["$r.name", "(Không tìm thấy nhà hàng)"] },
        month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        statusNum: 1,
        status: 1,
        amount: { $ifNull: ["$pricing.totalAmount", 0] },
        paid: { $cond: [{ $eq: ["$payment.status", "paid"] }, 1, 0] },
      },
    },
    {
      $match: { month: { $in: MONTHS } },
    },
    {
      $group: {
        _id: { rest: "$restName", month: "$month" },
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        declined: { $sum: { $cond: [{ $eq: ["$status", "declined"] }, 1, 0] } },
        active: { $sum: { $cond: [{ $in: ["$status", ["pending", "confirmed", "occupied"]] }, 1, 0] } },
        completedTotal: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0] } },
        paidTotal: { $sum: { $cond: [{ $eq: ["$payment.status", "paid"] }, "$amount", 0] } },
        paidCount: { $sum: "$paid" },
      },
    },
    { $sort: { "_id.month": 1, _id: 1 } },
  ]);

  console.log("DOANH THU / ĐƠN THEO THÁNG (3 tháng gần nhất: 06, 07, 08/2026)\n");
  console.log(
    "Nhà hàng | Tháng | Đơn | Completed | Cancelled | Declined | Active | DT(completed) | DT(paid)"
  );
  rows.forEach((r) => {
    console.log(
      `${r._id.rest}\n   ${r._id.month}: ${r.total}đơn (completed ${r.completed}, cancel ${r.cancelled}, declined ${r.declined}, active ${r.active})  DT-completed=${r.completedTotal}đ  DT-paid=${r.paidTotal}đ (${r.paidCount})`
    );
  });

  // Tổng 3 tháng theo nhà hàng
  console.log("\n── TỔNG 3 THÁNG THEO NHÀ HÀNG ──");
  const totals = {};
  rows.forEach((r) => {
    const k = r._id.rest;
    totals[k] = totals[k] || { total: 0, completed: 0, cancelled: 0, declined: 0, active: 0, completedTotal: 0, paidTotal: 0, paidCount: 0 };
    totals[k].total += r.total;
    totals[k].completed += r.completed;
    totals[k].cancelled += r.cancelled;
    totals[k].declined += r.declined;
    totals[k].active += r.active;
    totals[k].completedTotal += r.completedTotal;
    totals[k].paidTotal += r.paidTotal;
    totals[k].paidCount += r.paidCount;
  });
  Object.entries(totals).forEach(([name, t]) =>
    console.log(
      `${name}: ${t.total}đơn (completed ${t.completed}, cancel ${t.cancelled}, declined ${t.declined}, active ${t.active})  DT-completed=${t.completedTotal}đ  DT-paid=${t.paidTotal}đ (${t.paidCount} đơn paid)`
    )
  );

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});