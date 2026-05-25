import { restaurantApi } from "./restaurantApi";
import { bookingAPI } from "./api";

export type BookingStep =
  | "idle"
  | "purpose"
  | "date"
  | "time"
  | "partySize"
  | "location"
  | "tableType"
  | "results";

export interface BookingDraft {
  purpose?: "date" | "family" | "business" | "celebration" | "casual";
  date?: string;
  time?: string;
  partySize?: number;
  location?: string;
  tableType?: "vip" | "view" | "regular";
  restaurantName?: string;
}

export interface QuickReply {
  id: string;
  text: string;
  value: string;
}

export interface TableCard {
  tableId: string;
  tableName: string;
  tableType: string;
  tableImage: string;
  tableImages: string[];
  features: string[];
  description: string;
  capacity: { min: number; max: number };
  deposit: number;
  isAvailable: boolean;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  restaurantCity: string;
  restaurantCuisine: string;
  restaurantRating: number;
  restaurantAddress: string;
}

export interface AIResponse {
  text: string;
  quickReplies?: QuickReply[];
  tableCards?: TableCard[];
  step: BookingStep;
  draft: BookingDraft;
  bookingContext?: BookingDraft;
  restaurants?: any[];
}

export interface AISession {
  step: BookingStep;
  draft: BookingDraft;
  history: { role: "user" | "assistant"; content: string }[];
}

export const DEFAULT_SESSION: AISession = {
  step: "idle",
  draft: {},
  history: [],
};

// ─── Gọi Gemini qua BE proxy (key bảo mật trong BE/.env) ───────────────────

const BE_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:5000/api";

async function callClaude(
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[],
  userMessage: string,
): Promise<string> {
  const payload = {
    system: systemPrompt,
    messages: [...history, { role: "user", content: userMessage }],
  };

  let res = await fetch(`${BE_URL}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // Fallback cho backend cũ dùng route conversation
  if (res.status === 404) {
    res = await fetch(`${BE_URL}/booking/conversation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        sessionId: "",
      }),
    });
  }

  if (res.status === 429) {
    return "⏳ AI đang bận, bạn đợi khoảng 20 giây rồi thử lại nhé!";
  }

  if (!res.ok) {
    const errText = await res.text();
    console.warn("[callClaude] upstream error:", res.status, errText);

    // Upstream AI bị lỗi tạm thời: trả fallback mềm để UX không bị văng lỗi đỏ.
    if (res.status >= 500) {
      return "Hiện AI đang bận một chút. Bạn thử lại sau vài giây hoặc chọn nhanh: hẹn hò, gia đình, công việc.";
    }

    throw new Error("AI proxy error: " + res.status);
  }

  const data = await res.json();
  const text =
    data?.text || data?.reply || data?.message || data?.data?.text || "";
  if (!text) throw new Error("Empty AI response");
  return String(text).trim();
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Bạn là Amble AI — trợ lý đặt bàn thông minh của Amble.
Hôm nay: 2026-03-14

## NGUYÊN TẮC
- Thân thiện, tự nhiên, ngắn gọn (2-3 câu)
- KHÔNG hỏi từng câu riêng lẻ — nếu cần hỏi thì gộp 1 câu
- Khi đủ thông tin → trả JSON ngay, KHÔNG hỏi thêm

## XỬ LÝ TÊN NHÀ HÀNG CỤ THỂ
Nếu user nhắc tên nhà hàng cụ thể (vd: "nhà hàng Sakura", "The Rooftop"):
=> Thêm field "restaurantName" vào JSON để tìm đúng nhà hàng đó
=> JSON: {"action":"search","restaurantName":"Sakura",...các field khác...}

Nếu KHÔNG có tên nhà hàng → KHÔNG có field restaurantName trong JSON

## KHI ĐỦ THÔNG TIN → CHỈ TRẢ JSON (không thêm text):
{"action":"search","purpose":"casual","date":"YYYY-MM-DD","time":"HH:mm","partySize":2,"location":"Ho Chi Minh","tableType":"regular"}

## GIÁ TRỊ MẶC ĐỊNH
purpose=casual, date=2026-03-14, time=19:00, partySize=2, location=Ho Chi Minh, tableType=regular

## CÁC TRƯỜNG HỢP KHÁC
- Chào hỏi → chào lại + giới thiệu Amble AI ngắn
- Hỏi Amble → app đặt bàn nhà hàng tại Việt Nam
- Không liên quan → trả lời ngắn + gợi ý đặt bàn
- Mơ hồ ("tuỳ","gì cũng được") → dùng default, trả JSON ngay`;

// ─── Quick replies theo step ──────────────────────────────────────────────────

const STEP_QUICK_REPLIES: Partial<Record<BookingStep, QuickReply[]>> = {
  idle: [
    { id: "1", text: "Đặt bàn hẹn hò", value: "Tôi muốn đặt bàn hẹn hò" },
    { id: "2", text: "Đặt bàn gia đình", value: "Đặt bàn cho gia đình" },
    {
      id: "3",
      text: "Tìm nhà hàng ngon",
      value: "Gợi ý nhà hàng ngon ở Sài Gòn",
    },
  ],
  purpose: [
    { id: "1", text: "Hẹn hò", value: "Hẹn hò" },
    { id: "2", text: "Gia đình", value: "Gia đình" },
    { id: "3", text: "Công việc", value: "Công việc" },
    { id: "4", text: "Kỷ niệm", value: "Kỷ niệm" },
  ],
  date: [
    { id: "1", text: "Hôm nay", value: "Hôm nay" },
    { id: "2", text: "Ngày mai", value: "Ngày mai" },
    { id: "3", text: "Thứ 7 này", value: "Thứ 7 này" },
  ],
  time: [
    { id: "1", text: "12:00", value: "12:00" },
    { id: "2", text: "18:00", value: "18:00" },
    { id: "3", text: "19:00", value: "19:00" },
    { id: "4", text: "20:00", value: "20:00" },
  ],
  partySize: [
    { id: "1", text: "2 người", value: "2 người" },
    { id: "2", text: "4 người", value: "4 người" },
    { id: "3", text: "6 người", value: "6 người" },
  ],
  location: [
    { id: "1", text: "Quận 1", value: "Quận 1" },
    { id: "2", text: "Quận 3", value: "Quận 3" },
    { id: "3", text: "Quận 7", value: "Quận 7" },
    { id: "4", text: "Gần tôi", value: "Gần tôi" },
  ],
  tableType: [
    { id: "1", text: "VIP", value: "VIP" },
    { id: "2", text: "View đẹp", value: "View đẹp" },
    { id: "3", text: "Bàn thường", value: "Bàn thường" },
  ],
};

// ─── Detect step từ response của Claude ──────────────────────────────────────

function detectStepFromResponse(
  text: string,
  currentStep: BookingStep,
): BookingStep {
  const t = text.toLowerCase();
  if (t.includes("dịp") || t.includes("mục đích") || t.includes("occasion"))
    return "purpose";
  if (t.includes("ngày") || t.includes("date") || t.includes("hôm nay"))
    return "date";
  if (t.includes("giờ") || t.includes("mấy giờ") || t.includes("time"))
    return "time";
  if (
    t.includes("bao nhiêu người") ||
    t.includes("người") ||
    t.includes("người đi")
  )
    return "partySize";
  if (
    t.includes("khu vực") ||
    t.includes("quận") ||
    t.includes("địa điểm") ||
    t.includes("ở đâu")
  )
    return "location";
  if (t.includes("loại bàn") || t.includes("vip") || t.includes("view"))
    return "tableType";
  return currentStep;
}

// ─── Parse search JSON từ Claude response ────────────────────────────────────

function parseSearchJSON(
  text: string,
): (BookingDraft & { restaurantName?: string }) | null {
  try {
    const match = text.match(/\{[\s\S]*?"action"\s*:\s*"search"[\s\S]*?\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (parsed.action !== "search") return null;
    return {
      purpose: parsed.purpose,
      date: parsed.date,
      time: parsed.time,
      partySize: parseInt(parsed.partySize) || 2,
      location: parsed.location,
      tableType: parsed.tableType,
      restaurantName: parsed.restaurantName, // tên nhà hàng cụ thể nếu có
    };
  } catch {
    return null;
  }
}

// ─── Fetch table cards từ DB ──────────────────────────────────────────────────

async function fetchTableCards(
  draft: BookingDraft & { restaurantName?: string },
): Promise<{ cards: TableCard[]; notFound?: boolean }> {
  const cards: TableCard[] = [];
  try {
    let restaurants: any[] = [];

    // Nếu user nhắc tên nhà hàng cụ thể → tìm đúng nhà hàng đó
    if (draft.restaurantName) {
      console.log("[AI] Searching specific restaurant:", draft.restaurantName);
      restaurants = await restaurantApi.searchRestaurants({
        search: draft.restaurantName,
      });
      // Nếu không tìm thấy → nhà hàng chưa hợp tác
      if (!restaurants?.length) {
        console.log("[AI] Restaurant not found in DB:", draft.restaurantName);
        return { cards: [], notFound: true };
      }
    } else {
      // Không có tên cụ thể → tìm theo city
      restaurants = await restaurantApi.searchRestaurants({
        city: draft.location,
      });
      if (!restaurants?.length) {
        console.log("[AI] city not matched, fetching all");
        restaurants = await restaurantApi.searchRestaurants({});
      }
    }

    if (!restaurants?.length) {
      console.log("[AI] DB has no restaurants");
      return { cards: [] };
    }
    console.log("[AI] restaurants found:", restaurants.length);

    // B2: Lấy bàn từng nhà hàng song song
    await Promise.all(
      restaurants.slice(0, 6).map(async (r: any) => {
        try {
          const res = await bookingAPI.getTables(r._id);
          const allTables: any[] = res.data.tables || [];
          console.log("[AI]", r.name, "- total tables:", allTables.length);

          // Filter bàn phù hợp — BỎ filter isAvailable vì field này có thể chưa có trong DB cũ
          const matched = allTables.filter((t) => {
            // Loại bàn: nếu chọn regular hoặc không chọn → lấy tất cả
            const typeOk =
              !draft.tableType ||
              draft.tableType === "regular" ||
              t.type === draft.tableType;

            // Capacity: nới lỏng — chỉ check nếu có data
            const size = draft.partySize || 2;
            const capMin = t.capacity?.min ?? 1;
            const capMax = t.capacity?.max ?? 99;
            const capOk = size >= capMin && size <= capMax;

            // isActive: bàn phải đang hoạt động
            const activeOk = t.isActive !== false;

            return typeOk && capOk && activeOk;
          });

          console.log("[AI]", r.name, "- matched tables:", matched.length);

          matched.slice(0, 2).forEach((t) =>
            cards.push({
              tableId: t._id,
              tableName: t.name,
              tableType: t.type,
              tableImage: t.images?.[0] || "",
              tableImages: t.images || [],
              features: t.features || [],
              description: t.description || "",
              capacity: t.capacity || { min: 2, max: 6 },
              deposit: t.pricing?.baseDeposit || 0,
              isAvailable: true,
              restaurantId: r._id,
              restaurantName: r.name,
              restaurantImage: r.images?.[0] || "",
              restaurantCity: r.city || "",
              restaurantCuisine: r.cuisine || "",
              restaurantRating: r.rating || 0,
              restaurantAddress: r.address || "",
            }),
          );
        } catch {
          /* skip */
        }
      }),
    );
  } catch (err) {
    console.error("[fetchTableCards]", err);
  }
  return { cards };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export const ambleAI = {
  async chat(
    message: string,
    session: AISession = DEFAULT_SESSION,
  ): Promise<{ response: AIResponse; session: AISession }> {
    const msg = message.trim();
    const { step, draft, history } = session;

    try {
      // Gọi Claude với toàn bộ lịch sử hội thoại
      const rawResponse = await callClaude(SYSTEM_PROMPT, history, msg);

      // Cập nhật history
      const newHistory = [
        ...history,
        { role: "user" as const, content: msg },
        { role: "assistant" as const, content: rawResponse },
      ];

      // ── Claude trả về JSON → tìm bàn ────────────────
      const searchDraft = parseSearchJSON(rawResponse);
      if (searchDraft) {
        const result = await fetchTableCards(searchDraft);
        const { cards, notFound } = result;

        // Nhà hàng cụ thể không có trong DB → thông báo chưa hợp tác
        if (notFound && searchDraft.restaurantName) {
          return {
            response: {
              text: `Nhà hàng **${searchDraft.restaurantName}** hiện chưa hợp tác với Amble.\n\nBạn muốn mình tìm nhà hàng tương tự không? 🍽️`,
              quickReplies: [
                {
                  id: "1",
                  text: "🔍 Tìm nhà hàng tương tự",
                  value: "Tìm nhà hàng tương tự",
                },
                { id: "2", text: "🏠 Về trang chủ", value: "thôi không cần" },
              ],
              step: "idle",
              draft: {},
            },
            session: { step: "idle", draft: {}, history: newHistory },
          };
        }

        const resultText =
          cards.length > 0
            ? `Tìm thấy **${cards.length} bàn** phù hợp! Chọn bàn bạn thích nhé 👇`
            : `Hiện không có bàn trống phù hợp.\nBạn có muốn thử khu vực khác không?`;

        const noResultReplies: QuickReply[] = [
          { id: "1", text: "Thử khu vực khác", value: "Thử khu vực khác" },
          { id: "2", text: "Đổi ngày", value: "Tôi muốn đổi ngày" },
        ];

        return {
          response: {
            text: resultText,
            tableCards: cards.length > 0 ? cards : undefined,
            quickReplies: cards.length === 0 ? noResultReplies : undefined,
            step: "results",
            draft: searchDraft,
            bookingContext: searchDraft,
          },
          session: { step: "results", draft: searchDraft, history: newHistory },
        };
      }

      // ── Claude trả về text thông thường ─────────────
      // Ẩn JSON thô nếu AI vô tình trả về trong text
      const cleanText = rawResponse
        .replace(/\{[\s\S]*?"action"[\s\S]*?\}/g, "")
        .trim();

      const nextStep = detectStepFromResponse(rawResponse, step);
      const quickReplies =
        STEP_QUICK_REPLIES[nextStep] || STEP_QUICK_REPLIES["idle"];

      return {
        response: {
          text: cleanText || rawResponse,
          quickReplies,
          step: nextStep,
          draft,
        },
        session: { step: nextStep, draft, history: newHistory },
      };
    } catch (err) {
      console.warn("[ambleAI.chat]", err);
      return {
        response: {
          text: "Mình đang gặp sự cố nhỏ, bạn thử lại sau nhé!",
          quickReplies: STEP_QUICK_REPLIES["idle"],
          step,
          draft,
        },
        session,
      };
    }
  },
};
