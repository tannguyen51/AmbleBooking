require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const User = require("../models/user");
const Booking = require("../models/booking");
const Review = require("../models/review");
const BookingSession = require("../models/bookingSession");
const AnalyticsEvent = require("../models/analyticsEvent");
const ChatHistory = require("../models/chatHistory");
const SurveyResponse = require("../models/surveyResponse");

const BOUNDARY = new Date("2026-08-01T00:00:00.000Z");
const EXTRA = ["kkwnamy737@gmail.com", "fakebooking@test.com", "yuiop6809jb@gmail.com"];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const candidates = await User.find({
    $or: [{ createdAt: { $gte: BOUNDARY } }, { email: { $in: EXTRA } }],
  })
    .select("fullName email phone authProvider createdAt isActive")
    .lean();

  const ids = candidates.map((u) => u._id);
  console.log(`Sẽ xóa ${candidates.length} user (tạo từ 01/08/2026 + nhóm nhỏ đặc biệt)`);

  for (const u of candidates) console.log(`  ${u.email} | ${u.fullName} | ${new Date(u.createdAt).toISOString().slice(0,10)}`);

  const related = {
    booking: await Booking.countDocuments({ userId: { $in: ids } }),
    review: await Review.countDocuments({ userId: { $in: ids } }),
    bookingSession: await BookingSession.countDocuments({ userId: { $in: ids } }),
    analyticsEvent: await AnalyticsEvent.countDocuments({ userId: { $in: ids } }),
    chatHistory: await ChatHistory.countDocuments({ userId: { $in: ids } }),
    surveyResponse: await SurveyResponse.countDocuments({ userId: { $in: ids } }),
  };
  console.log(`Liên quan → booking:${related.booking}, review:${related.review}, session:${related.bookingSession}, analytics:${related.analyticsEvent}, chat:${related.chatHistory}, survey:${related.surveyResponse}`);

  // Backup trước khi xóa (để khôi phục nếu cần)
  const stamp = new Date().toISOString().slice(0, 10);
  const backupPath = path.join(__dirname, `backup-deleted-spam-users-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ deletedAt: new Date().toISOString(), candidates, related }, null, 2));
  console.log(`Đã backup → ${backupPath}`);

  await Booking.deleteMany({ userId: { $in: ids } });
  await Review.deleteMany({ userId: { $in: ids } });
  await BookingSession.deleteMany({ userId: { $in: ids } });
  await AnalyticsEvent.deleteMany({ userId: { $in: ids } });
  await ChatHistory.deleteMany({ userId: { $in: ids } });
  await SurveyResponse.deleteMany({ userId: { $in: ids } });
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