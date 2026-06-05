const mongoose = require('mongoose');

const dailyAnalyticsSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
  date: { type: String, required: true }, // YYYY-MM-DD

  // User Activity
  totalUsers:        { type: Number, default: 0 },
  activeUsers:       { type: Number, default: 0 },
  newUsers:          { type: Number, default: 0 },
  returningUsers:    { type: Number, default: 0 },

  // Search & Discovery
  totalSearches:     { type: Number, default: 0 },
  uniqueSearchUsers: { type: Number, default: 0 },
  topSearchKeywords: [{ keyword: String, count: Number }],
  searchToViewRate:  { type: Number, default: 0 },

  // Booking Funnel
  funnel: {
    restaurantViews:   { type: Number, default: 0 },
    tableViews:        { type: Number, default: 0 },
    bookingStarted:    { type: Number, default: 0 },
    bookingCompleted:  { type: Number, default: 0 },
    bookingConfirmed:  { type: Number, default: 0 },
    checkedIn:         { type: Number, default: 0 },
    completed:         { type: Number, default: 0 },
  },
  funnelConversion: {
    viewToStart:  { type: Number, default: 0 },
    startToBook:  { type: Number, default: 0 },
    bookToConfirm:{ type: Number, default: 0 },
    confirmToCheckin: { type: Number, default: 0 },
    checkinToComplete:{ type: Number, default: 0 },
  },

  // Table Selection
  vipTableBookings:     { type: Number, default: 0 },
  standardTableBookings:{ type: Number, default: 0 },
  tableTypeRatio: {
    vip:      { type: Number, default: 0 },
    view:     { type: Number, default: 0 },
    regular:  { type: Number, default: 0 },
    standard: { type: Number, default: 0 },
  },

  // Cancellation & No-show
  totalCancelled: { type: Number, default: 0 },
  totalNoShow:    { type: Number, default: 0 },
  cancelRate:     { type: Number, default: 0 },
  noShowRate:     { type: Number, default: 0 },
  cancelReasons:  [{ reason: String, count: Number }],
  avgCancellationLeadTime: { type: Number, default: 0 },

  // AI Assistant
  aiTotalChats:        { type: Number, default: 0 },
  aiUniqueUsers:       { type: Number, default: 0 },
  aiCompletedBookings: { type: Number, default: 0 },
  aiConversionRate:    { type: Number, default: 0 },
  aiRecommendClicks:   { type: Number, default: 0 },
  aiCommonRequests:    [{ request: String, count: Number }],

  // Engagement
  totalFavorites:      { type: Number, default: 0 },
  totalReviews:        { type: Number, default: 0 },
  photoReviews:        { type: Number, default: 0 },
  rewardPointsUsed:    { type: Number, default: 0 },
  rewardPointsEarned:  { type: Number, default: 0 },

  // Deposit warning
  depositWarningViews: { type: Number, default: 0 },

  // Filter usage
  filterUsage: [{ filterName: String, count: Number }],

  // Peak Hours (heatmap data)
  peakHours: [{
    hour:       Number,
    dayOfWeek:  Number,
    bookings:   Number,
    checkins:   Number,
  }],

  // Revenue
  estimatedRevenue: { type: Number, default: 0 },
  totalDeposits:    { type: Number, default: 0 },

  // Dining
  avgDiningDuration: { type: Number, default: 0 },
  avgPartySize:      { type: Number, default: 0 },

  // Overview
  totalBookings: { type: Number, default: 0 },
  totalWalkIns:  { type: Number, default: 0 },
}, { timestamps: true });

dailyAnalyticsSchema.index({ restaurantId: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('DailyAnalytics', dailyAnalyticsSchema);
