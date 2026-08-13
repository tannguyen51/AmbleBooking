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
    User.find({}).select("fullName email isActive role favoriteRestaurants favoriteRoutes createdAt").lean(),
    Booking.aggregate([{ $group: { _id: "$userId", n: { $sum: 1 } } }]),
    Review.aggregate([{ $group: { _id: "$userId", n: { $sum: 1 } } }]),
    ChatHistory.aggregate([{ $group: { _id: "$userId", n: { $sum: 1 } } }]),
  ]);
  const mk = (agg) => new Map(agg.map((x) => [String(x._id), x.n]));
  const bCount = mk(bookingAgg), rCount = mk(reviewAgg), cCount = mk(chatAgg);

  const cand = users.filter((u) => {
    const id = String(u._id);
    if (!u.isActive) return false;
    if (u.role === "admin") return false; // tuyệt đối giữ admin
    if (RESTORED_EMAILS.has(u.email.toLowerCase())) return false;
    const zero =
      !(bCount.get(id) || 0) && !(rCount.get(id) || 0) && !(cCount.get(id) || 0) &&
      !((u.favoriteRestaurants?.length || 0) + (u.favoriteRoutes?.length || 0));
    return zero;
  });

  const ids = cand.map((u) => u._id);
  console.log(`Sẽ xóa ${cand.length} account (active, 0 hoạt động, không phải admin/không vừa khôi phục)`);
  cand.forEach((u) => console.log(`  ${u.email} | ${u.fullName}`));

  const stamp = new Date().toISOString().slice(0, 10);
  const backupPath = path.join(__dirname, `backup-deleted-zero-activity-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ deletedAt: new Date().toISOString(), candidates: cand }, null, 2));
  console.log(`Đã backup → ${backupPath}`);

  const del = await User.deleteMany({ _id: { $in: ids } });
  console.log(`Đã xóa ${del.deletedCount} user`);

  const total = await User.countDocuments({});
  const active = await User.countDocuments({ isActive: true });
  console.log(`TOTAL còn lại=${total}  ACTIVE còn lại=${active}`);

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});