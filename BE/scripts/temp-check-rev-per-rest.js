require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const Booking = require("../models/booking");
  const User = require("../models/user");
  const Review = require("../models/review");
  const ChatHistory = require("../models/chatHistory");

  // Booking theo nhà hàng (tên + count + tổng tiền)
  const byRest = await Booking.aggregate([
    {
      $lookup: { from: "restaurants", localField: "restaurantId", foreignField: "_id", as: "r" },
    },
    { $unwind: { path: "$r", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$r.name",
        n: { $sum: 1 },
        total: { $sum: "$pricing.totalAmount" },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
      },
    },
    { $sort: { n: -1 } },
  ]);
  console.log("── BOOKING THEO NHÀ HÀNG ──");
  byRest.forEach((r) =>
    console.log(`  ${r._id || "(null)"}: ${r.n} đơn (completed ${r.completed}) = ${r.total}đ`)
  );

  // Rà soát lại danh sách "0 hoạt động" trước khi xóa (đảm bảo không có booking/review/chat/favorite)
  const [users, bookingAgg, reviewAgg, chatAgg] = await Promise.all([
    User.find({}).select("fullName email isActive role favoriteRestaurants favoriteRoutes").lean(),
    Booking.aggregate([{ $group: { _id: "$userId", n: { $sum: 1 } } }]),
    Review.aggregate([{ $group: { _id: "$userId", n: { $sum: 1 } } }]),
    ChatHistory.aggregate([{ $group: { _id: "$userId", n: { $sum: 1 } } }]),
  ]);
  const mk = (a) => new Map(a.map((x) => [String(x._id), x.n]));
  const bc = mk(bookingAgg), rc = mk(reviewAgg), cc = mk(chatAgg);

  const cand = users.filter((u) => {
    const id = String(u._id);
    if (!u.isActive || u.role === "admin") return false;
    return !(bc.get(id) || 0) && !(rc.get(id) || 0) && !(cc.get(id) || 0) &&
      !((u.favoriteRestaurants?.length || 0) + (u.favoriteRoutes?.length || 0));
  });
  // Xác nhận các ứng viên có book/review/chat = 0 (kể cả ở Phan Văn Hớn)
  const withData = cand.filter((u) => (bc.get(String(u._id)) || 0) + (rc.get(String(u._id)) || 0) + (cc.get(String(u._id)) || 0) > 0);
  console.log(`\n── XÓA AN TOÀN: ${cand.length} account 0 hoạt động sẵn sàng xóa` + (withData.length ? `, (⚠ ${withData.length} có dữ liệu!)` : " — tất cả đều 0 booking/review/chat ✓"));

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});