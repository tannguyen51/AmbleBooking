require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const Booking = require("../models/booking");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const agg = async (filter, extra = {}) => {
    const r = await Booking.aggregate([{ $match: { ...filter, ...extra } }, { $group: { _id: null, total: { $sum: "$pricing.totalAmount" }, n: { $sum: 1 } } }]);
    return r[0] || { total: 0, n: 0 };
  };

  const completedAll = await agg({ status: "completed" });
  const completedThisMonth = await agg({ status: "completed", createdAt: { $gte: monthStart } });
  const paidStatus = await Booking.countDocuments({ "payment.status": "paid" });
  const byStatusOverall = await Booking.aggregate([{ $group: { _id: "$status", n: { $sum: 1 }, total: { $sum: "$pricing.totalAmount" } } }]);

  console.log(JSON.stringify({
    now: now.toISOString(),
    monthStart: monthStart.toISOString(),
    completedAll,
    completedThisMonth,
    paidBookingsCount: paidStatus,
    byStatus: byStatusOverall.map((s) => ({ status: s._id, n: s.n, total: s.total })),
  }, null, 2));

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});