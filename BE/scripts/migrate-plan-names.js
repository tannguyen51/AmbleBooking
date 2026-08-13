require("dotenv").config();
const mongoose = require("mongoose");
const Partner = require("../models/partner");
const Restaurant = require("../models/restaurant");
const PartnerPayment = require("../models/partnerPayment");

// Migration một lần: đổi tên gói đăng ký
//   pro -> basic, premium -> standard
// (đồng bộ với model enum mới ['basic','standard'])
async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const Model of [Partner, Restaurant, PartnerPayment]) {
    const toBasic = await Model.updateMany(
      { subscriptionPackage: "pro" },
      { $set: { subscriptionPackage: "basic" } }
    );
    const toStandard = await Model.updateMany(
      { subscriptionPackage: "premium" },
      { $set: { subscriptionPackage: "standard" } }
    );
    console.log(
      `[${Model.modelName}] pro->basic: ${toBasic.modifiedCount}, premium->standard: ${toStandard.modifiedCount}`
    );
  }

  // Dữ liệu đối tác hiện có: coi là tài khoản vĩnh viễn (không bao giờ khóa)
  const permanent = await Partner.updateMany({}, { $set: { isPermanent: true } });
  console.log(`[Partner] set isPermanent=true cho ${permanent.modifiedCount} tài khoản`);

  // Các tài khoản đang standard đã hết hạn từ trước → để job chạy tự revert+khóa, không xử lý tại đây

  const remaining = await PartnerPayment.countDocuments({
    subscriptionPackage: { $in: ["pro", "premium"] },
  });
  if (remaining > 0) {
    console.warn(`⚠  Còn ${remaining} bản ghi PartnerPayment chưa cập nhật`);
  } else {
    console.log("✔  Không còn bản ghi dùng tên gói cũ");
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});