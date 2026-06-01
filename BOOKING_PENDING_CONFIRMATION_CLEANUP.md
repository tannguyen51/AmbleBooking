# ✅ HOÀN THÀNH: Tự Động Hủy Booking Pending Quá Hạn

## 📋 Tóm Tắt Tính Năng

### Vấn Đề
Những đơn đặt bàn ở trạng thái **pending** (chờ xác nhận từ nhà hàng) có thể bị "treo" vô thời hạn nếu nhà hàng không xác nhận. Điều này khiến bàn bị khóa mãi mãi và khách không thể đặt bàn đó lại.

### Giải Pháp
Tạo một **job tự động chạy định kỳ** để:
1. Tìm tất cả booking có status = `pending`
2. Kiểm tra xem booking time có quá hiện tại không
3. Nếu quá hạn → **tự động hủy booking** và **giải phóng bàn**

---

## 🔧 Triển Khai

### 1. Service Mới: `bookingPendingConfirmationCleanupService.js`

**Vị trí:** `BE/services/bookingPendingConfirmationCleanupService.js`

**Chức năng:**
- Chạy mỗi **10 phút**
- Tìm booking `pending` có `bookingDetails.date + bookingDetails.time < now`
- Cập nhật booking:
  - `status` → `cancelled`
  - `cancelledAt` → hiện tại
  - `cancellationReason` → "Nhà hàng không xác nhận trong thời hạn - hệ thống tự động hủy"
- Giải phóng bàn:
  - `isAvailable` → `true`
  - `currentBookingId` → `null`

**Exports:**
- `parseBookingDateTime(dateStr, timeStr)` - Parse booking date/time
- `runPendingConfirmationCleanup()` - Chạy cleanup một lần
- `startPendingConfirmationCleanupJob()` - Khởi động job định kỳ

### 2. Cập Nhật `BE/app.js`

Thêm import và khởi động job:
```javascript
const { startPendingConfirmationCleanupJob } = require("./services/bookingPendingConfirmationCleanupService");

// Trong mongoose.connect().then():
startPendingConfirmationCleanupJob();
```

### 3. Script Kiểm Tra: `inspect-pending-confirmation.js`

**Vị trí:** `BE/scripts/inspect-pending-confirmation.js`

**Chức năng:**
- Liệt kê tất cả booking `pending`
- Phân loại: **ACTIVE** (chưa quá hạn) vs **OVERDUE** (quá hạn, sẽ bị hủy)
- Hiển thị thời gian quá hạn (phút)

**Chạy:**
```bash
node BE/scripts/inspect-pending-confirmation.js
```

---

## 📊 Luồng Hoàn Chỉnh

```
┌─ Khách đặt bàn
│
├─ Tạo booking (status=pending)
│
├─ Cập nhật bàn: isAvailable=false, currentBookingId=bookingId
│
├─ Chờ nhà hàng xác nhận
│
├─┬─ [Trường hợp 1: Nhà hàng xác nhận]
│ ├─ Partner confirm → booking status=confirmed
│ ├─ Hết giờ booking → auto-complete job: booking=completed, bàn=available
│ └─ ✓ Hoàn thành
│
└─┬─ [Trường hợp 2: Quá hạn, nhà hàng chưa xác nhận]
  ├─ Booking time < now
  ├─ pending-confirmation-cleanup job chạy
  ├─ Tự động hủy: booking=cancelled, bàn=available
  ├─ Khách có thể đặt bàn đó lại
  └─ ✓ Hoàn thành
```

---

## ⏱️ Các Job Chạy Định Kỳ

| Job | Interval | Chức Năng |
|-----|----------|----------|
| `bookingAutoCompleteJob` | 10 phút | Hoàn thành booking hết giờ (confirmed/paid) |
| `tableCleanupJob` | 30 phút | Dọn dẹp bàn mồ côi |
| `pendingPaymentCleanupJob` | 5 phút | Hủy booking pending_payment > 30 phút |
| `pendingConfirmationCleanupJob` | 10 phút | **[MỚI]** Hủy booking pending quá hạn |

---

## 🧪 Kiểm Tra

### 1. Xem booking pending hiện tại
```bash
node BE/scripts/inspect-pending-confirmation.js
```

### 2. Xem trạng thái booking & bàn
```bash
node BE/scripts/inspect-booking-state.js
```

### 3. Xem pending_payment
```bash
node BE/scripts/inspect-pending-payment.js
```

---

## 📝 Ghi Chú

- Job chạy **tự động** khi server khởi động
- Không cần cấu hình thêm
- Log sẽ in ra console khi có booking bị hủy
- Khách sẽ nhận được thông báo hủy booking (nếu có notification system)

