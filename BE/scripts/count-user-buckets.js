require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/user");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const total = await User.countDocuments({});
  const active = await User.countDocuments({ isActive: true });
  console.log(`TOTAL=${total}  ACTIVE=${active}\n`);

  const users = await User.find({ isActive: true })
    .select("fullName email createdAt")
    .sort({ createdAt: 1 })
    .lean();

  const SPECIAL = new RegExp("[^\\p{L}\\p{N}\\s.,_'@()\\-]", "u");
  const special = users.filter((u) => SPECIAL.test(u.fullName) || SPECIAL.test(u.email));
  const digitName = users.filter((u) => /^\d+$/.test(u.fullName.replace(/\s/g, "")));
  const testish = users.filter((u) => /(fake|test)/i.test(u.email + " " + u.fullName));

  // fullName thuần Latin (không dấu tiếng Việt, không ký tự đặc biệt)
  const latinOnly = users.filter((u) => /^[A-Za-z .'\-]+$/.test(u.fullName.trim()) && !/đ|Đ/.test(u.fullName));

  console.log(`special-char users: ${special.length}`);
  console.log(`digit-only name: ${digitName.length}`);
  console.log(`test/fake keyword: ${testish.length}`);
  console.log(`latin-only fullName (Vietnamese-acent marks excluded): ${latinOnly.length}`);

  // Phân bố theo ngày tạo (để nhìn làn sóng spam)
  const byDay = {};
  users.forEach((u) => {
    const d = u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : "?";
    byDay[d] = (byDay[d] || 0) + 1;
  });
  console.log("\nActive users created per day:");
  Object.entries(byDay).sort().forEach(([d, c]) => console.log(`  ${d}: ${c}`));

  // Emails có prefix toàn số/chuỗi ngẫu nhiên
  const numPrefix = users.filter((u) => /^[a-z0-9]{6,}\d+@/.test(u.email));
  console.log(`\nemail random-ish (long digits prefix): ${numPrefix.length}`);

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});