require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const User = require("../models/user");

const file = path.join(__dirname, "backup-deleted-spam-users-2026-08-13.json");
const { candidates } = JSON.parse(fs.readFileSync(file, "utf8"));

const hasVnMark = (s) => s && /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]/.test(s);
const vnLikely = candidates.filter(
  (u) => hasVnMark(u.fullName) || /\bviet|fpt|tdtu/i.test(u.email)
);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  let restored = 0;
  const errors = [];
  for (const u of vnLikely) {
    try {
      const tmpPassword = "Tmp" + crypto.randomBytes(6).toString("hex");
      await User.create({
        _id: u._id,
        fullName: u.fullName,
        email: u.email.toLowerCase(),
        phone: u.phone || "",
        authProvider: u.authProvider || "local",
        password: tmpPassword, // sẽ được pre-save hash; user phải đặt lại qua "Quên mật khẩu"
        isActive: u.isActive === undefined ? true : u.isActive,
        role: "customer",
        createdAt: u.createdAt,
        updatedAt: u.createdAt,
      });
      restored++;
    } catch (e) {
      errors.push(`${u.email}: ${e.message}`);
    }
  }

  console.log(`Đã khôi phục ${restored}/${vnLikely.length} tài khoản người Việt`);
  if (errors.length) {
    console.log("Lỗi:");
    errors.forEach((e) => console.log("  " + e));
  }

  const total = await User.countDocuments({});
  const active = await User.countDocuments({ isActive: true });
  console.log(`TOTAL now=${total}  ACTIVE now=${active}`);

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});