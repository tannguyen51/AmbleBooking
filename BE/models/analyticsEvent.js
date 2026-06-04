const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
  event: {
    type: String,
    enum: [
      'page_view', 'search', 'restaurant_view', 'table_view',
      'booking_start', 'booking_complete', 'booking_cancel',
      'checkin', 'complete', 'no_show', 'walkin',
      'ai_chat_start', 'ai_chat_complete',
    ],
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  sessionId: { type: String, default: '' },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: { type: Date, default: Date.now },
});

analyticsEventSchema.index({ restaurantId: 1, event: 1, timestamp: -1 });
analyticsEventSchema.index({ restaurantId: 1, timestamp: -1 });
analyticsEventSchema.index({ event: 1, timestamp: -1 });
analyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // TTL 90 ngày

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
