require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const Booking = require("../models/booking");
  const Restaurant = require("../models/restaurant");
  const User = require("../models/user");

  const restIds = new Set((await Restaurant.find({}).select("_id").lean()).map((r) => String(r._id)));

  const orphans = await Booking.find({}).select("bookingNumber restaurantId tableId userId bookingDetails pricing status payment createdAt").lean();

  const list = orphans.filter((b) => !b.restaurantId || !restIds.has(String(b.restaurantId)));
  const users = await User.find({ _id: { $in: list.map((b) => b.userId).filter(Boolean) } }).select("fullName email").lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  console.log(`Số đơn mồ côi: ${list.length}\n`);
  list.forEach((b) => {
    const u = b.userId ? userMap.get(String(b.userId)) : null;
    console.log(
      `${b.bookingNumber} | ${b.bookingDetails?.date} ${b.bookingDetails?.time} | ${b.bookingDetails?.partySize} kh | status=${b.status} | cọc ${b.pricing?.depositAmount} | restaurantId=${b.restaurantId || "null"} | khách=${u ? u.fullName : "(không có)"}`
    );
  });

  const completedOrphans = list.filter((b) => b.status === "completed");
  console.log(`\nCompleted: ${completedOrphans.length}, tổng cọc: ${completedOrphans.reduce((s, b) => s + (b.pricing?.depositAmount || 0), 0)}đ`);

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});