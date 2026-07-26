const express = require("express");
const router = express.Router();
const SurveyResponse = require("../models/surveyResponse");

// ── POST /api/survey ─────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { source, userId, platform } = req.body;

    if (!source) {
      return res.status(400).json({ success: false, message: "Missing source" });
    }

    const validSources = ["tiktok", "facebook", "friends_family", "restaurant", "google_chplay", "event"];
    if (!validSources.includes(source)) {
      return res.status(400).json({ success: false, message: "Invalid source" });
    }

    await SurveyResponse.create({
      source,
      userId: userId || null,
      platform: platform || "unknown",
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("[survey]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── GET /api/survey/stats ─────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const total = await SurveyResponse.countDocuments();
    const sources = await SurveyResponse.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const sourceLabels = {
      tiktok: "TikTok",
      facebook: "Facebook",
      friends_family: "Bạn bè/Người thân",
      restaurant: "Nhà hàng giới thiệu",
      google_chplay: "Google, CH Play",
      event: "Chương trình/Sự kiện",
    };

    return res.json({
      success: true,
      data: {
        total,
        sources: sources.map((s) => ({
          source: s._id,
          label: sourceLabels[s._id] || s._id,
          count: s.count,
          pct: total > 0 ? Math.round((s.count / total) * 100) : 0,
        })),
      },
    });
  } catch (err) {
    console.error("[survey:stats]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
