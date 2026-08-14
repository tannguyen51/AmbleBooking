const mongoose = require("mongoose");
const AnalyticsEvent = require("../models/analyticsEvent");
const DailyAnalytics = require("../models/dailyAnalytics");
const Booking = require("../models/booking");
const User = require("../models/user");

// ── Helpers ──────────────────────────────────────────────────

const getRestaurantId = (req) => {
  return req.partner?.restaurantId || req.query.restaurantId || null;
};

const getRestaurantFilter = (req) => {
  const rid = getRestaurantId(req);
  return rid ? { restaurantId: rid } : {};
};

// ════════════════════════════════════════════════════════════════════
// TẠM THỜI: Dữ liệu demo cho ADMIN analytics — app hiện chỉ có 1 quán
// (Mì Cay Seoul) nên các con số được chốt thống nhất:
//   103 active users · 92 bookings · 50 survey · funnel 268/128/92/92/92 …
// Khi dữ liệu thật đầy đủ → DỄ dùng số thật: đổi TEMP_DEMO_MODE=false rồi
// xóa 2 function isTempDemo() + tempReply() và các dòng early-return bên dưới.
// ════════════════════════════════════════════════════════════════════
const TEMP_DEMO_MODE = true;

function isTempDemo(req) {
  return TEMP_DEMO_MODE && !req.partner && !req.query.restaurantId;
}
function tempReply(res, data) {
  return res.json({ success: true, data });
}

const TEMP_ANALYTICS = {
  overview: {
    totalBookings: 92,
    todayBookings: 0,
    totalRevenue: 0,
    cancelledBookings: 0,
    completedBookings: 81,
    confirmedBookings: 92,
    totalUsers: 103,
    newUsers: 64,
    peakHour: "19:00",
    popularTableType: "Standard (78%)",
    cancelRate: 0,
    completionRate: 88,
  },
  users: {
    totalUsers: 103,
    newUsers: 64,
    returningUsers: 39,
    dailyActive: [
      { date: "2026-08-07", count: 21 },
      { date: "2026-08-08", count: 25 },
      { date: "2026-08-09", count: 30 },
      { date: "2026-08-10", count: 33 },
      { date: "2026-08-11", count: 29 },
      { date: "2026-08-12", count: 35 },
      { date: "2026-08-13", count: 38 },
    ],
  },
  funnel: {
    funnel: {
      restaurantViews: 268,
      tableViews: 128,
      bookingStarted: 92,
      bookingCompleted: 92,
      bookingConfirmed: 92,
      bookingCompletedReal: 81,
    },
    funnelConversion: {
      viewToTable: 48,
      tableToStart: 72,
      viewToStart: 34,
      startToBook: 100,
      bookToConfirm: 100,
      startToConfirm: 100,
      confirmToComplete: 88,
    },
  },
  tables: {
    vipTableBookings: 7,
    viewTableBookings: 13,
    standardTableBookings: 72,
    totalBookings: 92,
    tableTypeRatio: { vip: 8, view: 14, regular: 0, standard: 78 },
    totalTableViewClicks: 128,
  },
  cancel: {
    totalCancelled: 0,
    totalNoShow: 0,
    cancelRate: 0,
    noShowRate: 0,
    cancelReasons: [],
  },
  ai: {
    totalChats: 51,
    uniqueUsers: 38,
    completedBookings: 16,
    conversionRate: 31,
    commonRequests: [
      { text: "Quán gần đây", count: 12 },
      { text: "Mì cay", count: 9 },
      { text: "Korean food", count: 7 },
      { text: "Quận 12", count: 6 },
      { text: "Quán cho nhóm", count: 5 },
      { text: "Quán đi date", count: 4 },
      { text: "Còn bàn tối nay", count: 3 },
    ],
  },
  engagement: {
    totalFavorites: 27,
    totalReviews: 18,
    photoReviews: 6,
    rewardPointsUsed: 0,
    rewardPointsEarned: 0,
    depositWarningViews: 0,
    aiRecommendClicks: 29,
    filterUsage: [],
  },
  peak: {
    // Tổng heatmap = 92 bookings: 4+6+10+22+26+18+6
    heatmap: [
      { dayOfWeek: 0, hour: 11, bookings: 4 },
      { dayOfWeek: 0, hour: 12, bookings: 6 },
      { dayOfWeek: 0, hour: 17, bookings: 10 },
      { dayOfWeek: 0, hour: 18, bookings: 22 },
      { dayOfWeek: 0, hour: 19, bookings: 26 },
      { dayOfWeek: 0, hour: 20, bookings: 18 },
      { dayOfWeek: 0, hour: 21, bookings: 6 },
    ],
    peakHours: [
      { dayOfWeek: 0, hour: 19, bookings: 26 },
      { dayOfWeek: 0, hour: 18, bookings: 22 },
      { dayOfWeek: 0, hour: 20, bookings: 18 },
      { dayOfWeek: 0, hour: 17, bookings: 10 },
      { dayOfWeek: 0, hour: 12, bookings: 6 },
      { dayOfWeek: 0, hour: 21, bookings: 6 },
      { dayOfWeek: 0, hour: 11, bookings: 4 },
    ],
    totalBookingsInRange: 92,
  },
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
  const filter = {};
  if (restaurantId) filter.restaurantId = restaurantId;
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
    if (isTempDemo(req)) return tempReply(res, TEMP_ANALYTICS.overview);
    const restaurantId = getRestaurantId(req);
    const rFilter = getRestaurantFilter(req);
    if (!restaurantId && req.partner) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { start, end } = getDateRange(req.query.from, req.query.to);
    const startDate = new Date(start);
    const endDate = new Date(end + "T23:59:59.999Z");

    const [
      totalBookings,
      todayBookings,
      totalRevenue,
      cancelledBookings,
      completedBookings,
    ] = await Promise.all([
      Booking.countDocuments({ ...rFilter,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      Booking.countDocuments({ ...rFilter, "bookingDetails.date": today }),
      Booking.aggregate([
        {
          $match: {
            ...rFilter,
            "payment.status": "paid",
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, total: { $sum: "$pricing.totalAmount" } } },
      ]),
      Booking.countDocuments({ ...rFilter,
        status: "cancelled",
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      Booking.countDocuments({ ...rFilter,
        status: "completed",
        createdAt: { $gte: startDate, $lte: endDate },
      }),
    ]);

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    // ── Additional data for Highlights section ──
    const [
      confirmedBookings,
      totalUsersResult,
      newUsersResult,
      peakHourResult,
      tableTypeResult,
    ] = await Promise.all([
      // confirmed/occupied bookings
      Booking.countDocuments({ ...rFilter,
        status: { $in: ["confirmed", "occupied"] },
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      // total unique users
      Booking.distinct("userId", { ...rFilter,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      // new users (first booking in period)
      Booking.aggregate([
        { $match: { ...rFilter, createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: "$userId", firstBooking: { $min: "$createdAt" } } },
        { $match: { firstBooking: { $gte: startDate } } },
        { $count: "count" },
      ]),
      // peak hour (most booked time slot)
      Booking.aggregate([
        { $match: { ...rFilter, "bookingDetails.date": { $gte: start, $lte: end }, status: { $nin: ["cancelled", "declined"] } } },
        { $group: { _id: "$bookingDetails.time", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
      // popular table type
      Booking.aggregate([
        { $match: { ...rFilter, createdAt: { $gte: startDate, $lte: endDate }, status: { $nin: ["cancelled", "declined"] } } },
        {
          $lookup: { from: "tables", localField: "tableId", foreignField: "_id", as: "table" },
        },
        { $unwind: { path: "$table", preserveNullAndEmptyArrays: true } },
        { $group: { _id: "$table.type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const totalUsers = totalUsersResult.length;
    const newUsersCount = newUsersResult.length > 0 ? newUsersResult[0].count : 0;
    const peakHour = peakHourResult.length > 0 ? peakHourResult[0]._id || "--" : "--";

    // Map table type to Vietnamese
    const typeMap = { vip: "VIP", view: "Bàn view", standard: "Standard", regular: "Standard" };
    let popularTable = "--";
    if (tableTypeResult.length > 0) {
      const totalTableBookings = tableTypeResult.reduce((sum, t) => sum + t.count, 0);
      const top = tableTypeResult[0];
      const pct = totalTableBookings > 0 ? Math.round((top.count / totalTableBookings) * 100) : 0;
      popularTable = `${typeMap[top._id] || top._id || "--"} (${pct}%)`;
    }

    return res.json({
      success: true,
      data: {
        totalBookings,
        todayBookings,
        totalRevenue: revenue,
        cancelledBookings,
        completedBookings,
        confirmedBookings,
        totalUsers,
        newUsers: newUsersCount,
        peakHour,
        popularTableType: popularTable,
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
    if (isTempDemo(req)) return tempReply(res, TEMP_ANALYTICS.users);
    const restaurantId = getRestaurantId(req);
    const rFilter = getRestaurantFilter(req);
    if (!restaurantId && req.partner) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);

    // Unique users who booked in period
    const bookingUsers = await Booking.distinct("userId", { ...rFilter,
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
          ...rFilter,
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
          ...rFilter,
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
    const rFilter = getRestaurantFilter(req);
    if (!restaurantId && req.partner) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);

    const searchEvents = await AnalyticsEvent.find(
      buildEventFilter(restaurantId || null, ["search"], start, end),
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
      buildEventFilter(restaurantId || null, ["restaurant_view"], start, end),
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
    if (isTempDemo(req)) return tempReply(res, TEMP_ANALYTICS.funnel);
    const restaurantId = getRestaurantId(req);
    const rFilter = getRestaurantFilter(req);
    if (!restaurantId && req.partner) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);
    const startDate = new Date(start);
    const endDate = new Date(end + "T23:59:59.999Z");

    // Get funnel from events
    const events = await AnalyticsEvent.find(
      buildEventFilter(restaurantId || null, null, start, end),
    ).lean();

    const funnel = {
      restaurantViews: events.filter((e) => e.event === "restaurant_view").length,
      tableViews: events.filter((e) => e.event === "table_view").length,
      bookingStarted: events.filter((e) => e.event === "booking_start").length,
      bookingCompleted: events.filter((e) => e.event === "booking_complete").length,
    };

    // Get from actual bookings
    const bookingStatuses = await Booking.find({ ...rFilter,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .select("status")
      .lean();

    funnel.bookingConfirmed = bookingStatuses.filter((b) =>
      ["confirmed", "occupied", "completed"].includes(b.status),
    ).length;
    // Counts from actual booking statuses (same source for accurate conversion)
    const confirmedOnly = bookingStatuses.filter((b) =>
      ["confirmed", "occupied"].includes(b.status),
    ).length;
    const completedFromBookings = bookingStatuses.filter((b) =>
      b.status === "completed",
    ).length;
    funnel.bookingCompletedReal = completedFromBookings;

    // Funnel conversion rates
    const funnelConversion = {
      viewToTable:
        funnel.restaurantViews > 0
          ? Math.round((funnel.tableViews / funnel.restaurantViews) * 100)
          : 0,
      tableToStart:
        funnel.tableViews > 0
          ? Math.round((funnel.bookingStarted / funnel.tableViews) * 100)
          : 0,
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
      startToConfirm:
        funnel.bookingStarted > 0
          ? Math.round((funnel.bookingConfirmed / funnel.bookingStarted) * 100)
          : 0,
      confirmToComplete:
        funnel.bookingConfirmed > 0
          ? Math.round((completedFromBookings / funnel.bookingConfirmed) * 100)
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
    if (isTempDemo(req)) return tempReply(res, TEMP_ANALYTICS.tables);
    const restaurantId = getRestaurantId(req);
    const rFilter = getRestaurantFilter(req);
    if (!restaurantId && req.partner) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);

    const bookings = await Booking.find({ ...rFilter,
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

    // Table view clicks
    const totalTableViewClicks = await AnalyticsEvent.countDocuments(
      buildEventFilter(restaurantId || null, ["table_view_click"], start, end),
    );

    return res.json({
      success: true,
      data: {
        vipTableBookings: typeCount.vip,
        viewTableBookings: typeCount.view,
        standardTableBookings: typeCount.standard,
        totalBookings: bookings.length,
        tableTypeRatio,
        totalTableViewClicks,
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
    if (isTempDemo(req)) return tempReply(res, TEMP_ANALYTICS.cancel);
    const restaurantId = getRestaurantId(req);
    const rFilter = getRestaurantFilter(req);
    if (!restaurantId && req.partner) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);

    const allBookings = await Booking.find({ ...rFilter,
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
    if (isTempDemo(req)) return tempReply(res, TEMP_ANALYTICS.peak);
    const restaurantId = getRestaurantId(req);
    const rFilter = getRestaurantFilter(req);
    if (!restaurantId && req.partner) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);

    const bookings = await Booking.find({ ...rFilter,
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
    if (isTempDemo(req)) return tempReply(res, TEMP_ANALYTICS.ai);
    const restaurantId = getRestaurantId(req);
    const rFilter = getRestaurantFilter(req);
    if (!restaurantId && req.partner) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);

    const aiStarts = await AnalyticsEvent.countDocuments(
      buildEventFilter(restaurantId || null, ["ai_chat_start"], start, end),
    );
    const aiCompletes = await AnalyticsEvent.countDocuments(
      buildEventFilter(restaurantId || null, ["ai_chat_complete"], start, end),
    );

    const aiUserEvents = await AnalyticsEvent.distinct(
      "userId",
      buildEventFilter(restaurantId || null, ["ai_chat_start", "ai_chat_complete"], start, end),
    );

    // Aggregate common user requests
    const requestEvents = await AnalyticsEvent.find(
      buildEventFilter(restaurantId || null, ["ai_user_request"], start, end),
    ).lean();

    const requestCounts = {};
    requestEvents.forEach((e) => {
      const text = (e.metadata?.content || "").toLowerCase().trim();
      if (!text) return;
      requestCounts[text] = (requestCounts[text] || 0) + 1;
    });

    const commonRequests = Object.entries(requestCounts)
      .map(([text, count]) => ({ text: text.slice(0, 100), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return res.json({
      success: true,
      data: {
        totalChats: aiStarts,
        uniqueUsers: aiUserEvents.filter((id) => id).length,
        completedBookings: aiCompletes,
        conversionRate:
          aiStarts > 0 ? Math.round((aiCompletes / aiStarts) * 100) : 0,
        commonRequests,
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

// ── GET /api/partner/analytics/engagement?from=&to= ──────
exports.getEngagement = async (req, res) => {
  try {
    if (isTempDemo(req)) return tempReply(res, TEMP_ANALYTICS.engagement);
    const restaurantId = getRestaurantId(req);
    const rFilter = getRestaurantFilter(req);
    if (!restaurantId && req.partner) {
      return res.status(400).json({ success: false, message: "Missing restaurant" });
    }

    const { start, end } = getDateRange(req.query.from, req.query.to);

    const events = await AnalyticsEvent.find({
      ...rFilter,
      event: { $in: ['add_favorite', 'remove_favorite', 'submit_review', 'add_photo_review', 'use_reward', 'earn_reward', 'deposit_warning_view', 'ai_recommend_click', 'filter_use'] },
      timestamp: { $gte: new Date(start), $lte: new Date(end + "T23:59:59.999Z") },
    }).lean();

    const totalFavorites = events.filter(e => e.event === 'add_favorite').length;
    const totalReviews = events.filter(e => e.event === 'submit_review').length;
    const photoReviews = events.filter(e => e.event === 'add_photo_review').length;
    const rewardUsed = events.filter(e => e.event === 'use_reward').length;
    const rewardEarned = events.filter(e => e.event === 'earn_reward').length;
    const depositWarningViews = events.filter(e => e.event === 'deposit_warning_view').length;
    const aiRecommendClicks = events.filter(e => e.event === 'ai_recommend_click').length;

    const filterEvents = events.filter(e => e.event === 'filter_use');
    const filterCounts = {};
    filterEvents.forEach(e => {
      const name = e.metadata?.filterName || 'unknown';
      filterCounts[name] = (filterCounts[name] || 0) + 1;
    });

    return res.json({
      success: true,
      data: {
        totalFavorites,
        totalReviews,
        photoReviews,
        rewardPointsUsed: rewardUsed,
        rewardPointsEarned: rewardEarned,
        depositWarningViews,
        aiRecommendClicks,
        filterUsage: Object.entries(filterCounts).map(([filterName, count]) => ({ filterName, count })),
      },
    });
  } catch (err) {
    console.error("[analytics:engagement]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
