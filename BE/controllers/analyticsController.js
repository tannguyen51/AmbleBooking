const mongoose = require("mongoose");
const AnalyticsEvent = require("../models/analyticsEvent");
const DailyAnalytics = require("../models/dailyAnalytics");
const Booking = require("../models/booking");
const User = require("../models/user");

// ── Helpers ──────────────────────────────────────────────────

const getRestaurantId = (req) => {
  // Partner: từ token. Admin: từ query param
  return req.partner?.restaurantId || req.query.restaurantId || null;
};

const getDateRange = (from, to) => {
  const end = to ? new Date(to) : new Date();
  const start = from
    ? new Date(from)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

const buildEventFilter = (restaurantId, events, from, to) => {
  const filter = { restaurantId };
  if (events && events.length) {
    filter.event = { $in: Array.isArray(events) ? events : [events] };
  }
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to + "T23:59:59.999Z");
  }
  return filter;
};

// ── GET /api/partner/analytics/overview?from=&to= ────────────
exports.getOverview = async (req, res) => {
  try {
    const restaurantId = getRestaurantId(req);
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { start, end } = getDateRange(req.query.from, req.query.to);

    const [
      totalBookings,
      todayBookings,
      totalRevenue,
      cancelledBookings,
      completedBookings,
    ] = await Promise.all([
      Booking.countDocuments({
        restaurantId,
        createdAt: {
          $gte: new Date(start),
          $lte: new Date(end + "T23:59:59.999Z"),
        },
      }),
      Booking.countDocuments({ restaurantId, "bookingDetails.date": today }),
      Booking.aggregate([
        {
          $match: {
            restaurantId: new mongoose.Types.ObjectId(restaurantId),
            "payment.status": "paid",
          },
        },
        { $group: { _id: null, total: { $sum: "$pricing.totalAmount" } } },
      ]),
      Booking.countDocuments({
        restaurantId,
        status: "cancelled",
        createdAt: {
          $gte: new Date(start),
          $lte: new Date(end + "T23:59:59.999Z"),
        },
      }),
      Booking.countDocuments({
        restaurantId,
        status: "completed",
        createdAt: {
          $gte: new Date(start),
          $lte: new Date(end + "T23:59:59.999Z"),
        },
      }),
    ]);

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    return res.json({
      success: true,
      data: {
        totalBookings,
        todayBookings,
        totalRevenue: revenue,
        cancelledBookings,
        completedBookings,
        cancelRate:
          totalBookings > 0
            ? Math.round((cancelledBookings / totalBookings) * 100)
            : 0,
        completionRate:
          totalBookings > 0
            ? Math.round((completedBookings / totalBookings) * 100)
            : 0,
      },
    });
  } catch (err) {
    console.error("[analytics:overview]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/partner/analytics/users?from=&to= ───────────────
exports.getUserActivity = async (req, res) => {
  try {
    const restaurantId = getRestaurantId(req);
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);

    // Unique users who booked in period
    const bookingUsers = await Booking.distinct("userId", {
      restaurantId,
      createdAt: {
        $gte: new Date(start),
        $lte: new Date(end + "T23:59:59.999Z"),
      },
    });

    const totalUsers = bookingUsers.length;

    // New users (first booking ever in this period)
    const allUserBookings = await Booking.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          userId: {
            $in: bookingUsers.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
      { $group: { _id: "$userId", firstBooking: { $min: "$createdAt" } } },
    ]);

    const periodStart = new Date(start);
    const newUsers = allUserBookings.filter(
      (u) => u.firstBooking >= periodStart,
    ).length;
    const returningUsers = totalUsers - newUsers;

    // Daily active users
    const dailyActive = await Booking.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: {
            $gte: periodStart,
            $lte: new Date(end + "T23:59:59.999Z"),
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          users: { $addToSet: "$userId" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", activeUsers: { $size: "$users" } } },
    ]);

    return res.json({
      success: true,
      data: {
        totalUsers,
        newUsers,
        returningUsers,
        dailyActive: dailyActive.map((d) => ({ date: d.date, count: d.activeUsers })),
      },
    });
  } catch (err) {
    console.error("[analytics:users]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/partner/analytics/search?from=&to= ──────────────
exports.getSearchDiscovery = async (req, res) => {
  try {
    const restaurantId = getRestaurantId(req);
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);

    const searchEvents = await AnalyticsEvent.find(
      buildEventFilter(restaurantId, ["search"], start, end),
    ).lean();

    // Extract keywords from metadata
    const keywordMap = {};
    const searchUsers = new Set();
    searchEvents.forEach((e) => {
      if (e.metadata?.keyword) {
        const kw = e.metadata.keyword.toLowerCase();
        keywordMap[kw] = (keywordMap[kw] || 0) + 1;
      }
      if (e.userId) searchUsers.add(e.userId.toString());
    });

    const topKeywords = Object.entries(keywordMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));

    // View events
    const viewEvents = await AnalyticsEvent.countDocuments(
      buildEventFilter(restaurantId, ["restaurant_view"], start, end),
    );

    return res.json({
      success: true,
      data: {
        totalSearches: searchEvents.length,
        uniqueSearchUsers: searchUsers.size,
        topKeywords,
        searchToViewRate:
          searchEvents.length > 0
            ? Math.round((viewEvents / searchEvents.length) * 100)
            : 0,
      },
    });
  } catch (err) {
    console.error("[analytics:search]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/partner/analytics/funnel?from=&to= ──────────────
exports.getBookingFunnel = async (req, res) => {
  try {
    const restaurantId = getRestaurantId(req);
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);
    const startDate = new Date(start);
    const endDate = new Date(end + "T23:59:59.999Z");

    // Get funnel from events
    const events = await AnalyticsEvent.find(
      buildEventFilter(restaurantId, null, start, end),
    ).lean();

    const funnel = {
      restaurantViews: events.filter((e) => e.event === "restaurant_view").length,
      tableViews: events.filter((e) => e.event === "table_view").length,
      bookingStarted: events.filter((e) => e.event === "booking_start").length,
      bookingCompleted: events.filter((e) => e.event === "booking_complete").length,
    };

    // Get from actual bookings
    const bookingStatuses = await Booking.find({
      restaurantId,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .select("status")
      .lean();

    funnel.bookingConfirmed = bookingStatuses.filter((b) =>
      ["confirmed", "occupied", "completed"].includes(b.status),
    ).length;

    // Funnel conversion rates
    const funnelConversion = {
      viewToStart:
        funnel.restaurantViews > 0
          ? Math.round((funnel.bookingStarted / funnel.restaurantViews) * 100)
          : 0,
      startToBook:
        funnel.bookingStarted > 0
          ? Math.round((funnel.bookingCompleted / funnel.bookingStarted) * 100)
          : 0,
      bookToConfirm:
        funnel.bookingCompleted > 0
          ? Math.round((funnel.bookingConfirmed / funnel.bookingCompleted) * 100)
          : 0,
    };

    return res.json({
      success: true,
      data: { funnel, funnelConversion },
    });
  } catch (err) {
    console.error("[analytics:funnel]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/partner/analytics/tables?from=&to= ──────────────
exports.getTableSelection = async (req, res) => {
  try {
    const restaurantId = getRestaurantId(req);
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);

    const bookings = await Booking.find({
      restaurantId,
      createdAt: {
        $gte: new Date(start),
        $lte: new Date(end + "T23:59:59.999Z"),
      },
      status: { $nin: ["cancelled", "declined"] },
    })
      .populate("tableId", "type")
      .lean();

    const typeCount = { vip: 0, view: 0, regular: 0, standard: 0 };
    bookings.forEach((b) => {
      const t = b.tableId?.type || "regular";
      if (typeCount[t] !== undefined) typeCount[t]++;
    });

    const total = bookings.length || 1;
    const tableTypeRatio = {
      vip: Math.round((typeCount.vip / total) * 100),
      view: Math.round((typeCount.view / total) * 100),
      regular: Math.round((typeCount.regular / total) * 100),
      standard: Math.round((typeCount.standard / total) * 100),
    };

    return res.json({
      success: true,
      data: {
        vipTableBookings: typeCount.vip,
        standardTableBookings: typeCount.standard,
        totalBookings: bookings.length,
        tableTypeRatio,
      },
    });
  } catch (err) {
    console.error("[analytics:tables]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/partner/analytics/cancellation?from=&to= ────────
exports.getCancellationMetrics = async (req, res) => {
  try {
    const restaurantId = getRestaurantId(req);
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);

    const allBookings = await Booking.find({
      restaurantId,
      createdAt: {
        $gte: new Date(start),
        $lte: new Date(end + "T23:59:59.999Z"),
      },
    })
      .select("status cancellationReason createdAt bookingDetails")
      .lean();

    const total = allBookings.length;
    const cancelled = allBookings.filter((b) => b.status === "cancelled").length;
    const noShow = allBookings.filter((b) => b.status === "no_show").length;

    // Cancel reasons
    const reasonMap = {};
    allBookings
      .filter((b) => b.status === "cancelled" && b.cancellationReason)
      .forEach((b) => {
        const r = b.cancellationReason || "Không rõ lý do";
        reasonMap[r] = (reasonMap[r] || 0) + 1;
      });

    const cancelReasons = Object.entries(reasonMap)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count }));

    return res.json({
      success: true,
      data: {
        totalCancelled: cancelled,
        totalNoShow: noShow,
        cancelRate:
          total > 0 ? Math.round((cancelled / total) * 100) : 0,
        noShowRate:
          total > 0 ? Math.round((noShow / total) * 100) : 0,
        cancelReasons,
      },
    });
  } catch (err) {
    console.error("[analytics:cancellation]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/partner/analytics/peak-hours?from=&to= ──────────
exports.getPeakHours = async (req, res) => {
  try {
    const restaurantId = getRestaurantId(req);
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);

    const bookings = await Booking.find({
      restaurantId,
      "bookingDetails.date": { $gte: start, $lte: end },
      status: { $nin: ["cancelled", "declined"] },
    })
      .select("bookingDetails")
      .lean();

    // Build heatmap: hour x dayOfWeek
    const heatmap = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        heatmap.push({ dayOfWeek: d, hour: h, bookings: 0 });
      }
    }

    bookings.forEach((b) => {
      const dateStr = b.bookingDetails?.date;
      const timeStr = b.bookingDetails?.time;
      if (dateStr && timeStr) {
        const d = new Date(dateStr + "T" + timeStr);
        if (!isNaN(d.getTime())) {
          const dayOfWeek = d.getDay();
          const hour = parseInt(timeStr.split(":")[0], 10);
          const cell = heatmap.find(
            (h) => h.dayOfWeek === dayOfWeek && h.hour === hour,
          );
          if (cell) cell.bookings++;
        }
      }
    });

    // Peak hours (top hours with most bookings)
    const peakHours = [...heatmap]
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10)
      .filter((h) => h.bookings > 0);

    return res.json({
      success: true,
      data: {
        heatmap,
        peakHours,
        totalBookingsInRange: bookings.length,
      },
    });
  } catch (err) {
    console.error("[analytics:peak-hours]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/partner/analytics/ai?from=&to= ──────────────────
exports.getAIMetrics = async (req, res) => {
  try {
    const restaurantId = getRestaurantId(req);
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);

    const aiStarts = await AnalyticsEvent.countDocuments(
      buildEventFilter(restaurantId, ["ai_chat_start"], start, end),
    );
    const aiCompletes = await AnalyticsEvent.countDocuments(
      buildEventFilter(restaurantId, ["ai_chat_complete"], start, end),
    );

    const aiUserEvents = await AnalyticsEvent.distinct(
      "userId",
      buildEventFilter(restaurantId, ["ai_chat_start", "ai_chat_complete"], start, end),
    );

    return res.json({
      success: true,
      data: {
        totalChats: aiStarts,
        uniqueUsers: aiUserEvents.filter((id) => id).length,
        completedBookings: aiCompletes,
        conversionRate:
          aiStarts > 0 ? Math.round((aiCompletes / aiStarts) * 100) : 0,
      },
    });
  } catch (err) {
    console.error("[analytics:ai]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── POST /api/analytics/event ────────────────────────────────
exports.recordEvent = async (req, res) => {
  try {
    const { restaurantId, event, userId, sessionId, metadata } = req.body;
    if (!restaurantId || !event) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    await AnalyticsEvent.create({
      restaurantId,
      event,
      userId: userId || null,
      sessionId: sessionId || "",
      metadata: metadata || {},
      timestamp: new Date(),
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("[analytics:record]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
