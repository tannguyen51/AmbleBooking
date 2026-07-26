const mongoose = require("mongoose");

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  messages: [{
    id: String,
    text: String,
    sender: String,
    timestamp: Date,
    restaurants: Array,
  }],
  session: {
    step: { type: String, default: "idle" },
    draft: { type: mongoose.Schema.Types.Mixed, default: {} },
    history: [{ role: String, content: String }],
  },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChatHistory", chatHistorySchema);
