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
    const todayStart = new Date(new Date().setHours(0,0,0,0));
    const todayRevenue = await Booking.aggregate([
      { $match: {
        status: { $in: ["completed", "confirmed", "occupied"] },
        createdAt: { $gte: todayStart },
      }},
      { $group: { _id: null, total: { $sum: "$pricing.depositAmount" }, count: { $sum: 1 } } },
    ]);
    const todayRev = todayRevenue[0] || { total: 0, count: 0 };

    // Doanh thu tháng này
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthRevenue = await Booking.aggregate([
      { $match: {
        status: { $in: ["completed", "confirmed", "occupied"] },
        createdAt: { $gte: monthStart },
      }},
      { $group: { _id: null, total: { $sum: "$pricing.depositAmount" }, count: { $sum: 1 } } },
    ]);
    const monthRev = monthRevenue[0] || { total: 0, count: 0 };

    // Booking theo trạng thái
    const bookingStatus = await Booking.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const statusMap = {};
    bookingStatus.forEach((s) => { statusMap[s._id] = s.count; });

    // Partner theo gói
    const partnerByPackage = await Partner.aggregate([
      { $group: { _id: "$subscriptionPackage", count: { $sum: 1 } } },
    ]);
    const pkgMap = {};
    partnerByPackage.forEach((p) => { pkgMap[p._id] = p.count; });

    // User đăng ký 7 ngày gần đây
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersWeek = await User.countDocuments({ createdAt: { $gte: weekAgo } });

    // Top 5 nhà hàng theo doanh thu
    const topByRevenue = await Booking.aggregate([
      { $match: { status: { $in: ["completed", "confirmed", "occupied"] } } },
      { $group: { _id: "$restaurantId", revenue: { $sum: "$pricing.depositAmount" }, bookings: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: "restaurants", localField: "_id", foreignField: "_id", as: "r" } },
      { $unwind: "$r" },
      { $project: { name: "$r.name", revenue: 1, bookings: 1 } },
    ]);

    // Giờ cao điểm (top booking hours)
    const peakHours = await Booking.aggregate([
      { $group: { _id: "$bookingDetails.time", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const avgDeposit = revenue.count > 0 ? Math.round(revenue.total / revenue.count) : 0;
    const cancelRate = totalBookings > 0 ? Math.round(((statusMap["cancelled"] || 0) / totalBookings) * 100) : 0;
    const completionRate = totalBookings > 0 ? Math.round(((statusMap["completed"] || 0) / totalBookings) * 100) : 0;

    const dataContext = `
## DỮ LIỆU THỜI GIAN THỰC

### Tổng quan
- Users: ${totalUsers} tổng (${activeUsers} active, +${newUsersWeek} mới 7 ngày qua)
- Partners: ${totalPartners} tổng (${pendingPartners} chờ duyệt, ${activePartners} active)
- Nhà hàng: ${totalRestaurants} tổng (${activeRestaurants} đang hoạt động)
- Bookings: ${totalBookings} tổng (${todayBookings} hôm nay)

### Doanh thu
- Tổng: ${revenue.total.toLocaleString("vi-VN")}đ (${revenue.count} bookings, TB ${avgDeposit.toLocaleString("vi-VN")}đ/booking)
- Hôm nay: ${todayRev.total.toLocaleString("vi-VN")}đ (${todayRev.count} bookings)
- Tháng này: ${monthRev.total.toLocaleString("vi-VN")}đ (${monthRev.count} bookings)

### Booking theo trạng thái
- Completed: ${statusMap["completed"] || 0} | Confirmed: ${statusMap["confirmed"] || 0}
- Pending: ${statusMap["pending"] || 0} | Cancelled: ${statusMap["cancelled"] || 0}
- Occupied: ${statusMap["occupied"] || 0} | No-show: ${statusMap["no_show"] || 0}
- Tỉ lệ hoàn thành: ${completionRate}% | Tỉ lệ hủy: ${cancelRate}%

### Partners theo gói
- Pro: ${pkgMap["pro"] || 0} | Premium: ${pkgMap["premium"] || 0} | Basic: ${pkgMap["basic"] || 0}
- Tỉ lệ chuyển đổi (pending→active): ${totalPartners > 0 ? Math.round((activePartners / totalPartners) * 100) : 0}%

### Top 5 nhà hàng theo doanh thu
${topByRevenue.map((r, i) => `${i + 1}. ${r.name} — ${r.revenue.toLocaleString("vi-VN")}đ (${r.bookings} bookings)`).join("\n")}

### Giờ đặt bàn cao điểm
${peakHours.map((h, i) => `${i + 1}. ${h._id} — ${h.count} bookings`).join("\n")}
`;

    const systemPrompt = `Bạn là MunchMap AI — trợ lý phân tích kinh doanh thông minh cho quản trị viên nền tảng đặt bàn nhà hàng MunchMap tại Việt Nam.

## VAI TRÒ
Giúp admin giám sát, phân tích và quản lý hoạt động nhà hàng trên toàn hệ thống.

## KHẢ NĂNG
1. Phân tích doanh thu — tổng, theo ngày/tháng, xu hướng
2. Phân tích đặt bàn — số lượng, giờ cao điểm, tỉ lệ hủy
3. Phân tích khách hàng — mới, quay lại, tỉ lệ giữ chân
4. Phân tích hiệu suất nhà hàng — doanh thu, rating, occupancy
5. Giám sát hoạt động — cảnh báo bất thường
6. Đề xuất cải thiện kinh doanh

## PHONG CÁCH
- Chuyên nghiệp, súc tích, tập trung vào insight có thể hành động
- Dùng bullet point khi liệt kê phân tích
- Luôn đưa ra đề xuất cụ thể khi có thể
- Trả lời bằng tiếng Việt

## QUY TẮC NGHIÊM NGẶT
1. KHÔNG BAO GIỜ bịa dữ liệu. Nếu không có dữ liệu → nói rõ: "Tôi không có đủ dữ liệu để trả lời chính xác."
2. Nếu thiếu tham số (VD: admin hỏi "doanh thu" nhưng không nói khoảng thời gian) → hỏi lại: "Bạn muốn xem doanh thu hôm nay, tháng này hay khoảng thời gian nào?"
3. Phân tích trước khi kết luận: tóm tắt → xu hướng → rủi ro → đề xuất

## PHÂN TÍCH DOANH THU
Phân tích: tổng doanh thu, tăng trưởng, xu hướng, nhà hàng tốt nhất/kém nhất
Định dạng:
**Tóm tắt doanh thu**
- Key findings...
- Rủi ro: ...
- Đề xuất: ...

## PHÂN TÍCH ĐẶT BÀN
Phân tích: tổng booking, giờ cao điểm, tỉ lệ lấp đầy, tỉ lệ hủy, xu hướng
Định dạng: **Tổng quan đặt bàn** → findings → đề xuất

## PHÂN TÍCH KHÁCH HÀNG
Phân tích: khách mới, khách quay lại, tỉ lệ giữ chân, tăng trưởng

## PHÂN TÍCH NHÀ HÀNG
Xếp hạng từ tốt nhất đến kém nhất khi được yêu cầu
Định dạng: **Top performers:** ... | **Cần chú ý:** ... | Đề xuất: ...

## CẢNH BÁO
Nếu phát hiện bất thường → tạo cảnh báo:
- 🔴 High / 🟡 Medium / 🟢 Low
- Lý do + Hành động đề xuất

## ĐỀ XUẤT
Luôn đưa ra đề xuất thực tế: tăng marketing, điều chỉnh nhân sự giờ cao điểm, khuyến mãi giờ thấp điểm, cải thiện dịch vụ nhà hàng rating thấp, chương trình giữ chân khách hàng.

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
