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
  maxDeposit?: number;
  minDeposit?: number;
  deposit?: number;
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

const BE_URL = "https://amblebooking-production.up.railway.app/api";

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

const SYSTEM_PROMPT = `Bạn là munchmap AI — trợ lý đặt bàn thông minh của munchmap.
Hôm nay: 2026-06-01

## QUY TẮC VÀNG
- Luôn thân thiện, tự nhiên, ngắn gọn (tối đa 2-3 câu)
- KHÔNG hỏi từng câu riêng lẻ — gộp tối đa thông tin cần hỏi vào 1 câu
- Khi đã đủ thông tin → CHỈ trả JSON, KHÔNG thêm bất kỳ chữ nào ngoài JSON

## KHI NÀO TRẢ JSON?
Chỉ trả JSON khi hội tụ ĐỦ các điều kiện:
1. Đã biết mục đích (hoặc có thể mặc định "casual")
2. Đã biết ngày (hoặc có thể mặc định hôm nay)
3. Đã biết giờ (hoặc có thể mặc định 19:00)
4. Đã biết số người (hoặc có thể mặc định 2)
5. Đã biết khu vực / thành phố (hoặc có thể mặc định "Hồ Chí Minh")
6. Đã biết loại bàn (hoặc có thể mặc định "regular")

## HAI LOẠI JSON: "search_restaurants" vs "search"

Dung action:"search_restaurants" khi:
- User muon tim / xem / goi y nha hang
- User hoi "co nha hang nao o...", "quan ngon o...", "nha hang Quan 7"
- Ket qua: liet ke NHA HANG (ten, dia chi, danh gia)
- JSON: {"action":"search_restaurants","location":"Quan 7"}

Dung action:"search" khi:
- User muon dat ban, tim ban cu the, xem ban trong
- User noi "ban", "dat ban", "coc", "tim ban"
- Ket qua: liet ke BAN voi gia, suc chua, hinh anh
- JSON: {"action":"search","purpose":"date","date":"2026-03-14","time":"19:00","partySize":2,"location":"Quan 1","tableType":"regular"}

## LOC THEO GIA COC (3 che do):
- Chinh xac: user noi "ban 300k" => them "deposit":300000 vao JSON
- Trong khoang: user noi "tu 200k den 500k" => them "minDeposit":200000,"maxDeposit":500000
- Toi da: user noi "duoi 300k" => them "maxDeposit":300000

VD: {"action":"search","deposit":300000,"location":"Quan 1"}

## QUAN TRONG - PHAN BIET RO:
- "tim nha hang" => search_restaurants (chi liet ke nha hang)
- "tim ban" / "dat ban" => search (liet ke ban + gia coc)

## GIÁ TRỊ MẶC ĐỊNH (nếu user không cung cấp):
purpose=casual, date=hôm nay, time=19:00, partySize=2, location=Hồ Chí Minh, tableType=regular

## QUAN TRỌNG - XỬ LÝ ĐỊA ĐIỂM:
- Đặt location là địa điểm user yêu cầu (VD: "Quận 1", "Thủ Đức", "Hồ Chí Minh", "Hà Nội")
- Hệ thống sẽ tìm kiếm trong cả city và address, nên có thể dùng tên quận/huyện hoặc thành phố
- Nếu user không nói địa điểm → location mặc định "Hồ Chí Minh"

## CÁC TRƯỜNG HỢP ĐẶC BIỆT
- Chào hỏi → chào lại + giới thiệu ngắn munchmap AI + gợi ý đặt bàn
- Hỏi "munchmap là gì" → app đặt bàn nhà hàng tại Việt Nam, giới thiệu ngắn
- Câu hỏi không liên quan đặt bàn → trả lời ngắn 1 câu rồi gợi ý đặt bàn
- User nói "tuỳ", "gì cũng được", "sao cũng được" → DÙNG GIÁ TRỊ MẶC ĐỊNH, trả JSON NGAY, không hỏi thêm

## FEW-SHOT MẪU
User: "Đặt bàn hẹn hò ở Sài Gòn"
AI: {"action":"search","purpose":"date","date":"2026-03-14","time":"19:00","partySize":2,"location":"Hồ Chí Minh","tableType":"regular"}

User: "Nhà hàng Sakura"
AI: {"action":"search","purpose":"casual","date":"2026-03-14","time":"19:00","partySize":2,"location":"Hồ Chí Minh","tableType":"regular","restaurantName":"Sakura"}

User: "Hello"
AI: Chào bạn! Mình là munchmap AI, trợ lý đặt bàn thông minh. Bạn muốn đặt bàn hẹn hò, gia đình hay tìm nhà hàng ngon?`;

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
    { id: "1", text: "Hồ Chí Minh", value: "Hồ Chí Minh" },
    { id: "2", text: "Hà Nội", value: "Hà Nội" },
    { id: "3", text: "Đà Nẵng", value: "Đà Nẵng" },
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
    const match = text.match(/\{[\s\S]*?["'][aA]ction["']\s*:\s*["']search[^"']*["'][\s\S]*?\}/);
    if (!match) return null;
    // Chuan hoa single quotes -> double quotes de JSON.parse khong bi loi
    let jsonStr = match[0].replace(/['\u2018\u2019]/g, '"');
    const parsed = JSON.parse(jsonStr);
    if (parsed.action !== "search" && parsed.action !== "search_restaurants") return null;
    return {
      purpose: parsed.purpose,
      date: parsed.date,
      time: parsed.time,
      partySize: parseInt(parsed.partySize) || 2,
      location: parsed.location,
      tableType: parsed.tableType,
      restaurantName: parsed.restaurantName,
      maxDeposit: parsed.maxDeposit ? parseInt(parsed.maxDeposit) : undefined,
      minDeposit: parsed.minDeposit ? parseInt(parsed.minDeposit) : undefined,
      deposit: parsed.deposit ? parseInt(parsed.deposit) : undefined,
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
        search: draft.location,
      });
      // KHONG fallback lay tat ca - neu khong tim thay thi tra ve rong
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

            // Giá cọc: 3 chế độ — chính xác / trong khoảng / tối đa
            const baseDep = t.pricing?.baseDeposit || 0;
            const depositOk = draft.deposit
              ? baseDep === draft.deposit          // chính xác: "bàn giá 300k" → deposit=300000
              : draft.minDeposit
                ? baseDep >= draft.minDeposit && baseDep <= (draft.maxDeposit || Infinity)  // khoảng: "200k-500k" → min=200k, max=500k
                : !draft.maxDeposit || baseDep <= draft.maxDeposit;  // tối đa: "dưới 300k" → maxDeposit=300k

            return typeOk && capOk && activeOk && depositOk;
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

      // ── Claude trả về JSON → tìm NH hoặc bàn ──────
      const searchDraft = parseSearchJSON(rawResponse);
      const rawText = rawResponse;
      console.log("[AI] rawResponse:", rawResponse.slice(0, 200));
      if (searchDraft) {
        console.log("[AI] searchDraft.location:", searchDraft.location, "| action:", rawText.includes("search_restaurants") ? "search_restaurants" : "search");
        // Nếu là search_restaurants => liệt kê NH, không fetch bàn
        const isRestaurantSearch = rawText.includes('"action":"search_restaurants"');

        if (isRestaurantSearch) {
          console.log("[AI] search_restaurants location:", searchDraft.location);
          const restResult = await restaurantApi.searchRestaurants({ search: searchDraft.location || "" });
          console.log("[AI] search_restaurants results:", restResult?.length);
          if (!restResult?.length) {
            return {
              response: {
                text: "Hiện không có nhà hàng ở " + (searchDraft.location || "khu vực này") + ".\nBạn muốn thử khu vực khác không?",
                quickReplies: [
                  { id: "1", text: "Thử khu vực khác", value: "Thử khu vực khác" },
                  { id: "2", text: "Tìm tất cả", value: "Tìm tất cả nhà hàng" },
                ],
                step: "results",
                draft: searchDraft,
                restaurants: [],
              },
              session: { step: "results", draft: searchDraft, history: newHistory },
            };
          }
          return {
            response: {
              text: "Tìm thấy **" + restResult.length + " nhà hàng** ở **" + searchDraft.location + "**! 👇",
              restaurants: restResult,
              step: "results",
              draft: searchDraft,
            },
            session: { step: "results", draft: searchDraft, history: newHistory },
          };
        }

        // search => tìm bàn (flow cũ)
        const result = await fetchTableCards(searchDraft);
        const { cards, notFound } = result;

        // Nhà hàng cụ thể không có trong DB → thông báo chưa hợp tác
        if (notFound && searchDraft.restaurantName) {
          return {
            response: {
              text: `Nhà hàng **${searchDraft.restaurantName}** hiện chưa hợp tác với munchmap.\n\nBạn muốn mình tìm nhà hàng tương tự không? 🍽️`,
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
