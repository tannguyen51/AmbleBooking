require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const User = require("../models/user");
const Booking = require("../models/booking");
const Review = require("../models/review");
const ChatHistory = require("../models/chatHistory");

const backup = JSON.parse(
  fs.readFileSync(path.join(__dirname, "backup-deleted-spam-users-2026-08-13.json"), "utf8")
);
const hasVnMark = (s) => s && /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]/.test(s);
const RESTORED_EMAILS = new Set(
  backup.candidates
    .filter((u) => hasVnMark(u.fullName) || /\bviet|fpt|tdtu/i.test(u.email))
    .map((u) => u.email.toLowerCase())
);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const [users, bookingAgg, reviewAgg, chatAgg] = await Promise.all([
    User.find({}).select("fullName email isActive favoriteRestaurants favoriteRoutes createdAt").lean(),
    Booking.aggregate([{ $group: { _id: "$userId", n: { $sum: 1 } } }]),
    Review.aggregate([{ $group: { _id: "$userId", n: { $sum: 1 } } }]),
    ChatHistory.aggregate([{ $group: { _id: "$userId", n: { $sum: 1 } } }]),
  ]);
  const mk = (agg) => new Map(agg.map((x) => [String(x._id), x.n]));

  const bCount = mk(bookingAgg);
  const rCount = mk(reviewAgg);
  const cCount = mk(chatAgg);

  const rows = users.map((u) => {
    const id = String(u._id);
    return {
      ...u,
      id,
      bookings: bCount.get(id) || 0,
      reviews: rCount.get(id) || 0,
      chats: cCount.get(id) || 0,
      favs: (u.favoriteRestaurants?.length || 0) + (u.favoriteRoutes?.length || 0),
      restored: RESTORED_EMAILS.has(u.email.toLowerCase()),
      zero: !(bCount.get(id) || 0) && !(rCount.get(id) || 0) && !(cCount.get(id) || 0) && !((u.favoriteRestaurants?.length || 0) + (u.favoriteRoutes?.length || 0)),
    };
  });

  const active = rows.filter((u) => u.isActive);
  console.log(`ACTIVE users hiện tại: ${active.length}  (tổng: ${rows.length})`);

  const cand = active.filter((u) => u.zero && !u.restored);
  console.log(`\n-- ACTIVE, 0 HOẠT ĐỘNG, KHÔNG thuộc nhóm vừa khôi phục (candidate xóa): ${cand.length} --`);
  cand.forEach((u) => console.log(`  ${u.email} | ${u.fullName} | tạo ${new Date(u.createdAt).toISOString().slice(0,10)}`));

  console.log(`\nNếu xóa ${cand.length} account này → ACTIVE = ${active.length - cand.length}`);

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});