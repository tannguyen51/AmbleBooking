const User = require("../models/user");
const Partner = require("../models/partner");
const Restaurant = require("../models/restaurant");
const Booking = require("../models/booking");
const Table = require("../models/table");
const Route = require("../models/route");
const AdminAudit = require("../models/adminAudit");

const BOOKING_STATUSES = [
  "draft",
  "pending",
  "pending_payment",
  "confirmed",
  "paid",
  "completed",
  "cancelled",
  "refund_pending",
  "refunded",
];

const parseBool = (value) => {
  if (value === true || value === false) return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
};

const buildRegex = (value) => new RegExp(String(value || "").trim(), "i");

const logAudit = async ({ actorId, action, targetType, targetId, meta }) => {
  try {
    await AdminAudit.create({
      actorId,
      action,
      targetType,
      targetId,
      meta: meta || {},
    });
  } catch (err) {
    console.error("[admin/logAudit]", err);
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [
      totalUsers,
      activeUsers,
      partnersPending,
      partnersActive,
      restaurantsActive,
      bookingsToday,
      pendingPayments,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      Partner.countDocuments({ subscriptionStatus: "pending" }),
      Partner.countDocuments({ subscriptionStatus: "active", isActive: true }),
      Restaurant.countDocuments({ isActive: true }),
      Booking.countDocuments({
        "bookingDetails.date": today,
        status: { $in: ["pending", "pending_payment", "confirmed", "paid"] },
      }),
      Booking.countDocuments({ status: "pending_payment" }),
    ]);

    return res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        partnersPending,
        partnersActive,
        restaurantsActive,
        bookingsToday,
        pendingPayments,
      },
    });
  } catch (err) {
    console.error("[admin/getDashboard]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { search, role, isActive, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (role) filter.role = role;
    const isActiveBool = parseBool(isActive);
    if (isActiveBool !== undefined) filter.isActive = isActiveBool;

    if (search) {
      const regex = buildRegex(search);
      filter.$or = [
        { fullName: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNumber - 1) * limitNumber;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      users,
      page: pageNumber,
      limit: limitNumber,
      total,
    });
  } catch (err) {
    console.error("[admin/getUsers]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user });
  } catch (err) {
    console.error("[admin/getUserById]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateUserActive = async (req, res) => {
  try {
    const { isActive } = req.body;
    const isActiveBool = parseBool(isActive);
    if (isActiveBool === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "isActive required" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: isActiveBool },
      { new: true },
    ).lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user });
  } catch (err) {
    console.error("[admin/updateUserActive]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !["customer", "admin"].includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: "Role invalid" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true },
    ).lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await logAudit({
      actorId: req.user._id,
      action: "user.role.updated",
      targetType: "user",
      targetId: user._id,
      meta: { role },
    });

    return res.json({ success: true, user });
  } catch (err) {
    console.error("[admin/updateUserRole]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.adjustUserRewards = async (req, res) => {
  try {
    const { points, title, type } = req.body;
    const value = Number(points);

    if (!Number.isFinite(value)) {
      return res
        .status(400)
        .json({ success: false, message: "Points invalid" });
    }

    if (!title || !String(title).trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Title required" });
    }

    if (!type || !["earn", "redeem"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Type invalid" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const nextPoints = Math.max(0, Number(user.rewardPoints || 0) + value);
    user.rewardPoints = nextPoints;
    user.rewardHistory.push({
      title: String(title).trim(),
      points: value,
      type,
    });

    await user.save();

    await logAudit({
      actorId: req.user._id,
      action: "user.rewards.adjusted",
      targetType: "user",
      targetId: user._id,
      meta: { points: value, title: String(title).trim(), type },
    });

    return res.json({ success: true, user });
  } catch (err) {
    console.error("[admin/adjustUserRewards]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getPartners = async (req, res) => {
  try {
    const { status, search, isActive } = req.query;
    const filter = {};

    if (status) filter.subscriptionStatus = status;
    const isActiveBool = parseBool(isActive);
    if (isActiveBool !== undefined) filter.isActive = isActiveBool;

    if (search) {
      const regex = buildRegex(search);
      filter.$or = [
        { ownerName: regex },
        { email: regex },
        { restaurantName: regex },
        { phone: regex },
      ];
    }

    const partners = await Partner.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, partners });
  } catch (err) {
    console.error("[admin/getPartners]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.approvePartner = async (req, res) => {
  try {
    const { subscriptionPackage, subscriptionExpiry, note } = req.body;

    const update = {
      subscriptionStatus: "active",
      isActive: true,
      approvalNote: String(note || "").trim(),
      approvedAt: new Date(),
      approvedBy: req.user._id,
      rejectionReason: "",
      rejectedAt: null,
      rejectedBy: null,
    };

    if (subscriptionPackage) {
      update.subscriptionPackage = subscriptionPackage;
    }
    if (subscriptionExpiry) {
      update.subscriptionExpiry = new Date(subscriptionExpiry);
    }

    const partner = await Partner.findByIdAndUpdate(req.params.id, update, {
      new: true,
    }).lean();

    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    await logAudit({
      actorId: req.user._id,
      action: "partner.approved",
      targetType: "partner",
      targetId: partner._id,
      meta: { note: update.approvalNote, subscriptionPackage: update.subscriptionPackage },
    });

    return res.json({ success: true, partner });
  } catch (err) {
    console.error("[admin/approvePartner]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.rejectPartner = async (req, res) => {
  try {
    const { reason } = req.body;
    const rejectionReason = String(reason || "").trim();
    if (!rejectionReason) {
      return res
        .status(400)
        .json({ success: false, message: "Rejection reason required" });
    }

    const partner = await Partner.findByIdAndUpdate(
      req.params.id,
      {
        subscriptionStatus: "cancelled",
        isActive: false,
        rejectionReason,
        rejectedAt: new Date(),
        rejectedBy: req.user._id,
        approvalNote: "",
        approvedAt: null,
        approvedBy: null,
      },
      { new: true },
    ).lean();

    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    await logAudit({
      actorId: req.user._id,
      action: "partner.rejected",
      targetType: "partner",
      targetId: partner._id,
      meta: { reason: rejectionReason },
    });

    return res.json({ success: true, partner });
  } catch (err) {
    console.error("[admin/rejectPartner]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updatePartnerActive = async (req, res) => {
  try {
    const { isActive } = req.body;
    const isActiveBool = parseBool(isActive);
    if (isActiveBool === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "isActive required" });
    }

    const partner = await Partner.findByIdAndUpdate(
      req.params.id,
      { isActive: isActiveBool },
      { new: true },
    ).lean();

    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    return res.json({ success: true, partner });
  } catch (err) {
    console.error("[admin/updatePartnerActive]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getRestaurants = async (req, res) => {
  try {
    const { search, city, cuisine, isActive, isFeatured, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (city) filter.city = buildRegex(city);
    if (cuisine) filter.cuisine = buildRegex(cuisine);

    const isActiveBool = parseBool(isActive);
    if (isActiveBool !== undefined) filter.isActive = isActiveBool;

    const isFeaturedBool = parseBool(isFeatured);
    if (isFeaturedBool !== undefined) filter.isFeatured = isFeaturedBool;

    if (search) {
      const regex = buildRegex(search);
      filter.$or = [
        { name: regex },
        { address: regex },
        { city: regex },
        { tags: regex },
      ];
    }

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNumber - 1) * limitNumber;

    const [restaurants, total] = await Promise.all([
      Restaurant.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Restaurant.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      restaurants,
      page: pageNumber,
      limit: limitNumber,
      total,
    });
  } catch (err) {
    console.error("[admin/getRestaurants]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateRestaurant = async (req, res) => {
  try {
    const payload = { ...req.body };
    delete payload._id;
    delete payload.partnerId;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true },
    ).lean();

    if (!restaurant) {
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });
    }

    return res.json({ success: true, restaurant });
  } catch (err) {
    console.error("[admin/updateRestaurant]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.setRestaurantFeatured = async (req, res) => {
  try {
    const { isFeatured } = req.body;
    const featuredBool = parseBool(isFeatured);
    if (featuredBool === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "isFeatured required" });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { isFeatured: featuredBool },
      { new: true },
    ).lean();

    if (!restaurant) {
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });
    }

    return res.json({ success: true, restaurant });
  } catch (err) {
    console.error("[admin/setRestaurantFeatured]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.setRestaurantActive = async (req, res) => {
  try {
    const { isActive } = req.body;
    const activeBool = parseBool(isActive);
    if (activeBool === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "isActive required" });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { isActive: activeBool },
      { new: true },
    ).lean();

    if (!restaurant) {
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });
    }

    return res.json({ success: true, restaurant });
  } catch (err) {
    console.error("[admin/setRestaurantActive]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const { status, search, date, restaurantId, userId, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (date) filter["bookingDetails.date"] = date;
    if (restaurantId) filter.restaurantId = restaurantId;
    if (userId) filter.userId = userId;

    if (search) {
      const regex = buildRegex(search);
      filter.$or = [
        { bookingNumber: regex },
        { "bookingDetails.time": regex },
      ];
    }

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNumber - 1) * limitNumber;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
      .populate("userId", "fullName email phone")
      .populate("restaurantId", "name city")
      .populate("tableId", "name type")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),
      Booking.countDocuments(filter),
    ]);

    return res.json({ success: true, bookings, page: pageNumber, limit: limitNumber, total });
  } catch (err) {
    console.error("[admin/getBookings]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { status, reason, paymentMethod, transactionId } = req.body;

    if (!status || !BOOKING_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Status invalid" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    booking.status = status;

    if (status === "confirmed") {
      booking.confirmedAt = new Date();
    }

    if (status === "cancelled") {
      booking.cancelledAt = new Date();
      booking.cancellationReason = reason || "Admin override";
    }

    if (status === "paid") {
      booking.payment = {
        ...(booking.payment || {}),
        method: paymentMethod || booking.payment?.method || "bank",
        transactionId:
          transactionId || booking.payment?.transactionId || `ADM-${Date.now()}`,
        paidAt: booking.payment?.paidAt || new Date(),
      };
    }

    if (status === "refunded") {
      booking.refund = {
        ...(booking.refund || {}),
        refundedAt: new Date(),
        refundAmount:
          booking.refund?.refundAmount || booking.pricing?.depositAmount || 0,
      };
    }

    await booking.save();

    await logAudit({
      actorId: req.user._id,
      action: "booking.status.updated",
      targetType: "booking",
      targetId: booking._id,
      meta: { status, reason: reason || "", paymentMethod: paymentMethod || "" },
    });

    if (["cancelled", "refund_pending", "refunded"].includes(status)) {
      await Table.findByIdAndUpdate(booking.tableId, {
        isAvailable: true,
        currentBookingId: null,
      });
    } else if (["confirmed", "paid", "completed"].includes(status)) {
      await Table.findByIdAndUpdate(booking.tableId, {
        isAvailable: false,
        currentBookingId: booking._id,
      });
    }

    return res.json({ success: true, booking });
  } catch (err) {
    console.error("[admin/updateBookingStatus]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { action, targetType, targetId, limit = 50 } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    if (targetId) filter.targetId = targetId;

    const logs = await AdminAudit.find(filter)
      .populate("actorId", "fullName email")
      .sort({ createdAt: -1 })
      .limit(Math.min(200, Math.max(1, Number(limit) || 50)))
      .lean();

    return res.json({ success: true, logs });
  } catch (err) {
    console.error("[admin/getAuditLogs]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getRoutes = async (req, res) => {
  try {
    const routes = await Route.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, routes });
  } catch (err) {
    console.error("[admin/getRoutes]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.createRoute = async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      distance,
      duration,
      difficulty,
      image,
      tags,
      isPopular,
      rating,
      reviewCount,
    } = req.body;

    if (!name || !location || !distance || !duration) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const route = await Route.create({
      name: String(name).trim(),
      description: String(description || "").trim(),
      location: String(location).trim(),
      distance: Number(distance),
      duration: Number(duration),
      difficulty: difficulty || "easy",
      image: String(image || "").trim(),
      tags: Array.isArray(tags) ? tags : [],
      isPopular: !!isPopular,
      rating: Number.isFinite(Number(rating)) ? Number(rating) : 0,
      reviewCount: Number.isFinite(Number(reviewCount))
        ? Number(reviewCount)
        : 0,
    });

    return res.status(201).json({ success: true, route });
  } catch (err) {
    console.error("[admin/createRoute]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateRoute = async (req, res) => {
  try {
    const payload = { ...req.body };
    delete payload._id;

    const route = await Route.findByIdAndUpdate(req.params.id, payload, {
      new: true,
    }).lean();

    if (!route) {
      return res
        .status(404)
        .json({ success: false, message: "Route not found" });
    }

    return res.json({ success: true, route });
  } catch (err) {
    console.error("[admin/updateRoute]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteRoute = async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id).lean();
    if (!route) {
      return res
        .status(404)
        .json({ success: false, message: "Route not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("[admin/deleteRoute]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
