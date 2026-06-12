const express = require("express");
const router = express.Router();

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

const MODEL_CANDIDATES = (
  process.env.AI_MODELS ||
  "openai/gpt-4o-mini,anthropic/claude-3.5-haiku"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

// Fallback models miễn phí khi hết credits
const FREE_FALLBACKS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

function getAIKey() {
  return (
    process.env.OPENROUTER_API_KEY ||
    process.env.AI_API_KEY ||
    ""
  );
}

function getAnthropicKey() {
  return process.env.ANTHROPIC_FOUNDRY_API_KEY || "";
}

async function callAnthropic(apiKey, messages, systemPrompt) {
  const baseUrl = (process.env.ANTHROPIC_FOUNDRY_BASE_URL || "https://api.ai-box.vn").replace(/\/+$/, "");
  const model = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || "deepseek-v4-pro[1m]";
  const key = (apiKey || "").trim();

  const endpoint = `${baseUrl}/v1/chat/completions`;
  // Retry tối đa 3 lần nếu thất bại
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * attempt));
    try {
      const body = {
        model,
        max_tokens: 4096,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      };
      console.log(`[AI/Foundry] trying model=${model}...`);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content
          || data?.choices?.[0]?.message?.reasoning_content
          || "";
        if (text) {
          console.log("[AI/Foundry] success!");
          return { ok: true, text, model };
        }
        console.log("[AI/Foundry] bad response:", JSON.stringify(data).slice(0, 200));
      } else {
        const errText = await response.text().catch(() => "");
        console.log(`[AI/Foundry] returned ${response.status}:`, errText.slice(0, 300));
      }
    } catch (e) {
      console.log(`[AI/Foundry] error:`, e.message);
    }
  }

  return { ok: false, status: 502, error: { message: "AI-Box API failed" } };
}

async function callAI(apiKey, messages, systemPrompt, retries = 2) {
  let lastError = {
    ok: false,
    status: 502,
    error: { message: "Unknown upstream error" },
  };

  const allModels = [...MODEL_CANDIDATES, ...FREE_FALLBACKS];
  for (const model of allModels) {
    const body = {
      model,
      max_tokens: 500,
      temperature: 0.3,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        ...messages,
      ],
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      let response;
      try {
        response = await fetch(OR_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://munchmap.app",
            "X-Title": "munchmap",
          },
          body: JSON.stringify(body),
        });
      } catch (fetchErr) {
        console.error("[AI] network error:", fetchErr.message);
        lastError = {
          ok: false,
          status: 503,
          error: { message: "Network: " + fetchErr.message },
        };
        break;
      }

      const rawText = await response.text();
      console.log(
        `[AI] model=${model} attempt=${attempt} status=${response.status} body=${rawText.slice(0, 400)}`,
      );

      if (response.ok) {
        try {
          const data = JSON.parse(rawText);
          const text = data?.choices?.[0]?.message?.content ?? "";
          return { ok: true, text, model };
        } catch {
          lastError = {
            ok: false,
            status: 500,
            error: { message: "Invalid JSON from OpenRouter" },
          };
          break;
        }
      }

      let errData = {};
      try {
        errData = JSON.parse(rawText);
      } catch {
        errData = { message: rawText?.slice(0, 200) || "Unknown error" };
      }

      lastError = { ok: false, status: response.status, error: errData };

      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < retries
      ) {
        const waitMs = attempt * 2000;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      break;
    }
  }

  return lastError;
}

// ── GET /api/ai/test ──────────────────────────────────────
// Mở trình duyệt: http://localhost:5000/api/ai/test
// Xem log BE để biết OpenRouter trả về gì
router.get("/test", async (req, res) => {
  const apiKey = getAIKey();
  console.log(
    "[AI/test] key =",
    apiKey ? apiKey.slice(0, 15) + "..." : "MISSING",
  );

  if (!apiKey) {
    return res.json({
      ok: false,
      problem:
        "OPENROUTER_API_KEY (hoặc AI_API_KEY/GEMINI_API_KEY) chưa set trong .env",
    });
  }

  const result = await callAI(
    apiKey,
    [{ role: "user", content: "Say OK only" }],
    null,
    1,
  );

  if (result.ok) {
    return res.json({ ok: true, reply: result.text.trim() });
  }
  return res.json({ ok: false, status: result.status, detail: result.error });
});

// ── POST /api/ai/chat ─────────────────────────────────────
router.post("/chat", async (req, res) => {
  try {
    const { messages, system } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res
        .status(400)
        .json({ success: false, message: "messages required" });
    }

    const anthropicKey = getAnthropicKey();
    const apiKey = getAIKey();

    // Ưu tiên Anthropic nếu có key (có credit)
    if (anthropicKey) {
      const result = await callAnthropic(anthropicKey, messages, system || null);
      if (result.ok) return res.json({ success: true, text: result.text });
      console.log("[AI/chat] Anthropic failed, fallback to OpenRouter");
    }

    if (!apiKey) {
      return res
        .status(500)
        .json({ success: false, message: "AI service not configured" });
    }

    const result = await callAI(apiKey, messages, system || null);

    if (!result.ok) {
      console.error(
        "[AI/chat] failed:",
        result.status,
        JSON.stringify(result.error),
      );
      if (result.status === 429) {
        return res.status(429).json({ success: false, message: "rate_limit" });
      }

      // Upstream auth/account có vấn đề: trả fallback mềm để chat không bị văng lỗi.
      if (result.status === 401 || result.status === 403) {
        return res.json({
          success: true,
          text: "Mình tạm thời không kết nối được AI nâng cao. Bạn vẫn có thể nhập nhanh nhu cầu như: hẹn hò, gia đình, công việc, khu vực Quận 1 để mình hỗ trợ đặt bàn.",
        });
      }

      const upstreamMessage =
        result.error?.error?.message ||
        result.error?.message ||
        "AI unavailable";
      return res.status(502).json({
        success: false,
        message: "AI unavailable",
        detail: upstreamMessage,
      });
    }

    return res.json({ success: true, text: result.text });
  } catch (err) {
    console.error("[AI/chat] exception:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ── POST /api/ai/admin-chat ─────────────────────────────────
// Admin AI: phân tích dữ liệu, doanh thu, đối tác...
router.post("/admin-chat", async (req, res) => {
  try {
    const anthropicKey = getAnthropicKey();
    const apiKey = getAIKey();

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: "Thiếu messages" });
    }

    // Lấy dữ liệu thực từ DB (tối giản, tránh timeout)
    const User = require("../models/user");
    const Partner = require("../models/partner");
    const Restaurant = require("../models/restaurant");
    const Booking = require("../models/booking");

    let dataContext = "";
    try {
      const todayStart = new Date(new Date().setHours(0,0,0,0));
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalUsers, activeUsers, newUsersWeek,
        totalPartners, activePartners, pendingPartners,
        totalRestaurants, activeRestaurants,
        totalBookings, todayBookings,
      ] = await Promise.all([
        User.countDocuments(), User.countDocuments({ isActive: true }), User.countDocuments({ createdAt: { $gte: weekAgo } }),
        Partner.countDocuments(), Partner.countDocuments({ subscriptionStatus: "active" }), Partner.countDocuments({ subscriptionStatus: "pending" }),
        Restaurant.countDocuments(), Restaurant.countDocuments({ isActive: true }),
        Booking.countDocuments(), Booking.countDocuments({ createdAt: { $gte: todayStart } }),
      ]);

      // Doanh thu: dùng aggregate $sum (nhanh, không load hết documents)
      const [revResult, todayResult, monthResult] = await Promise.all([
        Booking.aggregate([{ $match: { status: { $in: ["completed","confirmed","occupied"] } } }, { $group: { _id: null, total: { $sum: "$pricing.depositAmount" }, count: { $sum: 1 } } }]),
        Booking.aggregate([{ $match: { status: { $in: ["completed","confirmed","occupied"] }, createdAt: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: "$pricing.depositAmount" }, count: { $sum: 1 } } }]),
        Booking.aggregate([{ $match: { status: { $in: ["completed","confirmed","occupied"] }, createdAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: "$pricing.depositAmount" }, count: { $sum: 1 } } }]),
      ]);
      const revenue = revResult[0] || { total: 0, count: 0 };
      const todayRev = todayResult[0] || { total: 0, count: 0 };
      const monthRev = monthResult[0] || { total: 0, count: 0 };
      const avgDeposit = revenue.count > 0 ? Math.round(revenue.total / revenue.count) : 0;

      // Top nhà hàng: đếm booking + doanh thu
      const topRestaurants = await Booking.aggregate([
        { $match: { status: { $in: ["completed","confirmed","occupied"] } } },
        { $group: { _id: "$restaurantId", bookings: { $sum: 1 }, revenue: { $sum: "$pricing.depositAmount" } } },
        { $sort: { revenue: -1 } }, { $limit: 20 },
      ]);
      const restIds = topRestaurants.map(r => r._id);
      const restaurants = await Restaurant.find({ _id: { $in: restIds } }, { name: 1, city: 1, cuisine: 1, rating: 1, subscriptionPackage: 1 }).lean();
      const nameMap = {}; restaurants.forEach(r => { nameMap[r._id] = r; });
      const topList = topRestaurants.map((r, i) => {
        const rest = nameMap[r._id];
        return `${i+1}. ${rest?.name||"Unknown"} | ${rest?.city||"?"} | ${rest?.cuisine||"?"} | rating ${rest?.rating||0} | gói ${rest?.subscriptionPackage||"?"} | ${r.bookings} bookings | ${r.revenue.toLocaleString("vi-VN")}đ doanh thu`;
      }).join("\n");

      // Booking status breakdown
      const bookingStatus = await Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
      const stMap = {}; bookingStatus.forEach(s => { stMap[s._id] = s.count; });
      const cancelRate = totalBookings > 0 ? Math.round(((stMap["cancelled"]||0)/totalBookings)*100) : 0;

      // All restaurant names for reference
      const allRestCount = await Restaurant.countDocuments({ isActive: true });

      dataContext = `Users: ${totalUsers} (${activeUsers} active, +${newUsersWeek} tuần này). Partners: ${totalPartners} (${activePartners} active, ${pendingPartners} chờ duyệt). Nhà hàng: ${activeRestaurants}/${totalRestaurants} active. Bookings: ${totalBookings} tổng (${todayBookings} hôm nay). Doanh thu: ${revenue.total.toLocaleString("vi-VN")}đ tổng (${revenue.count} bk, TB ${avgDeposit.toLocaleString("vi-VN")}đ), ${todayRev.total.toLocaleString("vi-VN")}đ hôm nay, ${monthRev.total.toLocaleString("vi-VN")}đ tháng này. Booking status: completed=${stMap["completed"]||0}, confirmed=${stMap["confirmed"]||0}, cancelled=${stMap["cancelled"]||0}. Hủy: ${cancelRate}%.\nTop 20 nhà hàng (booking):\n${topList}`;
      console.log("[AI/admin-chat] dataContext length:", dataContext.length);
    } catch (e) {
      console.error("[AI/admin-chat] DB error:", e.message, e.stack?.slice(0, 200));
      dataContext = "Dữ liệu tạm thời không khả dụng: " + e.message;
    }

    const systemPrompt = `Bạn là MunchMap AI — trợ lý phân tích cho admin nền tảng đặt bàn MunchMap.
Trả lời ngắn gọn, chuyên nghiệp, dựa CHÍNH XÁC vào dữ liệu bên dưới. Không bịa số.
Nếu admin hỏi về 1 nhà hàng cụ thể → tìm tên đó trong danh sách Top 20 và trả lời.
Nếu không có trong danh sách → nói rõ "Nhà hàng này không có trong top 20".

${dataContext}`;

    // Ưu tiên AI-Box nếu có key
    let result = { ok: false, status: 500, error: { message: "No AI service available" } };
    if (anthropicKey) {
      try {
        result = await callAnthropic(anthropicKey, messages, systemPrompt);
        if (result.ok) return res.json({ success: true, text: result.text });
        console.log("[AI/admin-chat] Anthropic failed, fallback to OpenRouter");
      } catch (e) {
        console.log("[AI/admin-chat] Anthropic exception:", e.message);
      }
    }

    if (apiKey) {
      result = await callAI(apiKey, messages, systemPrompt);
      if (result.ok) return res.json({ success: true, text: result.text });
    }

    // Fallback: trả về dữ liệu thô nếu AI không phản hồi
    if (dataContext && dataContext.length > 10) {
      return res.json({ success: true, text: `Tôi tạm thời không thể phân tích bằng AI. Đây là dữ liệu hệ thống hiện tại:\n\n${dataContext}` });
    }

    return res.json({ success: false, message: "Không thể kết nối AI. Vui lòng thử lại sau." });
  } catch (err) {
    console.error("[AI/admin-chat]", err.message, err.stack?.slice(0, 300));
    return res.status(500).json({ success: false, message: "Lỗi server: " + (err.message || "unknown") });
  }
});

module.exports = router;
