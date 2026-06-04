const Booking = require('../models/booking');
const AnalyticsEvent = require('../models/analyticsEvent');
const DailyAnalytics = require('../models/dailyAnalytics');

/**
 * Aggregate analytics for a specific restaurant on a specific date
 */
async function aggregateDaily(restaurantId, dateStr) {
  const startDate = new Date(dateStr + 'T00:00:00.000Z');
  const endDate = new Date(dateStr + 'T23:59:59.999Z');

  // Get all bookings for that restaurant on that date
  const bookings = await Booking.find({
    restaurantId,
    createdAt: { $gte: startDate, $lte: endDate },
  }).populate('tableId', 'type').lean();

  // Get analytics events
  const events = await AnalyticsEvent.find({
    restaurantId,
    timestamp: { $gte: startDate, $lte: endDate },
  }).lean();

  // User Activity
  const allUserIds = [...new Set(bookings.map(b => b.userId?.toString()).filter(Boolean))];
  const returningIds = (await Booking.distinct('userId', {
    restaurantId,
    userId: { $in: allUserIds },
    createdAt: { $lt: startDate },
  })).map(id => id.toString());
  const newUsers = allUserIds.filter(id => !returningIds.includes(id)).length;
  const returningUsers = allUserIds.length - newUsers;

  // Booking Funnel
  const views = events.filter(e => ['restaurant_view', 'page_view'].includes(e.event)).length;
  const bookingStarts = events.filter(e => e.event === 'booking_start').length;
  const bookingCompletes = events.filter(e => e.event === 'booking_complete').length;

  const totalBookings = bookings.length;
  const confirmed = bookings.filter(b => ['confirmed', 'occupied', 'completed'].includes(b.status)).length;
  const checkedIn = bookings.filter(b => b.status === 'occupied' || b.status === 'completed').length;
  const completed = bookings.filter(b => b.status === 'completed').length;

  // Table Selection
  const tableTypeCounts = { vip: 0, view: 0, regular: 0, standard: 0 };
  bookings.forEach(b => {
    const t = b.tableId?.type || 'regular';
    if (tableTypeCounts[t] !== undefined) tableTypeCounts[t]++;
  });
  const tableTotal = bookings.length || 1;

  // Cancellation & No-show
  const cancelled = bookings.filter(b => b.status === 'cancelled').length;
  const noShow = bookings.filter(b => b.status === 'no_show').length;

  // AI
  const aiChats = events.filter(e => e.event === 'ai_chat_start').length;
  const aiCompletes = events.filter(e => e.event === 'ai_chat_complete').length;
  const aiUsers = [...new Set(events.filter(e => e.event.startsWith('ai_chat')).map(e => e.userId?.toString()).filter(Boolean))];

  // Search
  const searches = events.filter(e => e.event === 'search').length;
  const searchUsers = [...new Set(events.filter(e => e.event === 'search').map(e => e.userId?.toString()).filter(Boolean))];

  // Peak hours
  const peakHours = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      peakHours.push({ dayOfWeek: d, hour: h, bookings: 0, checkins: 0 });
    }
  }
  bookings.forEach(b => {
    const dateMatch = b.bookingDetails?.date === dateStr;
    if (dateMatch && b.bookingDetails?.time) {
      const d = new Date(dateStr + 'T' + b.bookingDetails.time);
      if (!isNaN(d.getTime())) {
        const dayOfWeek = d.getDay();
        const hour = parseInt(b.bookingDetails.time.split(':')[0], 10);
        const cell = peakHours.find(p => p.dayOfWeek === dayOfWeek && p.hour === hour);
        if (cell) cell.bookings++;
        if (['occupied', 'completed'].includes(b.status) && cell) cell.checkins++;
      }
    }
  });

  // Revenue
  const totalDeposits = bookings.reduce((sum, b) => sum + (b.pricing?.depositAmount || 0), 0);
  const paidDeposits = bookings
    .filter(b => b.payment?.status === 'paid')
    .reduce((sum, b) => sum + (b.pricing?.depositAmount || 0), 0);

  // Average party size
  const partySizes = bookings.map(b => b.bookingDetails?.partySize || 0);
  const avgPartySize = partySizes.length > 0
    ? Math.round(partySizes.reduce((a, b) => a + b, 0) / partySizes.length)
    : 0;

  // Upsert daily analytics
  await DailyAnalytics.findOneAndUpdate(
    { restaurantId, date: dateStr },
    {
      $set: {
        totalUsers: allUserIds.length,
        activeUsers: allUserIds.length,
        newUsers,
        returningUsers,
        totalSearches: searches,
        uniqueSearchUsers: searchUsers.length,
        funnel: {
          restaurantViews: views,
          bookingStarted: bookingStarts,
          bookingCompleted: bookingCompletes,
          bookingConfirmed: confirmed,
          checkedIn,
          completed,
        },
        funnelConversion: {
          viewToStart: views > 0 ? Math.round((bookingStarts / views) * 100) : 0,
          startToBook: bookingStarts > 0 ? Math.round((bookingCompletes / bookingStarts) * 100) : 0,
          bookToConfirm: bookingCompletes > 0 ? Math.round((confirmed / bookingCompletes) * 100) : 0,
        },
        tableTypeRatio: {
          vip: Math.round((tableTypeCounts.vip / tableTotal) * 100),
          view: Math.round((tableTypeCounts.view / tableTotal) * 100),
          regular: Math.round((tableTypeCounts.regular / tableTotal) * 100),
          standard: Math.round((tableTypeCounts.standard / tableTotal) * 100),
        },
        vipTableBookings: tableTypeCounts.vip,
        standardTableBookings: tableTypeCounts.standard,
        totalCancelled: cancelled,
        totalNoShow: noShow,
        cancelRate: totalBookings > 0 ? Math.round((cancelled / totalBookings) * 100) : 0,
        noShowRate: totalBookings > 0 ? Math.round((noShow / totalBookings) * 100) : 0,
        aiTotalChats: aiChats,
        aiUniqueUsers: aiUsers.length,
        aiCompletedBookings: aiCompletes,
        aiConversionRate: aiChats > 0 ? Math.round((aiCompletes / aiChats) * 100) : 0,
        peakHours,
        estimatedRevenue: paidDeposits,
        totalDeposits,
        avgPartySize,
        totalBookings,
        totalWalkIns: bookings.filter(b => b.source === 'walkin').length,
      },
    },
    { upsert: true }
  );

  return { restaurantId, date: dateStr, bookings: totalBookings };
}

/**
 * Aggregate for all restaurants on a given date (default: yesterday)
 */
async function aggregateAllRestaurants(dateStr) {
  const targetDate = dateStr || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const restaurants = await require('../models/restaurant').find({ isActive: true }).select('_id').lean();

  const results = [];
  for (const r of restaurants) {
    try {
      const result = await aggregateDaily(r._id, targetDate);
      results.push(result);
    } catch (err) {
      console.error(`[dailyAnalytics] Error aggregating restaurant ${r._id}:`, err.message);
    }
  }

  return { date: targetDate, restaurantsProcessed: results.length };
}

/**
 * Start the daily aggregation cron job (runs at 00:05 every day)
 * Uses setInterval checking every hour since node-schedule is not a dependency.
 */
function startDailyAggregationJob() {
  const runIfNeeded = async () => {
    const now = new Date();
    // Only run at 00:05-00:10
    if (now.getHours() === 0 && now.getMinutes() >= 5 && now.getMinutes() <= 10) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10);

      console.log('[dailyAnalytics] Starting daily aggregation...');
      try {
        const result = await aggregateAllRestaurants(dateStr);
        console.log(`[dailyAnalytics] Completed: ${result.restaurantsProcessed} restaurants for ${result.date}`);
      } catch (err) {
        console.error('[dailyAnalytics] Job error:', err.message);
      }
    }
  };

  // Run every hour to check
  runIfNeeded(); // Initial run
  setInterval(runIfNeeded, 60 * 60 * 1000);
  console.log('[dailyAnalytics] Daily aggregation job started (checks hourly)');
}

module.exports = {
  aggregateDaily,
  aggregateAllRestaurants,
  startDailyAggregationJob,
};
