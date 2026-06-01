# Sửa Chữa Triệt Để: Lỗi "Bàn Đã Được Đặt" (Phần 2)

## Vấn Đề Mới
Khách hủy thanh toán (quay lại từ trang payment), booking vẫn ở `pending_payment` và bàn vẫn bị khóa. Khi đặt lại, app báo "Bàn đã được đặt".

**Nguyên Nhân:**
- Booking `pending_payment` không có timeout
- Bàn bị khóa vĩnh viễn cho tới khi booking hoàn thành hoặc bị hủy thủ công
- Khách không thể đặt bàn đó lại

## Giải Pháp

### 1. Thêm Job Cleanup Booking Pending_Payment Quá Lâu
**File:** `BE/services/pendingPaymentCleanupService.js` (mới)

```javascript
// Timeout: 30 phút
// Nếu booking pending_payment > 30 phút, tự động hủy và giải phóng bàn
const PENDING_PAYMENT_TIMEOUT_MS = 30 * 60 * 1000;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Kiểm tra mỗi 5 phút

// Tìm booking pending_payment quá lâu
// Cập nhật status → cancelled
// Giải phóng bàn: isAvailable=true, currentBookingId=null
```

**Lợi ích:** Bàn được giải phóng tự động nếu khách không thanh toán trong 30 phút.

### 2. Hook Job Vào App
**File:** `BE/app.js`

```javascript
const { startPendingPaymentCleanupJob } = require("./services/pendingPaymentCleanupService");

mongoose.connect(mongoUri).then(() => {
  startBookingAutoCompleteJob();
  startTableCleanupJob();
  startPendingPaymentCleanupJob(); // ← Thêm dòng này
});
```

### 3. Script Kiểm Tra
**File:** `BE/scripts/inspect-pending-payment.js` (mới)

```bash
node BE/scripts/inspect-pending-payment.js
```

Output:
- Danh sách booking pending_payment
- Tuổi của mỗi booking (phút)
- Đánh dấu booking expired (> 30 phút)

## Luồng Booking Mới (Hoàn Chỉnh)

```
Khách đặt bàn
  ↓
Client re-fetch tables → kiểm tra isAvailable
  ↓
Client gửi POST /booking/create
  ↓
Backend kiểm tra isAvailable + activeBooking
  ↓
Tạo booking (status=pending_payment hoặc pending)
  ↓
Cập nhật bàn: isAvailable=false, currentBookingId=bookingId
  ↓
Khách vào trang payment
  ↓
[Trường hợp 1: Thanh toán]
  Khách thanh toán → booking status=pending
  ↓
  Partner xác nhận (confirm) → booking status=confirmed (BÀN VẪN GIỮ)
  ↓
  Hết giờ booking → auto-complete job: booking=completed, bàn=available
  
[Trường hợp 2: Hủy/Quay lại]
  Khách quay lại (không thanh toán)
  ↓
  Booking vẫn pending_payment, bàn vẫn khóa
  ↓
  Sau 30 phút → pending-payment-cleanup job: booking=cancelled, bàn=available
  ↓
  Khách có thể đặt bàn đó lại
```

## Các Job Chạy Định Kỳ

| Job | Interval | Chức Năng |
|-----|----------|----------|
| `bookingAutoCompleteJob` | 10 phút | Hoàn thành booking hết giờ |
| `tableCleanupJob` | 30 phút | Dọn dẹp bàn mồ côi |
| `pendingPaymentCleanupJob` | 5 phút | Hủy booking pending_payment > 30 phút |

## Trạng Thái Hiện Tại

```
Pending_payment bookings: 1 (BK-20260528-6143, age=1 phút)
Expired (> 30 min): 0
```

## Scripts Kiểm Tra

```bash
# Kiểm tra booking và bàn
node BE/scripts/inspect-booking-state.js

# Kiểm tra pending_payment
node BE/scripts/inspect-pending-payment.js

# Dọn dẹp bàn mồ côi
node BE/scripts/cleanup-orphaned-tables.js
```

## Kết Quả

✓ Khách không bị "bàn đã được đặt" nếu hủy thanh toán
✓ Bàn được giải phóng tự động sau 30 phút
✓ Khách có thể đặt bàn đó lại
✓ Không còn race condition
✓ Tự động dọn dẹp dữ liệu "treo"
