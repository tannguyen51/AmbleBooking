require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const User = require("../models/user");
  const Booking = require("../models/booking");
  const Survey = require("../models/surveyResponse");
  const Review = require("../models/review");
  const Partner = require("../models/partner");
  const Restaurant = require("../models/restaurant");
  const AnalyticsEvent = require("../models/analyticsEvent");

  const [totalU, activeU, bookingTotal, survey, reviews, partners, restaurants, analytics] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ isActive: true }),
    Booking.countDocuments({}),
    Survey.countDocuments({}),
    Review.countDocuments({}),
    Partner.countDocuments({}),
    Restaurant.countDocuments({}),
    AnalyticsEvent.countDocuments({}),
  ]);
  const byStatus = await Booking.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
  const restaurantsList = await Restaurant.find({}, "name").lean();

  console.log(JSON.stringify({
    users: { total: totalU, active: activeU },
    bookings: { total: bookingTotal, byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])) },
    surveys: survey,
    reviews,
    analyticsEvents: analytics,
    partners,
    restaurants: { count: restaurants, names: restaurantsList.map((r) => r.name) },
  }, null, 2));

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});