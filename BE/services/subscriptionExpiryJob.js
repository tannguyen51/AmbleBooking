const Partner = require("../models/partner");
const Restaurant = require("../models/restaurant");

/**
 * Kiểm tra subscription hết hạn mỗi giờ.
 * Partner standard quá 1 tháng sẽ tự động revert về basic.
 */
function startSubscriptionExpiryJob() {
  const check = async () => {
    try {
      const now = new Date();

      const expiredPartners = await Partner.find({
        subscriptionPackage: "standard",
        subscriptionExpiry: { $ne: null, $lte: now },
      });

      if (expiredPartners.length === 0) return;

      const ids = expiredPartners.map((p) => p._id);
      const restaurantIds = expiredPartners
        .map((p) => p.restaurantId)
        .filter(Boolean);

      await Partner.updateMany(
        { _id: { $in: ids } },
        { $set: { subscriptionPackage: "basic", subscriptionExpiry: null } }
      );

      if (restaurantIds.length > 0) {
        await Restaurant.updateMany(
          { _id: { $in: restaurantIds } },
          { $set: { subscriptionPackage: "basic" } }
        );
      }

      // Tài khoản tạm (chưa mua quyền vĩnh viễn): khóa account
      const tempLocked = await Partner.updateMany(
        { _id: { $in: ids }, isPermanent: { $ne: true } },
        { $set: { subscriptionStatus: "expired", isActive: false } }
      );

      console.log(
        `[subscriptionExpiry] Reverted ${ids.length} expired standard partner(s) to basic; locked ${tempLocked.modifiedCount} temporary account(s)`
      );
    } catch (err) {
      console.error("[subscriptionExpiry] Job error:", err.message);
    }
  };

  check();
  setInterval(check, 60 * 60 * 1000);
  console.log("[subscriptionExpiry] Expiry check job started (checks hourly)");
}

module.exports = { startSubscriptionExpiryJob };
