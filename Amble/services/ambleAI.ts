import { restaurantApi } from "./restaurantApi";
import { API_BASE_URL, bookingAPI } from "./api";
import type { QuickReply, TableCard } from "../types/chat";

const devLog = {
  log: (...args: any[]) => { if (__DEV__) console.log(...args); },
  warn: (...args: any[]) => { if (__DEV__) console.warn(...args); },
  error: (...args: any[]) => { if (__DEV__) console.error(...args); },
};

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
  tablePreference?: string;
  restaurantName?: string;
  maxDeposit?: number;
  minDeposit?: number;
  deposit?: number;
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

// ─── Gọi AI qua BE proxy ───────────────────

const BE_URL = API_BASE_URL;

async function callBackendAI(
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
    console.warn("[callBackendAI] upstream error:", res.status, errText);

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

function getSystemPrompt() {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return `Bạn là Munchy — trợ lý đặt bàn thông minh của MunchMap.
Hôm nay: ${today}. Bây giờ là: ${currentTime}

## TÍNH CÁCH & PHONG CÁCH
- NGUYÊN TẮC NGÔN NGỮ: User hỏi tiếng Việt → trả lời tiếng Việt. User hỏi tiếng Anh → trả lời tiếng Anh.
- Trò chuyện tự nhiên, thân thiện nhưng không dông dài.
- Khi user muốn đặt bàn → ưu tiên hỏi thông tin cần thiết (ngày, giờ, số người, khu vực), không lan man sang chuyện khác.
- Có thể thêm 1 câu nhẹ nhàng kiểu "Tối mai 19h đẹp đó!" nhưng đừng lạm dụng.
- Không hỏi "có thêm ai đi chung không" khi user đã nói số người.
- Nếu user chat phiếm → trả lời tự nhiên, có thể hỏi lại có muốn đặt bàn không.

## CÁCH XỬ LÝ ĐẶT BÀN
Khi user muốn đặt bàn, hỏi từng thứ một, mỗi câu 1 thông tin:
1. NGÀY (sau 21h → gợi ý ngày mai)
2. GIỜ — **QUAN TRỌNG: nếu user chọn giờ đã qua trong ngày hôm nay (ví dụ: bây giờ là 20h mà user đòi đặt 19h) → từ chối nhẹ nhàng và gợi ý giờ sớm nhất có thể (giờ hiện tại + 1 tiếng)**
3. SỐ NGƯỜI
4. KHU VỰC (nếu có GPS thì dùng luôn, khỏi hỏi)
5. LOẠI BÀN (nếu cần)

Lưu ý: không gộp ngày+giờ chung câu. Không hỏi lại thông tin user đã nói. Có thể thêm 1 câu nhẹ nhàng nhưng đừng lạc đề.

## KHI NÀO TRẢ JSON
Khi đã thu thập đủ thông tin đặt bàn (ngày + giờ + số người + địa điểm) → LẬP TỨC trả JSON, không nói thêm gì.
- Nếu user chọn nhà hàng cụ thể → thêm "restaurantName" vào JSON
- KHÔNG tóm tắt, KHÔNG hỏi lại, KHÔNG xác nhận — chỉ trả JSON

2 loại JSON (CHỈ dùng 2 action này, không dùng action khác):
- search_restaurants: tìm nhà hàng
  {"action":"search_restaurants","location":"Quan 7"}
- search: tìm bàn cụ thể
  {"action":"search","date":"${today}","time":"19:00","partySize":2,"location":"Quan 1","tableType":"view"}

## MẶC ĐỊNH MỀM
Khi user không nói rõ: purpose=casual, partySize=2, location=Hồ Chí Minh, time=19:00.

## LỌC THEO GIÁ CỌC
- "bàn 200k" → thêm "deposit":200000 vào JSON
- "từ 200k đến 500k" → thêm "minDeposit":200000,"maxDeposit":500000
- "dưới 300k" → thêm "maxDeposit":300000
- KHÔNG tự thêm deposit nếu user không đề cập đến giá
- Chỉ gửi số, không gửi chữ "k" (200k = 200000)`;
}


// ─── Detect step từ response của Claude ──────────────────────────────────────

function detectStepFromResponse(
  text: string,
  currentStep: BookingStep,
): BookingStep {
  const t = text.toLowerCase();
  if (t.includes("dịp") || t.includes("mục đích") || t.includes("occasion"))
    return "purpose";
  // Bàn/view KIỂM TRA TRƯỚC — "view đẹp" không bị "ngày mai" đè
  if (t.includes("loại bàn") || t.includes("vip") || t.includes("view") || t.includes("bàn nào") || t.includes("kiểu bàn"))
    return "tableType";
  // Số người KIỂM TRA TRƯỚC giờ — "mấy người" không bị "Giờ 19:00" đè
  if (t.includes("bao nhiêu người") || t.includes("mấy người") || t.includes("bao người"))
    return "partySize";
  // Giờ KIỂM TRA TRƯỚC ngày
  if (t.includes("giờ nào") || t.includes("mấy giờ") || t.includes("time") || t.includes("thời gian") || t.includes("lúc nào"))
    return "time";
  if (t.includes("ngày") || t.includes("date") || t.includes("hôm nay") || t.includes("ngày mai"))
    return "date";
  if (
    t.includes("khu vực") ||
    t.includes("quận") ||
    t.includes("địa điểm") ||
    t.includes("ở đâu") ||
    t.includes("thành phố")
  )
    return "location";
  // Nếu không detect được gì mới → giữ nguyên step hiện tại
  return currentStep;
}

// ─── Parse search JSON từ Claude response ────────────────────────────────────

function parseSearchJSON(
  text: string,
): (BookingDraft & { action?: "search" | "search_restaurants"; restaurantName?: string }) | null {
  try {
    const match = text.match(/\{[\s\S]*?["'][aA]ction["']\s*:\s*["']search[^"']*["'][\s\S]*?\}/);
    if (!match) return null;
    // Chuan hoa single quotes -> double quotes de JSON.parse khong bi loi
    let jsonStr = match[0].replace(/['\u2018\u2019]/g, '"');
    const parsed = JSON.parse(jsonStr);
    if (parsed.action !== "search" && parsed.action !== "search_restaurants" && parsed.action !== "reserve") return null;
    return {
      action: parsed.action,
      purpose: parsed.purpose,
      date: parsed.date,
      time: parsed.time,
      partySize: parsed.partySize ? parseInt(parsed.partySize) : undefined,
      location: parsed.location,
      tableType: parsed.tableType,
      tablePreference: parsed.tablePreference,
      restaurantName: parsed.restaurantName,
      maxDeposit: parsed.maxDeposit ? parseInt(parsed.maxDeposit) : undefined,
      minDeposit: parsed.minDeposit ? parseInt(parsed.minDeposit) : undefined,
      deposit: parsed.deposit ? parseInt(parsed.deposit) : undefined,
    };
  } catch {
    return null;
  }
}

function withSoftDefaults(draft: BookingDraft & { restaurantName?: string }) {
  return {
    purpose: draft.purpose || "casual",
    date: draft.date,
    time: draft.time || "19:00",
    partySize: draft.partySize || 2,
    location: draft.location || "Hồ Chí Minh",
    tableType: draft.tableType || "regular",
    tablePreference: draft.tablePreference,
    restaurantName: draft.restaurantName,
    maxDeposit: draft.maxDeposit,
    minDeposit: draft.minDeposit,
    deposit: draft.deposit,
  } satisfies BookingDraft & { restaurantName?: string };
}

function buildSoftFollowUp(draft: BookingDraft): string {
  const hints: string[] = [];
  if (!draft.date || !draft.time) hints.push("ngày giờ");
  if (!draft.partySize) hints.push("số người");
  if (!draft.tableType && !draft.tablePreference) hints.push("kiểu bàn/vị trí bàn");
  if (!draft.location) hints.push("khu vực");

  if (!hints.length) return "";
  return `\n\nMình đang tạm gợi ý theo thông tin hiện có. Nếu muốn chuẩn hơn, bạn nói thêm ${hints.slice(0, 3).join(", ")} nhé.`;
}

function normalizeSearchText(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tableMatchesPreference(table: any, preference?: string): boolean {
  if (!preference) return true;
  const pref = normalizeSearchText(preference);
  const searchable = normalizeSearchText([
    table.name,
    table.type,
    table.description,
    ...(table.features || []),
  ].join(" "));

  const keywordGroups = [
    ["view", "cua so", "ngoai troi", "ban cong", "san vuon", "rooftop"],
    ["rieng tu", "private", "yen tinh", "goc rieng"],
    ["vip"],
    ["thuong", "regular", "standard"],
  ];

  const requestedKeywords = keywordGroups
    .flat()
    .filter((keyword) => pref.includes(keyword));

  if (!requestedKeywords.length) return true;
  return requestedKeywords.some((keyword) => searchable.includes(keyword));
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
      devLog.log("[AI] Searching specific restaurant:", draft.restaurantName);
      restaurants = await restaurantApi.searchRestaurants({
        search: draft.restaurantName,
      });
      // Nếu không tìm thấy → nhà hàng chưa hợp tác
      if (!restaurants?.length) {
        devLog.log("[AI] Restaurant not found in DB:", draft.restaurantName);
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
      devLog.log("[AI] DB has no restaurants");
      return { cards: [] };
    }
    devLog.log("[AI] restaurants found:", restaurants.length);

    // B2: Lấy bàn từng nhà hàng song song
    await Promise.all(
      restaurants.slice(0, 6).map(async (r: any) => {
        try {
          const res = await bookingAPI.getTables(r._id);
          const allTables: any[] = res.data.tables || [];
          devLog.log("[AI]", r.name, "- total tables:", allTables.length);

          // Filter bàn phù hợp — BỎ filter isAvailable vì field này có thể chưa có trong DB cũ
          const matched = allTables.filter((t) => {
            // Loại bàn: chỉ filter nếu type hợp lệ, không thì bỏ qua (dùng tablePreference thay)
            const validTypes = ["vip", "view", "regular", "standard"];
            const typeOk =
              !draft.tableType ||
              !validTypes.includes(draft.tableType) ||
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

            const preferenceOk = tableMatchesPreference(t, draft.tablePreference);

            return typeOk && capOk && activeOk && depositOk && preferenceOk;
          });

          devLog.log("[AI]", r.name, "- matched tables:", matched.length);

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
    userContext = "",
  ): Promise<{ response: AIResponse; session: AISession }> {
    const msg = message.trim();
    const { step, draft, history } = session;

    try {
      // Gọi Claude với toàn bộ lịch sử hội thoại + context cá nhân
      const systemPrompt = userContext ? `${getSystemPrompt()}\n\n## THÔNG TIN NGƯỜI DÙNG\n${userContext}` : getSystemPrompt();
      const rawResponse = await callBackendAI(systemPrompt, history, msg);

      // Cập nhật history
      const newHistory = [
        ...history,
        { role: "user" as const, content: msg },
        { role: "assistant" as const, content: rawResponse },
      ];

      // ── Claude trả về JSON → tìm NH hoặc bàn ──────
      const searchDraft = parseSearchJSON(rawResponse);
      const rawText = rawResponse;
      devLog.log("[AI] rawResponse:", rawResponse.slice(0, 200));
      if (searchDraft) {
        devLog.log("[AI] searchDraft.location:", searchDraft.location, "| action:", rawText.includes("search_restaurants") ? "search_restaurants" : "search");
        // Nếu là search_restaurants => liệt kê NH, không fetch bàn
        const isRestaurantSearch = searchDraft.action === "search_restaurants";

        if (isRestaurantSearch) {
          const restaurantLocation = searchDraft.location || "Hồ Chí Minh";

          devLog.log("[AI] search_restaurants location:", restaurantLocation);
          const restResult = await restaurantApi.searchRestaurants({ search: restaurantLocation });
          devLog.log("[AI] search_restaurants results:", restResult?.length);
          if (!restResult?.length) {
            return {
              response: {
                text: "Hiện không có nhà hàng ở " + restaurantLocation + ".\nBạn muốn thử khu vực khác không?",
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
              text: "Tìm thấy **" + restResult.length + " nhà hàng** ở **" + restaurantLocation + "**! 👇" + (!searchDraft.location ? "\n\nMình tạm tìm ở Hồ Chí Minh trước. Bạn muốn đổi khu vực nào thì nói mình nhé." : ""),
              restaurants: restResult,
              step: "results",
              draft: { ...searchDraft, location: restaurantLocation },
            },
            session: { step: "results", draft: { ...searchDraft, location: restaurantLocation }, history: newHistory },
          };
        }

        // search => tìm bàn (flow cũ)
        const searchDraftWithDefaults = withSoftDefaults(searchDraft);
        const result = await fetchTableCards(searchDraftWithDefaults);
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
            ? `Tìm thấy **${cards.length} bàn** khá hợp gu! Chọn bàn bạn thích nhé 👇${buildSoftFollowUp(searchDraft)}`
            : `Hiện chưa thấy bàn thật khớp.\nBạn có muốn đổi khu vực, số người hoặc kiểu bàn không?`;

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
            draft: searchDraftWithDefaults,
            bookingContext: searchDraftWithDefaults,
          },
          session: { step: "results", draft: searchDraftWithDefaults, history: newHistory },
        };
      }

      // ── Claude trả về text thông thường ─────────────
      // Ẩn JSON thô nếu AI vô tình trả về trong text
      const cleanText = rawResponse
        .replace(/\{[\s\S]*?"action"[\s\S]*?\}/g, "")
        .trim();

      const nextStep = detectStepFromResponse(rawResponse, step);
      const quickReplies =
        [];

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
          quickReplies: [],
          step,
          draft,
        },
        session,
      };
    }
  },
};
