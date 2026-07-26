const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const ChatHistory = require("../models/chatHistory");

// ── GET /api/chat/history ──────────────────────────
router.get("/history", protect, async (req, res) => {
  try {
    const chat = await ChatHistory.findOne({ userId: req.user.id });
    return res.json({
      success: true,
      data: chat || { messages: [], session: { step: "idle", draft: {}, history: [] } },
    });
  } catch (err) {
    console.error("[chat:history]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── PUT /api/chat/history ──────────────────────────
router.put("/history", protect, async (req, res) => {
  try {
    const { messages, session } = req.body;
    await ChatHistory.findOneAndUpdate(
      { userId: req.user.id },
      { userId: req.user.id, messages: messages || [], session: session || {}, updatedAt: new Date() },
      { upsert: true, new: true },
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("[chat:history:save]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
