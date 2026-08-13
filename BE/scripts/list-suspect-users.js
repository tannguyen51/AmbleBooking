require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/user");

// ký tự hợp lệ: mọi chữ cái (kể cả tiếng Việt có dấu) \p{L}, chữ số \p{N}, khoảng trắng + vài ký tự thông dụng
const SPECIAL = new RegExp("[^\\p{L}\\p{N}\\s.,_'@()\\-]", "u");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const total = await User.countDocuments({});
  const active = await User.countDocuments({ isActive: true });
  console.log(`TOTAL users: ${total}`);
  console.log(`ACTIVE users: ${active}\n`);

  const users = await User.find({ isActive: true })
    .select("fullName email phone authProvider createdAt")
    .sort({ createdAt: 1 })
    .lean();

  const special = users.filter(
    (u) => SPECIAL.test(u.fullName) || SPECIAL.test(u.email)
  );
  const shortName = users.filter((u) => u.fullName.trim().length < 3);
  const digitsOnly = users.filter((u) => /^\d+$/.test(u.fullName.replace(/\s/g, "")));
  const testLike = users.filter(
    (u) => /(test|fake|spam|demo|user\d+|nguoidung\d+)/i.test(u.email + " " + u.fullName)
  );

  console.log(`-- KÝ TỰ ĐẶC BIỆT (${special.length}) --`);
  special.forEach((u) => console.log(`  ${u._id} | ${u.fullName} | ${u.email}`));

  console.log(`\n-- TÊN NGẮN <3 ký tự (${shortName.length}) --`);
  shortName.forEach((u) => console.log(`  ${u._id} | ${u.fullName} | ${u.email}`));

  console.log(`\n-- TÊN CHỈ SỐ (${digitsOnly.length}) --`);
  digitsOnly.forEach((u) => console.log(`  ${u._id} | ${u.fullName} | ${u.email}`));

  console.log(`\n-- NGHI TEST/FAKE (${testLike.length}) --`);
  testLike.forEach((u) => console.log(`  ${u._id} | ${u.fullName} | ${u.email}`));

  console.log(`\n-- TOÀN BỘ ACTIVE (${users.length}) để xem lại --`);
  users.forEach((u) => console.log(`  ${u._id} | ${u.fullName} | ${u.email}`));

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});