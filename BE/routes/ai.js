const express = require("express");
const router = express.Router();

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

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
  // Thử Anthropic API trước
  try {
    const body = {
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      ...(systemPrompt ? { system: systemPrompt } : {}),
    };
    console.log("[AI/Anthropic] trying native API...");
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      const data = await response.json();
      if (data?.content?.[0]?.text) {
        console.log("[AI/Anthropic] native success!");
        return { ok: true, text: data.content[0].text, model: "claude-sonnet-4-6" };
      }
    }
    console.log("[AI/Anthropic] native failed:", response.status);
  } catch (e) {
    console.log("[AI/Anthropic] native error:", e.message);
  }

  // Fallback: thử qua OpenRouter với key này
  try {
    const body = {
      model: "anthropic/claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    };
    console.log("[AI/Anthropic] trying via OpenRouter...");
    const response = await fetch(OR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://munchmap.app",
        "X-Title": "munchmap",
      },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      const data = await response.json();
      if (data?.choices?.[0]?.message?.content) {
        console.log("[AI/Anthropic] OpenRouter success!");
        return { ok: true, text: data.choices[0].message.content, model: "claude-sonnet-4-6" };
      }
    }
    console.log("[AI/Anthropic] OpenRouter failed:", response.status);
  } catch (e) {
    console.log("[AI/Anthropic] OpenRouter error:", e.message);
  }

  return { ok: false, status: 401, error: { message: "Key không hợp lệ với cả Anthropic lẫn OpenRouter" } };
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

    // Lấy dữ liệu thực từ DB để đưa vào context
    const User = require("../models/user");
    const Partner = require("../models/partner");
    const Restaurant = require("../models/restaurant");
    const Booking = require("../models/booking");

    const [totalUsers, activeUsers, totalPartners, pendingPartners, activePartners,
      totalRestaurants, activeRestaurants, totalBookings, todayBookings] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Partner.countDocuments(),
      Partner.countDocuments({ subscriptionStatus: "pending" }),
      Partner.countDocuments({ subscriptionStatus: "active" }),
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ isActive: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
    ]);

    // Top nhà hàng theo booking
    const topRestaurants = await Booking.aggregate([
      { $group: { _id: "$restaurantId", bookings: { $sum: 1 } } },
      { $sort: { bookings: -1 } },
      { $limit: 5 },
      { $lookup: { from: "restaurants", localField: "_id", foreignField: "_id", as: "restaurant" } },
      { $unwind: "$restaurant" },
      { $project: { name: "$restaurant.name", bookings: 1 } },
    ]);

    // Doanh thu tổng
    const revenueResult = await Booking.aggregate([
      { $match: { status: { $in: ["completed", "confirmed", "occupied"] } } },
      { $group: { _id: null, total: { $sum: "$pricing.depositAmount" }, count: { $sum: 1 } } },
    ]);
    const revenue = revenueResult[0] || { total: 0, count: 0 };

    // Doanh thu hôm nay
    const todayRevenue = await Booking.aggregate([
      { $match: {
        status: { $in: ["completed", "confirmed", "occupied"] },
        createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) },
      }},
      { $group: { _id: null, total: { $sum: "$pricing.depositAmount" }, count: { $sum: 1 } } },
    ]);
    const todayRev = todayRevenue[0] || { total: 0, count: 0 };

    const dataContext = `
## DỮ LIỆU THỰC TẾ (Real-time từ database)

### Tổng quan
- Tổng users: ${totalUsers} (active: ${activeUsers})
- Tổng partners: ${totalPartners} (pending: ${pendingPartners}, active: ${activePartners})
- Tổng nhà hàng: ${totalRestaurants} (active: ${activeRestaurants})
- Tổng bookings: ${totalBookings} (hôm nay: ${todayBookings})

### Doanh thu
- Tổng doanh thu (đã hoàn thành/xác nhận): ${revenue.total.toLocaleString("vi-VN")}đ (${revenue.count} bookings)
- Doanh thu hôm nay: ${todayRev.total.toLocaleString("vi-VN")}đ (${todayRev.count} bookings)

### Top 5 nhà hàng (theo số booking)
${topRestaurants.map((r, i) => `${i + 1}. ${r.name} - ${r.bookings} bookings`).join("\n")}

### Tỉ lệ
- Tỉ lệ chuyển đổi partner: ${totalPartners > 0 ? Math.round((activePartners / totalPartners) * 100) : 0}%
- Booking trung bình/nhà hàng: ${activeRestaurants > 0 ? Math.round(totalBookings / activeRestaurants) : 0}
`;

    const systemPrompt = `Bạn là trợ lý AI phân tích dữ liệu cho admin của MunchMap — nền tảng đặt bàn nhà hàng.
Trả lời bằng tiếng Việt, ngắn gọn, chuyên nghiệp.
Có thể đưa ra nhận xét, xu hướng, và gợi ý cải thiện dựa trên dữ liệu.
${dataContext}`;

    // Ưu tiên Anthropic nếu có key
    let result;
    if (anthropicKey) {
      result = await callAnthropic(anthropicKey, messages, systemPrompt);
      if (result.ok) return res.json({ success: true, text: result.text });
      console.log("[AI/admin-chat] Anthropic failed, fallback to OpenRouter");
    }

    if (!apiKey) {
      return res.json({ success: false, message: "AI key chưa cấu hình" });
    }

    result = await callAI(apiKey, messages, systemPrompt);

    if (!result.ok) {
      return res.json({ success: false, message: result.error?.message || "AI error" });
    }

    return res.json({ success: true, text: result.text });
  } catch (err) {
    console.error("[AI/admin-chat]", err.message);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

module.exports = router;
