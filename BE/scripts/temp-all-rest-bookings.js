require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const Booking = require("../models/booking");
  const Restaurant = require("../models/restaurant");

  const restaurants = await Restaurant.find({}).select("name").lean();

  const agg = await Booking.aggregate([
    {
      $lookup: { from: "restaurants", localField: "restaurantId", foreignField: "_id", as: "r" },
    },
    {
      $project: {
        restName: {
          $cond: [
            { $or: [{ $eq: ["$restaurantId", null] }, { $eq: [{ $size: "$r" }, 0] }] },
            "(Đơn không khớp nhà hàng / nhà hàng đã xóa)",
            { $arrayElemAt: ["$r.name", 0] },
          ],
        },
        status: 1,
        amount: { $ifNull: ["$pricing.totalAmount", 0] },
      },
    },
    {
      $group: {
        _id: "$restName",
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        declined: { $sum: { $cond: [{ $eq: ["$status", "declined"] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $in: ["$status", ["pending", "confirmed", "occupied"]] }, 1, 0] } },
        completedTotal: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0] } },
      },
    },
    { $sort: { total: -1 } },
  ]);

  const byRest = new Map(agg.map((a) => [a._id, a]));

  console.log("── BOOKING / DOANH THU TOÀN BỘ THEO NHÀ HÀNG ──\n");
  restaurants.forEach((r) => {
    const d = byRest.get(r.name) || { total: 0, completed: 0, cancelled: 0, declined: 0, pending: 0, completedTotal: 0 };
    console.log(
      `${r.name}: ${d.total} đơn (completed ${d.completed} | cancel ${d.cancelled} | declined ${d.declined} | active ${d.pending})  DT(completed)=${d.completedTotal}đ`
    );
  });

  const orphan = byRest.get("(Đơn không khớp nhà hàng / nhà hàng đã xóa)");
  if (orphan) {
    console.log(
      `\n(Đơn không khớp nhà hàng / nhà hàng đã xóa): ${orphan.total} đơn (completed ${orphan.completed})  DT(completed)=${orphan.completedTotal}đ`
    );
  }

  const totalBooking = await Booking.countDocuments({});
  console.log(`\nTỔNG booking toàn DB: ${totalBooking}`);

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});