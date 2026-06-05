# SYSTEM AUDIT REPORT

## Booking & Table Management

---

## 1. USER FLOW (Customer)

### 1.1 Luồng đặt bàn

```
Customer → Chọn NH → Chọn bàn → Chọn date/time → Confirm → Payment → Success
```

**Vấn đề phát hiện:**

| # | Vấn đề | Mức | Mô tả |
|---|--------|-----|-------|
| U1 | **Không kiểm tra ngày mở cửa** | 🔴 HIGH | `createBooking` kiểm tra giờ trong khung 11:00-14:59 hoặc 17:00-22:59 (hardcode), nhưng không kiểm tra nhà hàng có mở cửa ngày đó không (`restaurant.openDays`) |
| U2 | **Không kiểm tra đặt trước tối đa** | 🟡 MED | Không có validation `advanceBookingDays` - khách có thể đặt bàn trước 1 năm |
| U3 | **Race condition đặt bàn** | 🔴 **CRITICAL** | `createBooking` đọc `table.isAvailable`, nếu true thì tạo booking. Nhưng không có atomic lock, 2 request cùng lúc có thể double-book cùng bàn (TOCTOU race) |
| U4 | **Booking number có thể trùng** | 🟡 MED | `BK-YYYYMMDD-NNNN` chỉ 4 số random (1000-9999), về mặt lý thuyết có thể trùng nếu số booking/ngày > 8000 |

### 1.2 Luồng thanh toán

```
PayOS: pending → (payos webhook) → payment.status = "paid"
Bank:  payment.status = "unpaid" → (vietqr webhook) → "paid"
```

**Vấn đề:**

| # | Vấn đề | Mức | Mô tả |
|---|--------|-----|-------|
| U5 | **Không cleanup booking PayOS pending** | 🔴 HIGH | Nếu khách tạo booking PayOS nhưng không thanh toán, booking ở trạng thái `pending` vĩnh viễn. Table không bị lock (PayOS không lock bàn). Không có background job cleanup nữa |
| U6 | **Bank transfer không timeout** | 🔴 HIGH | Trước đây có `pendingPaymentCleanupService` xóa booking quá 10 phút. Đã xóa service này. Giờ khách tạo bank transfer, booking `pending` mãi mãi nếu không thanh toán |

### 1.3 Luồng hủy

```
pending/confirmed → cancelled + giải phóng bàn
  Nếu payment.status === "paid" → payment.status = "refund_pending"
```

**Vấn đề:**

| # | Vấn đề | Mức | Mô tả |
|---|--------|-----|-------|
| U7 | **Không thể hủy occupied** | 🟡 MED | `cancelBooking` guard `["cancelled", "completed", "occupied"]`. Nếu khách đã check-in (occupied) rồi muốn hủy thì không được. Staff phải dùng `complete` hoặc `release` |
| U8 | **Refund preview lỗi thời** | 🟢 LOW | `getRefundPreview` dùng `computeRefund` tính refund dựa trên thời gian (>=24h=100%, >=12h=50%), nhưng `cancelBooking` không dùng logic này nữa - chỉ check `payment.status === "paid"`. Preview và thực tế không khớp |

---

## 2. BOOKING STATE MACHINE

### 2.1 Sơ đồ trạng thái hiện tại

```
                  ┌──────────┐
                  │  pending │
                  └────┬─────┘
                       │
            ┌──────────┼──────────┐
            │          │          │
            ▼          ▼          ▼
      ┌─────────┐ ┌────────┐ ┌──────────┐
      │confirm  │ │decline │ │cancel    │
      │(staff)  │ │(staff) │ │(customer)│
      └────┬────┘ └────────┘ └────┬─────┘
           │                      │
           ▼                      ▼
     ┌──────────┐          ┌───────────┐
     │confirmed │          │ cancelled │
     └────┬─────┘          └───────────┘
          │
     ┌────┴────┐
     │         │
     ▼         ▼
  ┌──────┐ ┌──────┐
  │cancel│ │check │
  │staff │ │  in  │
  │      │ │staff │
  └──┬───┘ └──┬───┘
     │        │
     ▼        ▼
  ┌──────┐ ┌──────┐
  │cancld│ │ occp │
  └──────┘ └──┬───┘
              │
         ┌────┴────┐
         │         │
         ▼         ▼
     ┌──────┐ ┌──────┐
     │compl │ │release│
     │ (stf)│ │ (own) │
     └──────┘ └──────┘
```

### 2.2 Issues

| # | Vấn đề | Mức | Mô tả |
|---|--------|-----|-------|
| S1 | **`declined` không giải phóng bàn** | 🔴 HIGH | `decline` booking chỉ đổi status mà không unlock table. Nhưng `pending` bookings không lock table, nên không sao. Tuy nhiên, API `confirmBooking` lock table, nếu có decline song song thì table vẫn bị lock |
| S2 | **Không có declined handler riêng** | 🟡 MED | `declined` status tồn tại trong enum nhưng không có API endpoint `POST /bookings/:id/decline`. Dùng `cancelBooking` thay thế? Không rõ ràng |
| S3 | **Thiếu trạng thái `confirmed` → `no_show`** | 🟡 MED | `releaseBooking` có thể biến `confirmed` thành `no_show` (reason='no_show'), nhưng `releaseBooking` không có permission cho staff - chỉ owner/manager. Staff không thể đánh dấu no-show |

---

## 3. TABLE STATE MACHINE

### 3.1 Sơ đồ hiện tại

```
available ──(create non-payos)──► reserved ──(check-in)──► occupied
     ▲                            │                          │
     │                            │                          │
     │                      (cancel/release)          (complete)
     │                            │                          │
     │                            ▼                          │
     │                      available ◄──────────────────────┘
     │
     └──(cleaning-done)── cleaning
     
     (available ──create PayOS──► vẫn available, không lock)
```

### 3.2 Issues

| # | Vấn đề | Mức | Mô tả |
|---|--------|-----|-------|
| T1 | **Cleaning state unreachable** | 🔴 **CRITICAL** | `cleaning` status tồn tại trong Table schema enum nhưng KHÔNG có code nào set table về `cleaning`. Old `checkOutBooking` đã bị rename thành `completeBooking` và set trực tiếp về `available`. Cleaning là dead code |
| T2 | **PayOS booking không lock bàn** | 🔴 HIGH | Khi tạo booking PayOS, table không bị lock (vì `paymentMethod !== "payos"` mới lock). Nhưng nếu webhook PayOS thành công, paymentController lock bàn. Có khoảng trống (vài giây-phút) giữa lúc tạo và webhook, bàn vẫn available cho người khác đặt |
| T3 | **Table lock qua update không atomic** | 🔴 HIGH | `Table.findByIdAndUpdate` không có điều kiện `{ isAvailable: true }`. Nếu staff confirm 1 booking trong khi 1 booking khác vừa lock bàn → confirm vẫn ghi đè trạng thái. Cần thêm điều kiện: `Table.findOneAndUpdate({ _id: tableId, status: 'available' }, { status: 'reserved', ... })` |
| T4 | **Double release** | 🟡 MED | Nếu 2 staff cùng release 1 booking cùng lúc, `updateTableForRelease` chạy 2 lần, không gây hại nhưng không cần thiết |
| T5 | **Thiếu maintenance state handling** | 🟢 LOW | Table có `maintenance` trong enum (design doc) nhưng không có trong schema enum hiện tại. Schema chỉ có `['available', 'reserved', 'occupied', 'cleaning']` |

---

## 4. ADMIN / PARTNER FLOW

### 4.1 Luồng Staff

```
Staff có thể:
- Xem dashboard, bookings, tables
- Check-in (confirmed → occupied)
- Complete (occupied → completed)
- Không thể release/cancel (chỉ owner/manager)
- Không thể CRUD tables
```

| # | Vấn đề | Mức | Mô tả |
|---|--------|-----|-------|
| P1 | **Staff dùng checkPermission('orders', 'read') để check-in & complete** | 🟡 MED | Permission `'orders', 'read'` về mặt ngữ nghĩa là "xem đơn hàng", không phải "thao tác". Cần tách action riêng: `'orders', 'checkin'` và `'orders', 'complete'` |

### 4.2 Luồng Owner/Manager

| # | Vấn đề | Mức | Mô tả |
|---|--------|-----|-------|
| P2 | **Release booking dùng middleware riêng thay vì rolePermission** | 🟡 MED | `releaseAccess` tự check role thay vì dùng `checkPermission('orders', 'release')`. Không đồng nhất với các route khác |
| P3 | **Không endpoint declined cho staff** | 🔴 HIGH | Không có API `POST /bookings/:id/decline`. Staff từ chối booking bằng cách nào? `cancelBooking` không rõ nghĩa |

### 4.3 Super Admin

| # | Vấn đề | Mức | Mô tả |
|---|--------|-----|-------|
| P4 | **Admin analytics route dùng sai middleware** | 🔴 HIGH | `adminAnalyticsRoutes` dùng `protectAdmin`, nhưng middleware này tham chiếu `req.user`, không phải `req.partner`. Stack trace production cho thấy nó đi qua `requireAdmin` rồi mới tới controller. Nếu admin token hết hạn → lỗi |

---

## 5. RACE CONDITIONS

| # | Vấn đề | Mức | Kịch bản |
|---|--------|-----|----------|
| R1 | **Double booking cùng bàn + giờ** | 🔴 **CRITICAL** | 2 customer cùng đặt bàn A lúc 19:00. Cả 2 request song song: Request1 đọc `table.isAvailable=true`, Request2 đọc `table.isAvailable=true`. Cả 2 tạo booking thành công. Cả 2 set table = reserved. Kết quả: double booking |
| R2 | **Confirm + Cancel song song** | 🟡 MED | Staff confirm booking (set confirmed + lock table) đồng thời customer cancel booking (set cancelled + release table). Kết quả không xác định, tùy timing |
| R3 | **PayOS webhook retry** | 🟡 MED | PayOS gửi webhook 2 lần (do timeout/retry). Webhook1 xử lý: set `payment.status=paid`. Webhook2: check `payment?.status !== "paid"` → sai, vì đã là "paid" → bỏ qua. Không gây hại nhưng wasted |

**Giải pháp cho R1 (double booking):**
```javascript
// Atomic update with condition - chỉ lock nếu bàn còn available
const locked = await Table.findOneAndUpdate(
  { _id: tableId, status: 'available' },
  { status: 'reserved', currentBookingId: booking._id },
  { new: true }
);
if (!locked) {
  // Rollback booking
  await Booking.findByIdAndDelete(booking._id);
  return res.status(409).json({ message: 'Bàn vừa được người khác đặt' });
}
```

---

## 6. EDGE CASES & DATA INCONSISTENCY

| # | Vấn đề | Mức | Mô tả |
|---|--------|-----|-------|
| E1 | **Pending booking vô chủ** | 🔴 HIGH | Booking tạo với PayOS, không thanh toán, không cleanup → tồn tại vĩnh viễn trong DB. Làm sai lệch thống kê |
| E2 | **Table.currentBookingId trỏ đến booking đã cancelled** | 🟡 MED | Nếu cancel xảy ra giữa lúc confirm (race condition), table có thể giữ `currentBookingId` trỏ đến booking đã cancelled |
| E3 | **Booking không có tableId** | 🟡 MED | Schema `tableId` không required. Có thể tạo booking không bàn (walk-in chưa assign bàn?) nhưng logic đặt bàn luôn require tableId |
| E4 | **isAvailable không đồng bộ với status** | 🔴 HIGH | Nếu có code update `status` mà quên update `isAvailable`, hoặc update trực tiếp qua MongoDB (updateMany, findOneAndUpdate), pre-save hook không chạy → isAvailable sai |

---

## 7. PERMISSION AUDIT

| Route | Middleware | Role | Vấn đề |
|-------|-----------|------|--------|
| `GET /partner/analytics/*` | `protectPartner + checkPermission('dashboard','read')` | owner/manager/staff | ✅ OK |
| `POST /bookings/:id/check-in` | `protectPartner + checkPermission('orders','read')` | owner/manager/staff | ⚠️ `orders.read` semantic sai |
| `POST /bookings/:id/complete` | `protectPartner + checkPermission('orders','read')` | owner/manager/staff | ⚠️ `orders.read` semantic sai |
| `POST /bookings/:id/release` | `protectPartner + releaseAccess` | owner/manager | ⚠️ Dùng middleware riêng |
| `PUT /tables/:id` | `protectPartner + checkPermission('tables','update')` | owner/manager | ✅ OK |
| `DELETE /tables/:id` | `protectPartner + checkPermission('tables','delete')` | owner/manager | ✅ OK |
| `GET /admin/analytics/*` | `protectAdmin` | super admin | ✅ OK |

**Thiếu permission:**

| Hành động | Route cần | Role |
|-----------|-----------|------|
| Decline booking | `POST /bookings/:id/decline` | staff |
| Set table maintenance | `PUT /tables/:id/maintenance` | manager |

---

## 8. CẢNH BÁO RỦI RO QUAN TRỌNG

### 🔴 CẤP ĐỘ NGHIÊM TRỌNG (cần fix ngay)

1. **Double booking (R1)**: Hai request đồng thời có thể đặt cùng bàn, cùng giờ. Cần `findOneAndUpdate` với điều kiện atomic.

2. **Cleaning state dead (T1)**: `cleaning` không bao giờ được set, code vô dụng. Cần xóa khỏi schema hoặc thêm flow cleaning.

3. **Table lock không atomic (T3)**: `confirmBooking` dùng `findByIdAndUpdate` không điều kiện → confirm có thể ghi đè lên table đang được lock bởi booking khác.

4. **PayOS booking cleanup (U5/U6)**: Không cleanup booking pending forever. Cần background job timeout 30 phút cho payment.

### 🟡 CẤP ĐỘ TRUNG BÌNH (nên sửa)

5. **Thiếu declined endpoint (P3)**: Staff không có cách từ chối booking rõ ràng.

6. **Không kiểm tra ngày mở cửa (U1)**: Booking có thể được tạo vào ngày nhà hàng đóng cửa.

7. **Race condition confirm+cancel (R2)**: Cần kiểm tra trạng thái hiện tại trước khi update.

### 🟢 CẤP ĐỘ THẤP (có thể sửa sau)

8. **Permission semantic sai (P1)**: Dùng `'checkin'` thay vì `'read'`.

9. **Refund preview (U8)**: Preview không khớp với logic thực tế.

---

## 9. ĐỀ XUẤT LUỒNG TỐI ƯU

### 9.1 Fix double booking (atomic lock)

```javascript
// createBooking - atomic table lock
const table = await Table.findOneAndUpdate(
  { _id: tableId, status: 'available', isActive: true },
  { status: 'reserved', currentBookingId: null }, // temporary placeholder
  { new: true }
);
if (!table) return res.status(409).json({ message: 'Bàn đã được đặt' });

try {
  const booking = await Booking.create({ ... });
  // Update table with real booking ID
  await Table.findByIdAndUpdate(tableId, { currentBookingId: booking._id });
  return res.json({ success: true, booking });
} catch (err) {
  // Rollback table lock
  await Table.findByIdAndUpdate(tableId, { status: 'available', currentBookingId: null });
  throw err;
}
```

### 9.2 Thêm cleanup background job

```javascript
// services/bookingCleanupService.js
// Chạy mỗi 15 phút, cancel booking pending > 60 phút
// (Chỉ cleanup booking KHÔNG lock table - pending không lock)
```

### 9.3 Cleaning state flow đầy đủ

```
occupied ──(check-out)──► cleaning ──(cleaning-done)──► available
```

Thêm lại `check-out` endpoint cho staff (không phải complete). 
- `check-out`: booking vẫn `occupied`, table → `cleaning`
- `cleaning-done`: table → `available`
- `complete`: booking → `completed`, table → `available` (dùng cho trường hợp không cần cleaning)

### 9.4 Permission model tối ưu

```javascript
const ROLE_PERMISSIONS = {
  staff: {
    orders: ['read', 'checkin', 'complete', 'decline'],
    tables: ['read'],
    dashboard: ['read'],
  },
  manager: {
    orders: ['read', 'checkin', 'complete', 'decline', 'release'],
    tables: ['create', 'read', 'update', 'delete'],
    staff: ['create', 'read', 'update'],
    restaurant: ['read', 'update'],
    dashboard: ['read'],
  },
  owner: { ...manager, staff: ['create', 'read', 'update', 'delete'] },
};
```

### 9.5 Booking state machine tối ưu

```
pending ──confirm──► confirmed ──check-in──► occupied ──complete──► completed
  │                    │              │            │
  ├─decline──► declined│              │            ├─check-out──► cleaning ──done──► available
  └─cancel──► cancelled│              │            └─complete──► completed + available
                       ├─cancel──► cancelled       (không cleaning)
                       └─no_show──► no_show
```

---

## 10. TỔNG KẾT

| Mức độ | Số lượng | Cần fix ngay |
|--------|----------|--------------|
| 🔴 Critical | 7 | Double booking, Cleaning dead code, Table lock không atomic, PayOS cleanup, Permission semantic, Declined endpoint, openDays check |
| 🟡 Medium | 4 | Race condition confirm+cancel, Advance booking validation, Booking number collision, Refund preview |
| 🟢 Low | 2 | Permission naming, Cleaning unused code |

### Top 3 ưu tiên cao nhất

1. **🔴 Fix double booking (R1)**: Dùng `findOneAndUpdate` atomic lock
2. **🔴 Fix table lock không atomic (T3)**: Thêm điều kiện `status: 'available'` khi lock
3. **🔴 Thêm cleanup cho PayOS pending (U5/U6)**: Background job hoặc timeout
