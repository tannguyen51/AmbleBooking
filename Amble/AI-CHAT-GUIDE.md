# Amble AI Chatbot - Hướng dẫn & Luồng hoạt động

## Tổng quan

Amble AI là chatbot đặt bàn thông minh, giúp người dùng tìm nhà hàng và đặt bàn qua chat. Backend gọi OpenRouter API (Claude/GPT) để sinh phản hồi tự nhiên.

**File chính:**
- `Amble/services/ambleAI.ts` - Core AI logic
- `Amble/app/(tabs)/chat.tsx` - Chat UI
- `Amble/types/chat.ts` - Types
- `BE/routes/ai.js` - OpenRouter proxy

---

## Luồng đặt bàn (8 bước)

```
IDLE → PURPOSE → DATE → TIME → PARTY_SIZE → LOCATION → TABLE_TYPE → RESULTS
```

---

### Bước 1: IDLE (Khởi động)

User mở chat lần đầu hoặc chưa có ngữ cảnh.

**AI nói:**
> Chào bạn! Mình là Amble AI, trợ lý đặt bàn thông minh. Bạn muốn đặt bàn hẹn hò, gia đình hay tìm nhà hàng ngon?

**Chips hiển thị:**

| `Đặt bàn hẹn hò` | `Đặt bàn gia đình` | `Tìm nhà hàng ngon` |

**User trả lời mẫu:**
- "Đặt bàn hẹn hò"
- "Tôi muốn tìm nhà hàng ngon ở Quận 1"
- "Đặt bàn cho gia đình 4 người"

---

### Bước 2: PURPOSE (Mục đích)

Nếu user chưa nói mục đích, AI hỏi thêm.

**AI nói:**
> Bạn muốn đặt bàn cho dịp gì? Hẹn hò, gia đình hay công việc?

**Chips hiển thị:**

| `Hẹn hò` | `Gia đình` | `Công việc` | `Kỷ niệm` |

**User trả lời mẫu:**
- "Hẹn hò"
- "Đi sinh nhật"
- "Họp mặt bạn bè"

---

### Bước 3: DATE (Ngày)

AI hỏi ngày muốn đặt bàn. **Sau 21h → tự động gợi ý ngày mai.**

**AI nói (trước 21h):**
> Bạn muốn đặt bàn vào ngày nào?

**AI nói (sau 21h):**
> Giờ này nhà hàng sắp đóng cửa rồi. Bạn muốn đặt bàn cho ngày mai nhé?

**Chips hiển thị:**

| `Hôm nay` | `Ngày mai` | `Thứ 7 này` |

**User trả lời mẫu:**
- "Ngày mai"
- "Thứ 7 tuần này"
- "14/6"

---

### Bước 4: TIME (Giờ)

AI hỏi giờ. **KHÔNG hỏi kèm ngày** — mỗi bước chỉ 1 câu hỏi.

**AI nói:**
> Bạn muốn đặt bàn vào lúc mấy giờ?

**Chips hiển thị:**

| `12:00` | `18:00` | `19:00` | `20:00` |

**User trả lời mẫu:**
- "19:00"
- "7 giờ tối"
- "20:30"

---

### Bước 5: PARTY_SIZE (Số người)

AI hỏi số người đi.

**AI nói:**
> Bạn đi bao nhiêu người?

**Chips hiển thị:**

| `2 người` | `4 người` | `6 người` |

**User trả lời mẫu:**
- "2 người"
- "4 người"
- "6 người"

---

### Bước 6: LOCATION (Khu vực)

AI hỏi khu vực hoặc thành phố.

**AI nói:**
> Bạn muốn đặt bàn ở khu vực nào? Hồ Chí Minh, Hà Nội hay Đà Nẵng?

**Chips hiển thị:**

| `Hồ Chí Minh` | `Hà Nội` | `Đà Nẵng` | `Gần tôi` |

**User trả lời mẫu:**
- "Quận 1"
- "Hồ Chí Minh"
- "Gần tôi"

---

### Bước 7: TABLE_TYPE (Loại bàn)

AI hỏi kiểu bàn/vị trí bàn.

**AI nói:**
> Bạn thích bàn như thế nào? VIP, view đẹp, gần cửa sổ hay riêng tư?

**Chips hiển thị:**

| `VIP` | `View đẹp` | `Bàn thường` | `Gần cửa sổ` | `Riêng tư` |

**User trả lời mẫu:**
- "View đẹp"
- "VIP"
- "Gần cửa sổ, riêng tư"

---

### Bước 8: RESULTS (Kết quả)

Khi đã đủ thông tin → AI trả JSON → Frontend gọi API tìm bàn → hiển thị **Table Cards** kèm ảnh, giá, sức chứa.

**AI nói (kèm table cards):**
> Mình tìm thấy 3 bàn phù hợp ở Quận 1. Bạn xem bàn nào hợp ý nhé!

**Table Cards hiển thị:**
- Ảnh bàn, tên bàn, loại bàn
- Sức chứa, giá cọc
- Nút "Đặt bàn"

---

## Cách AI phản hồi

### Khi nào trả lời bằng text
- Chưa đủ thông tin → hỏi thêm 1-2 câu tự nhiên
- Chào hỏi, câu hỏi không liên quan

### Khi nào trả JSON
- Đã đủ ý định tìm/đặt bàn rõ ràng

**2 loại JSON:**
```json
// Tìm nhà hàng
{"action":"search_restaurants","location":"Quan 7"}

// Tìm bàn cụ thể
{"action":"search","purpose":"date","date":"2026-06-14","time":"19:00","partySize":2,"location":"Quan 1","tableType":"view"}
```

---

## Cách detect step từ AI response

File: `ambleAI.ts` → `detectStepFromResponse()`

| Từ khóa | Step |
|----------|------|
| "dịp", "mục đích" | PURPOSE |
| "view", "vip", "bàn nào", "kiểu bàn" | TABLE_TYPE (kiểm tra TRƯỚC) |
| "giờ", "thời gian", "lúc nào" | TIME (kiểm tra TRƯỚC ngày) |
| "ngày", "hôm nay", "ngày mai" | DATE |
| "người", "mấy người" | PARTY_SIZE |
| "quận", "ở đâu", "khu vực", "thành phố" | LOCATION |

---

## System Prompt chính

File: `ambleAI.ts` → `getSystemPrompt()`

**Quy tắc vàng:**
1. Thân thiện, tự nhiên, 2-3 câu
2. KHÔNG biến thành form bắt buộc
3. Khi đủ thông tin → CHỈ trả JSON
4. Hỏi từng thứ một: ngày → giờ → số người → khu vực → loại bàn

**Mặc định mềm:** purpose=casual, partySize=2, location=HCM, tableType=regular, time=19:00

---

## Môi trường

**Backend (BE/.env):**
```
OPENROUTER_API_KEY=sk-or-v1-...
AI_MODELS=anthropic/claude-3.5-haiku,openai/gpt-4o-mini
```

**Frontend (Amble/.env):**
```
EXPO_PUBLIC_API_URL=https://amblebooking-production.up.railway.app/api
```

---

## Các lỗi đã sửa

| # | Lỗi | Sửa |
|---|-----|-----|
| 1 | Circular import `types/chat.ts` ↔ `ambleAI.ts` | Chuyển QuickReply, TableCard sang types/chat.ts |
| 2 | Ngày cứng `2026-06-02` trong prompt | Đổi thành `getSystemPrompt()` tự động lấy ngày |
| 3 | "thời gian" không detect được step TIME | Thêm `"thời gian"` vào từ khóa |
| 4 | "giờ nào hôm nay" → step DATE sai | TIME check TRƯỚC DATE |
| 5 | "view đẹp" → step DATE sai | TABLE_TYPE check TRƯỚC tất cả |
| 6 | Duplicate key khi gộp chips date+time | Bỏ gộp, mỗi bước 1 loại chips |
| 7 | AI hỏi ngày+giờ cùng lúc | Prompt: hỏi tuần tự từng cái |
| 8 | Sau 21h vẫn gợi ý hôm nay | Prompt: sau 21h → gợi ý ngày mai |

---

## Test nhanh

```bash
cd Amble
npx expo start --clear
```

Chat thử: "Đặt bàn hẹn hò" → AI hỏi ngày → chọn ngày → AI hỏi giờ → chọn giờ → ...
