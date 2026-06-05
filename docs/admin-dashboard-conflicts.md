# Báo cáo Phân tích Xung đột & Migration Plan

## 1. Tổng quan các vùng bị ảnh hưởng

| Vùng | Mức độ | Số file | Critical |
|------|--------|---------|----------|
| Booking logic (controller) | 🔴 CRITICAL | 3 | 15+ conflicts |
| Payment flow (PayOS + Bank) | 🔴 CRITICAL | 6 | 10+ conflicts |
| Table status management | 🔴 CRITICAL | 4 | 8+ conflicts |
| Frontend Booking (select-table) | 🔴 CRITICAL | 2 | 12+ conflicts |
| Partner Dashboard | 🟡 HIGH | 3 | 6+ conflicts |
| Admin Dashboard | 🟡 HIGH | 2 | 4+ conflicts |
| Background jobs | 🔴 CRITICAL | 4 | Xóa toàn bộ |
| i18n translations | 🟢 MEDIUM | 1 | 10+ keys |
| Scripts (debug) | 🟢 LOW | 8 | Chỉnh sửa nhỏ |

---

## 2. Phân tích chi tiết từng Conflict

### 2.1 Conflict #1: Xóa `duration` / `bufferTime` / `expectedEndTime` / `gracePeriodEndTime` / `mealTime`

**Mức độ: 🔴 CRITICAL** - Cần sửa ngay, ảnh hưởng booking flow

**File bị ảnh hưởng:**

| File | Dòng | Vấn đề |
|------|------|--------|
| `BE/models/booking.js` | 32-42 | Schema định nghĩa `mealTime`, `duration`, `durationAdjustment`, `expectedEndTime`, `bufferTime`, `gracePeriodEndTime` |
| `BE/controllers/bookingController.js` | 6, 191-233 | Import `computeBookingDuration`, dùng để tính duration overlap, set vào booking khi tạo |
| `BE/services/bookingDuration.js` | 1-143 | TOÀN BỘ file - đây là service tính duration |
| `BE/controllers/partnerDashboardController.js` | 100-101, 122 | `getOrders` trả về `duration` và `expectedEndTime` |
| `Amble/app/booking/select-table.tsx` | 36-59, 143-165, 234-238, 642-692 | TOÀN BỘ UI duration: tabs mealTime, adjustment buttons, expected time display |
| `Amble/app/booking/confirm.tsx` | 67-88, 205, 353-360 | Nhận params duration, hiển thị expectedEndTime, gửi `durationAdjustment` |
| `Amble/app/(partner)/dashboard.tsx` | 407, 415-416 | Hiển thị `expectedEndTime` và `duration` |
| `Amble/app/(partner)/orders.tsx` | 56, 67, 117 | Status labels (không phải duration nhưng filter logic) |
| `Amble/services/api.ts` | 123 | `durationAdjustment` trong createBooking payload |

**Hướng giải quyết:**

**A. Backend - Model (`models/booking.js`):**
```javascript
// XÓA các field này khỏi bookingDetails:
// - mealTime, duration, durationAdjustment, expectedEndTime, bufferTime, gracePeriodEndTime
// GIỮ LẠI: date, time, partySize, purpose, specialRequests

bookingDetails: {
  date:      { type: String, required: true },
  time:      { type: String, required: true },
  partySize: { type: Number, required: true },
  purpose:   { type: String, default: 'casual' },
  specialRequests: { type: String, default: '' }, // CÓ THỂ GIỮ hoặc chuyển lên customerInfo
}
```

**B. Backend - Service (`services/bookingDuration.js`):**
```javascript
// XÓA TOÀN BỘ FILE
// Thay thế bằng file đơn giản chỉ chứa time slot validation (nếu cần)
// services/timeUtils.js
module.exports = {
  isValidBookingTime: (time, openingHours) => { /* kiểm tra giờ trong khung hoạt động */ },
  calculateGracePeriodEnd: (startTime, graceMinutes) => { /* optional, nếu cần no-show timer */ },
};
```

**C. Backend - Controller (`controllers/bookingController.js`):**

Trong `createBooking`:
```javascript
// THAY THẾ overlap checking dùng expectedEndTime bằng:
// Đơn giản: kiểm tra table có booking confirmed/occupied cùng ngày+giờ không
const existingBooking = await Booking.findOne({
  tableId,
  'bookingDetails.date': date,
  'bookingDetails.time': time,
  status: { $in: ['pending', 'confirmed', 'occupied'] }
});

if (existingBooking) {
  return res.status(409).json({
    success: false,
    message: `Bàn này đã được đặt lúc ${time}. Vui lòng chọn giờ khác.`
  });
}
```

**D. Frontend - `select-table.tsx`:**
```javascript
// XÓA TOÀN BỘ:
// - getDefaultDuration(), getBufferTime(), getMealTime(), calcEndTime()
// - mealTime state và meal tabs (Lunch/Dinner)
// - durationAdjustment state và +/- buttons
// - expectedEndTime và "time - expectedTime" display
// - duration, bufferTime, expectedEndTime, durationAdjustment khỏi params push

// GIỮ LẠI:
// - date picker
// - time picker (đơn giản, hiển thị tất cả các giờ trong ngày)
// - guest stepper
// - table grid
// - table drawer

// MỚI: params gửi đi chỉ gồm:
params: {
  restaurantId, restaurantName,
  tableId, tableName, tableType, tableImage,
  deposit: sel.pricing.baseDeposit.toString(),
  date: dateStr,
  time,
  partySize: guests.toString(),
}
```

**E. Frontend - `confirm.tsx`:**
```javascript
// XÓA khỏi useLocalSearchParams:
// - mealTime, duration, expectedEndTime, durationAdjustment, bufferTime

// XÓA khỏi create payload:
// - purpose (có thể giữ nếu muốn)
// - durationAdjustment

// XÓA UI hiển thị expectedEndTime (dòng 353-360)

// GIỮ LẠI flow PayOS và Bank Transfer như cũ
```

**F. Partner Dashboard (`dashboard.tsx`):**
```javascript
// Dòng 407: Xóa expectedEndTime hiển thị
// Dòng 414-416: Xóa duration hiển thị
// Thay bằng: chỉ hiển thị time của booking
```

---

### 2.2 Conflict #2: Xóa background jobs

**Mức độ: 🔴 CRITICAL** - Cần xóa ngay, nếu không sẽ tự động release bàn

**File bị ảnh hưởng:**

| File | Action |
|------|--------|
| `BE/services/bookingAutoCompleteService.js` | ❌ XÓA |
| `BE/services/tableCleanupService.js` | ❌ XÓA |
| `BE/services/pendingPaymentCleanupService.js` | ❌ XÓA |
| `BE/services/bookingPendingConfirmationCleanupService.js` | ❌ XÓA |
| `BE/app.js:30-33` | ❌ XÓA 4 dòng import và khởi động jobs |
| `BE/scripts/complete-overdue-bookings.js` | ❌ XÓA hoặc archive |
| `BE/scripts/cleanup-orphaned-tables.js` | ❌ XÓA hoặc archive |
| `BE/scripts/check-pending-payment-bookings.js` | ❌ XÓA hoặc archive |
| `BE/scripts/inspect-pending-payment.js` | ❌ XÓA hoặc archive |
| `BE/scripts/debug-payment-timer.js` | ❌ XÓA hoặc archive |

**Hướng giải quyết:**
```javascript
// Trong app.js, XÓA:
// const { startBookingAutoCompleteJob } = require("./services/bookingAutoCompleteService");
// const { startTableCleanupJob } = require("./services/tableCleanupService");
// const { startPendingPaymentCleanupJob } = require("./services/pendingPaymentCleanupService");
// const { startPendingConfirmationCleanupJob } = require("./services/bookingPendingConfirmationCleanupService");

// Và XÓA các dòng start:
// startBookingAutoCompleteJob();
// startTableCleanupJob();
// startPendingPaymentCleanupJob();
// startPendingConfirmationCleanupJob();
```

---

### 2.3 Conflict #3: Payment flow redesign

**Mức độ: 🔴 CRITICAL** - Ảnh hưởng đến khả năng thanh toán của app

**Phân tích:**

Hiện tại PayOS gộp `booking.status = "paid"` khi thanh toán xong. Nếu xóa `paid` khỏi booking status, phải tách payment ra riêng.

**Giải pháp: THÊM `payment.status` riêng biệt vào Booking model**

```javascript
// TRONG models/booking.js, thêm field:
payment: {
  // ... existing fields ...
  status: {
    type: String,
    enum: ['unpaid', 'paid', 'refund_pending', 'refunded'],
    default: 'unpaid',
  },
  payosOrderCode: Number,
  payosPaymentLinkId: String,
  payosStatus: String,
}

// Booking.status vẫn là:
// ['pending', 'confirmed', 'occupied', 'completed', 'cancelled', 'declined', 'no_show']
```

**Các file bị ảnh hưởng và hướng giải quyết cụ thể:**

| File | Hiện tại | Thay bằng |
|------|----------|-----------|
| `bookingController.createBooking` | `status: isPayos ? "pending" : paymentMethod === "bank" ? "pending_payment" : "pending"` | `status: "pending"` (mọi TH) + `payment.status: "unpaid"` |
| `bookingController.confirmBooking` | Check `['pending', 'pending_payment', 'paid']` | Check `['pending']` + `payment.status === 'paid'` (có thể confirm dù chưa paid) |
| `bookingController.getPaymentQr` | Set `status: "pending_payment"` | Set `payment.status: "unpaid"`, không đổi booking.status |
| `bookingController.vietqrWebhook` | `booking.status = "paid"` | `booking.payment.status = "paid"` |
| `paymentController.handlePayosWebhook` | `booking.status = "paid"` | `booking.payment.status = "paid"` |
| `paymentController.getPaymentStatus` | Check `booking.status === "paid"` | Check `booking.payment.status === "paid"` |
| `paymentController.cancelPayosPayment` | `booking.status = "cancelled"` | `booking.status = "cancelled"` (OK) |
| `adminController.updateBookingStatus` | Set `booking.status = "paid"` | Set `booking.payment.status = "paid"` |
| `bookingController.cancelBooking` | Check `refundPercent` → `refund_pending` | Check `payment.status === 'paid'` → set `payment.status = 'refund_pending'` |
| `bookingController.getRefundPreview` | Tính refund từ deposit | Giữ nguyên (tính refund từ deposit) |
| `bookingController.attachPaymentTimer` | Check `pending_payment` | Check `payment.status === 'unpaid'` |

**Quy tắc mới:**

```
Booking status flow (độc lập):
pending → (staff confirms) → confirmed → (khách check-in) → occupied → (staff completes) → completed

Payment status flow (song song):
unpaid → (khách thanh toán) → paid → (staff hoàn tiền) → refund_pending → refunded
```

**Tương tác giữa 2 status:**
- `booking.status` có thể là `confirmed` trong khi `payment.status` là `unpaid` (khách đặt nhưng chưa thanh toán, staff vẫn confirm)
- `booking.status` là `cancelled` trong khi `payment.status` là `refund_pending` (hủy nhưng đã thanh toán)
- Check-in chỉ yêu cầu `booking.status === 'confirmed'` (không cần đã paid)

---

### 2.4 Conflict #4: Table `isAvailable` synchronization

**Mức độ: 🟡 HIGH** - Có thể gây lỗi hiển thị nếu không đồng bộ

**Phân tích:**
`isAvailable` là field boolean redundant với `status` enum. Có 50+ tham chiếu trong codebase.

**Hướng giải quyết: Giữ `isAvailable` như virtual / pre-save hook**

```javascript
// Trong models/table.js:

// CÁCH 1: Pre-save hook (đơn giản nhất, backward compatible)
tableSchema.pre('save', function(next) {
  this.isAvailable = this.status === 'available';
  next();
});

// CÁCH 2: Virtual (không lưu trong DB)
tableSchema.virtual('isAvailable').get(function() {
  return this.status === 'available';
});
tableSchema.set('toJSON', { virtuals: true });
tableSchema.set('toObject', { virtuals: true });
```

**Khuyến nghị: CÁCH 1** (pre-save) vì frontend đang dùng `isAvailable` rất nhiều và chưa có kế hoạch sửa hết 50+ chỗ.

Giữ lại `isAvailable: { type: Boolean, default: true }` trong schema và set qua pre-save hook.

---

### 2.5 Conflict #5: Frontend Booking UI - time selection redesign

**Mức độ: 🔴 CRITICAL** - Ảnh hưởng trải nghiệm người dùng

**Phân tích:**
Hiện tại `select-table.tsx` có:
- Meal tabs (Lunch/Dinner) - khóa giờ theo buổi
- Time picker chỉ hiển thị giờ trong buổi đã chọn
- Duration adjustment (-30 / +30 phút)
- Expected end time display

**UI mới cần:**

```
┌──────────────────────────────────────────┐
│ Đặt bàn - Nhà hàng A                     │
├──────────────────────────────────────────┤
│                                          │
│  📅 Ngày: [Thứ 2, 12/06/2026 ▼]         │
│  ⏰ Giờ:  [19:00 ▼]                     │
│  👥 Khách: [  4  ][+][-]                │
│                                          │
│  ─── Loại bàn ───                        │
│  [Tất cả] [VIP] [View] [Regular] [Std]  │
│                                          │
│  ┌─── Bàn ──────────────────────────┐   │
│  │ B1🟢  B2🟢  B3🟢  B4🟢          │   │
│  │ B5🟡  B6🟢  B7🟢  B8🟢          │   │
│  │ B9🟢  B10🟢 B11🟢 B12🟢         │   │
│  └──────────────────────────────────┘   │
│                                          │
│  Đã chọn: Bàn VIP 1 · 100.000đ          │
│                                          │
│  [                 Tiếp theo            ]│
└──────────────────────────────────────────┘
```

**Thay đổi cụ thể:**

1. **XÓA** `mealTime` state, `getMealTime()`, `LUNCH_TIMES`, `DINNER_TIMES`
2. **XÓA** meal tab UI (dòng 284-313)
3. **XÓA** `getDefaultDuration()`, `getBufferTime()`, `calcEndTime()` (dòng 36-59)
4. **XÓA** `durationAdjustment` state và adjustment buttons (dòng 150, 653-692)
5. **XÓA** expected end time display trong drawer (dòng 642-650)
6. **GIỮ NGUYÊN** time picker nhưng hiển thị tất cả giờ từ `11:00` đến `22:00`
7. **GIỮ NGUYÊN** date picker, guest stepper, table grid, drawer

---

### 2.6 Conflict #6: Partner Dashboard - remove duration display

**Mức độ: 🟡 HIGH**

**File: `Amble/app/(partner)/dashboard.tsx`**

```javascript
// Dòng 407: <Text style={styles.upcomingEnd}>{bk.expectedEndTime || "--"}</Text>
// → XÓA hoặc thay bằng thời gian còn lại đến giờ đặt

// Dòng 414-416: <Text style={styles.upcomingDuration}>{bk.duration || 120} phút</Text>
// → XÓA

// Có thể thay bằng:
// <Text style={styles.upcomingDetail}>{bk.tableNumber} • {bk.guests} khách</Text>
// Giờ kết thúc: không hiển thị (vì không còn duration)
```

---

### 2.7 Conflict #7: Admin booking status management

**Mức độ: 🟡 HIGH**

**File: `Amble/app/admin/bookings.tsx`**

Phải cập nhật:
1. `BOOKING_STATUSES` trong `adminController.js` - xóa `draft`, `pending_payment`, `paid`, `refund_pending`, `refunded`, `released`
2. Admin UI filters - cập nhật status list
3. Status tone mapping - cập nhật
4. Refund display - thay đổi thành `payment.status`

---

### 2.8 Conflict #8: User History - cancel & refund flow

**Mức độ: 🟡 HIGH**

**File: `Amble/app/(tabs)/history.tsx`**

Phải cập nhật:
1. `TAB_CONFIG` status lists
2. `hasPaidBooking()` - đổi từ check `booking.status === 'paid'` thành `booking.payment?.status === 'paid'`
3. `handleCancel` - đổi logic từ `hasPaidBooking` sang check `payment.status`
4. `PAYMENT_STATUS` map
5. Countdown timer - đổi từ check `pending_payment` sang `payment.status === 'unpaid'`

---

### 2.9 Conflict #9: PayOS integration

**Mức độ: 🔴 CRITICAL** - Ảnh hưởng trực tiếp đến doanh thu

**File: `BE/controllers/paymentController.js`**

Các thay đổi:

```javascript
// 1. handlePayosWebhook (dòng 183-204)
// HIỆN TẠI:
booking.status = "paid";

// THAY BẰNG:
booking.payment.status = "paid";
booking.payment.paidAt = new Date();
// KHÔNG lock bàn ở đây nữa - để partner confirm booking mới lock
// HOẶC vẫn lock nếu booking đã được confirm
if (booking.status === 'confirmed') {
  await Table.findByIdAndUpdate(booking.tableId, {
    currentBookingId: booking._id,
    status: 'reserved',
  });
}

// 2. getPaymentStatus (dòng 222-225)
// HIỆN TẠI:
if (booking.status === "paid") { ... }
// THAY BẰNG:
if (booking.payment?.status === "paid") { ... }

// 3. getPaymentStatus (dòng 251-252)
// HIỆN TẠI:
booking.status = "paid";
// THAY BẰNG:
booking.payment.status = "paid";
```

**File: `Amble/app/booking/payos-payment.tsx`**
```javascript
// HIỆN TẠI dòng 99: if (bookingStatus === "paid")
// THAY BẰNG: if (bookingData.payment?.status === "paid" || booking.payment?.status === "paid")
```

**File: `Amble/app/booking/payment.tsx`**
```javascript
// HIỆN TẠI dòng 101: if (booking?.status === "paid")
// THAY BẰNG: if (booking?.payment?.status === "paid")
```

---

### 2.10 Conflict #10: API Types và Services

**Mức độ: 🟢 MEDIUM**

**File: `Amble/services/api.ts`**

```javascript
// XÓA khỏi create payload (dòng 123):
// durationAdjustment?: number;

// Cập nhật paymentAPI methods nếu cần
```

---

### 2.11 Conflict #11: i18n translations

**Mức độ: 🟢 MEDIUM**

**File: `Amble/i18n/translations.ts`**

Các keys cần cập nhật/xóa:
```javascript
// XÓA hoặc archive:
// "booking.select.lunch", "booking.select.dinner"
// "booking.select.expectedTime"
// "booking.select.quickEat", "booking.select.longer"
// "booking.select.minutes"
// "partner.orders.statusPendingPayment" (nếu xóa pending_payment)
// "history.statusPendingPayment", "history.statusPaid" (chuyển sang payment context)

// THÊM mới:
// "booking.select.timeSelect": "Chọn giờ"
```

---

### 2.12 Conflict #12: AI Booking Assistant

**Mức độ: 🟢 LOW**

**File: `Amble/services/ambleAI.ts`**

Kiểm tra xem AI có tham chiếu duration không:
```javascript
// Dòng 49: isAvailable: boolean → giữ nguyên (dùng virtual)
// Dòng 353-354: filter isAvailable → giữ nguyên
// AI conversation không dùng duration → không ảnh hưởng
```

---

## 3. Migration Strategy (Chiến lược chuyển đổi)

### 3.1 Thứ tự ưu tiên

```
Phase 1 - Core Backend Changes (Ngày 1-2)
├── 1. Xóa background jobs (app.js + services)
├── 2. Sửa Table model (pre-save hook cho isAvailable)
├── 3. Sửa Booking model (xóa duration fields, thêm payment.status)
├── 4. Xóa bookingDuration.js
└── 5. Sửa bookingController.js (create, confirm, check-in, complete)

Phase 2 - Payment Flow Rewrite (Ngày 3-4)
├── 6. Sửa paymentController.js (PayOS)
├── 7. Sửa bookingController.js (vietqrWebhook, getPaymentQr, cancel)
├── 8. Sửa adminController.js
└── 9. Cập nhật payment routes nếu cần

Phase 3 - Frontend Booking UI (Ngày 5-6)
├── 10. Sửa select-table.tsx (xóa duration/meal UI)
├── 11. Sửa confirm.tsx (xóa duration params)
├── 12. Sửa payment.tsx (đổi status check)
├── 13. Sửa payos-payment.tsx (đổi status check)
└── 14. Sửa history.tsx (cancel/refund flow)

Phase 4 - Partner/Admin UI (Ngày 7-8)
├── 15. Sửa partner dashboard.tsx (xóa duration display)
├── 16. Sửa partner orders.tsx (status map)
├── 17. Sửa admin bookings.tsx (status management)
├── 18. Cập nhật i18n translations
└── 19. Xóa debug scripts cũ

Phase 5 - Testing & Deploy (Ngày 9-10)
├── 20. Test full booking flow
├── 21. Test PayOS integration
├── 22. Test partner actions
├── 23. Test cancel/refund
└── 24. Deploy lên production
```

### 3.2 File migration checklist chi tiết

#### Phase 1 Files:

```javascript
// 1. BE/app.js
// XÓA:
const { startBookingAutoCompleteJob } = require("./services/bookingAutoCompleteService");
const { startTableCleanupJob } = require("./services/tableCleanupService");
const { startPendingPaymentCleanupJob } = require("./services/pendingPaymentCleanupService");
const { startPendingConfirmationCleanupJob } = require("./services/bookingPendingConfirmationCleanupService");
// startBookingAutoCompleteJob();
// startTableCleanupJob();
// startPendingPaymentCleanupJob();
// startPendingConfirmationCleanupJob();

// 2. BE/models/table.js
// THÊM pre-save hook:
tableSchema.pre('save', function(next) {
  this.isAvailable = this.status === 'available';
  next();
});
// GiỮ NGUYÊN isAvailable field trong schema (backward compat)

// 3. BE/models/booking.js
// THÊM payment.status:
payment: {
  status: { 
    type: String, 
    enum: ['unpaid', 'paid', 'refund_pending', 'refunded'],
    default: 'unpaid',
  },
  // ... giữ nguyên các field khác
}
// XÓA khỏi bookingDetails: mealTime, duration, durationAdjustment, expectedEndTime, bufferTime, gracePeriodEndTime
// XÓA khỏi status enum: draft, pending_payment, paid, refund_pending, refunded, released

// 4. BE/services/
// XÓA: bookingDuration.js, bookingAutoCompleteService.js, tableCleanupService.js, 
//      pendingPaymentCleanupService.js, bookingPendingConfirmationCleanupService.js
// THÊM (nếu cần): timeUtils.js

// 5. BE/controllers/bookingController.js
// XÓA: computeBookingDuration import
// XÓA: toàn bộ overlap checking with expectedEndTime
// SỬA: createBooking - không ghi duration fields, không set pending_payment
// SỬA: confirmBooking - không check pending_payment/paid
// SỬA: checkInBooking - không check paid
// SỬA: checkOutBooking - đổi tên thành completeBooking (nếu muốn)
// THÊM: declineBooking - từ chối booking
```

#### Phase 2 Files:

```javascript
// 6. BE/controllers/paymentController.js
// SỬA handlePayosWebhook: booking.payment.status = "paid" (thay vì booking.status = "paid")
// SỬA getPaymentStatus: check booking.payment?.status
// GIỮ NGUYÊN createPayosPayment, cancelPayosPayment

// 7. BE/controllers/bookingController.js
// SỬA vietqrWebhook: booking.payment.status = "paid"
// SỬA getPaymentQr: không set booking.status = "pending_payment"
// SỬA cancelBooking: check payment.status thay vì booking.status
// SỬA attachPaymentTimer: check payment.status thay vì pending_payment

// 8. BE/controllers/adminController.js
// SỬA BOOKING_STATUSES: xóa các status cũ
// SỬA updateBookingStatus: không set booking.status = "paid", set payment.status
```

#### Phase 3 Files:

```javascript
// 9. Amble/app/booking/select-table.tsx
// XÓA: getDefaultDuration, getBufferTime, getMealTime, calcEndTime
// XÓA: mealTime state, durationAdjustment state
// XÓA: finalDuration, expectedEndTime
// XÓA: meal tabs UI, adjustment buttons
// XÓA: expectedEndTime display
// SỬA: params push (không gửi duration fields)

// 10. Amble/app/booking/confirm.tsx
// XÓA: mealTime, duration, expectedEndTime, durationAdjustment, bufferTime từ params
// XÓA: durationAdjustment từ create payload
// SỬA: expectedEndTime display

// 11. Amble/app/booking/payment.tsx
// SỬA dòng 101: booking?.payment?.status === "paid"

// 12. Amble/app/booking/payos-payment.tsx
// SỬA dòng 99: bookingData.payment?.status === "paid"

// 13. Amble/app/(tabs)/history.tsx
// SỬA hasPaidBooking: check payment.status
// SỬA handleCancel: check payment.status
// SỬA PAYMENT_STATUS map
// SỬA canPay: check payment.status === 'unpaid'
```

#### Phase 4 Files:

```javascript
// 14. Amble/app/(partner)/dashboard.tsx
// XÓA expectedEndTime, duration display

// 15. Amble/app/(partner)/orders.tsx
// SỬA STATUS_LABELS, STATUS_STYLES
// SỬA canRelease, canCheckIn

// 16. Amble/app/admin/bookings.tsx
// SỬA status filters
// SỬA status tone mapping
// SỬA action buttons

// 17. Amble/i18n/translations.ts
// XÓA/Cập nhật status keys

// 18. BE/scripts/
// XÓA các debug scripts không cần thiết
// GIỮ scripts có ích như inspect-booking-state.js (sửa lại)
```

---

## 4. Rủi ro & Giảm thiểu

### 4.1 Rủi ro cao nhất

| Rủi ro | Tác động | Giảm thiểu |
|--------|----------|------------|
| **PayOS webhook fail** sau khi đổi status | Người dùng đã chuyển tiền nhưng không được cập nhật | Thêm fallback: nếu webhook fail, cho phép staff confirm payment thủ công trong dashboard |
| **Data inconsistency** từ migration | Booking cũ có status `paid` không được map | Migration script map `booking.status: "paid"` → `booking.payment.status: "paid"` + `booking.status: "confirmed"` |
| **Frontend crash** vì thiếu field | User không vào được màn hình | Test kỹ, add default values ở frontend cho field không còn |
| **Partner confusion** vì mất expectedEndTime | Staff không biết khi nào bàn trống | Thay bằng dashboard alert: "Bàn đã occupied X giờ" |

### 4.2 Migration data script

```javascript
// scripts/migrate-v2.js
const Booking = require('../models/booking');
const Table = require('../models/table');

async function migrateV2() {
  const now = new Date();
  
  // 1. Migrate booking statuses
  const statusMap = {
    'draft': 'pending',
    'pending_payment': 'pending',
    'paid': 'confirmed',
    'refund_pending': 'cancelled',
    'refunded': 'cancelled',
    'released': 'cancelled',
  };
  
  for (const [oldStatus, newStatus] of Object.entries(statusMap)) {
    const result = await Booking.updateMany(
      { status: oldStatus },
      { $set: { status: newStatus } }
    );
    console.log(`Migrated ${result.modifiedCount} bookings: ${oldStatus} → ${newStatus}`);
  }

  // 2. Migrate payment status
  await Booking.updateMany(
    { status: { $in: ['confirmed', 'completed'] }, 'payment.method': { $ne: null } },
    { $set: { 'payment.status': 'paid' } }
  );
  
  await Booking.updateMany(
    { status: 'pending', 'payment.method': { $ne: null } },
    { $set: { 'payment.status': 'unpaid' } }
  );
  
  await Booking.updateMany(
    { 'payment.method': null },
    { $set: { 'payment.status': 'unpaid' } }
  );
  
  // 3. Remove duration fields from all bookings
  await Booking.updateMany({}, {
    $unset: {
      'bookingDetails.mealTime': '',
      'bookingDetails.duration': '',
      'bookingDetails.durationAdjustment': '',
      'bookingDetails.expectedEndTime': '',
      'bookingDetails.bufferTime': '',
      'bookingDetails.gracePeriodEndTime': '',
    }
  });
  
  // 4. Sync table isAvailable with status
  const tables = await Table.find({});
  for (const table of tables) {
    table.isAvailable = table.status === 'available';
    await table.save();
  }
  
  console.log('Migration completed!');
}

module.exports = migrateV2;
// Run: node -e "require('./scripts/migrate-v2')().then(() => process.exit())"
```

---

## 5. Kết luận

### Tổng số file cần thay đổi: ~35 files

| Nhóm | Số file | Độ khó |
|------|---------|--------|
| Backend core (models + services) | 10 | Cao |
| Backend controllers | 4 | Cao |
| Backend app.js | 1 | Thấp |
| Backend scripts | 8 | Thấp |
| Frontend booking screens | 4 | Cao |
| Frontend partner screens | 3 | Trung bình |
| Frontend admin screens | 2 | Trung bình |
| Frontend services/stores | 2 | Thấp |
| Frontend i18n | 1 | Thấp |

### Critical path (không thể làm song song):
1. ✅ Models → Controllers → API
2. ✅ Payment Controller → PayOS webhook → Frontend payment screens
3. ✅ Frontend select-table → confirm → payment screens

### Có thể làm song song:
1. Admin dashboard + Partner dashboard
2. i18n updates + Script cleanup
3. History screen + Orders screen
