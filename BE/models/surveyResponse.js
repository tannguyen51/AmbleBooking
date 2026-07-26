const mongoose = require("mongoose");

const surveyResponseSchema = new mongoose.Schema({
  source: {
    type: String,
    required: true,
    enum: ["tiktok", "facebook", "friends_family", "restaurant", "google_chplay", "event"],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  platform: {
    type: String,
    default: "unknown",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("SurveyResponse", surveyResponseSchema);
