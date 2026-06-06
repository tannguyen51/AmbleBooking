const Partner = require("../models/partner");
const Restaurant = require("../models/restaurant");

/**
 * Kiểm tra subscription hết hạn mỗi giờ.
 * Partner premium quá 1 tháng sẽ tự động revert về pro.
 */
function startSubscriptionExpiryJob() {
  const check = async () => {
    try {
      const now = new Date();

      const expiredPartners = await Partner.find({
        subscriptionPackage: "premium",
        subscriptionExpiry: { $ne: null, $lte: now },
      });

      if (expiredPartners.length === 0) return;

      const ids = expiredPartners.map((p) => p._id);
      const restaurantIds = expiredPartners
        .map((p) => p.restaurantId)
        .filter(Boolean);

      await Partner.updateMany(
        { _id: { $in: ids } },
        { $set: { subscriptionPackage: "pro", subscriptionExpiry: null } }
      );

      if (restaurantIds.length > 0) {
        await Restaurant.updateMany(
          { _id: { $in: restaurantIds } },
          { $set: { subscriptionPackage: "pro" } }
        );
      }

      console.log(
        `[subscriptionExpiry] Reverted ${ids.length} expired premium partner(s) to pro`
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
