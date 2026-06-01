# ✅ HOÀN THÀNH: Sửa Luồng Booking

## 📋 Tóm Tắt

Bạn yêu cầu sửa lại luồng booking:
- Khách hàng chưa thanh toán → phải qua bước chờ thanh toán
- Sau khi thanh toán → đơn mới đến nhà hàng để duyệt
- Đơn sau 10 phút không thanh toán → tự động hủy + trả bàn

**Giải pháp:** Sửa luồng booking thành 4 bước rõ ràng

---

## 🔄 Luồng Booking Mới

```
1️⃣ KHÁCH ĐẶT BÀN
   └─ Booking status = pending_payment (chờ thanh toán)
   └─ Bàn bị khóa: isAvailable=false, currentBookingId=bookingId

2️⃣ KHÁCH THANH TOÁN (10 phút)
   ├─ ✓ Thành công
   │  └─ Booking status = pending (gửi nhà hàng duyệt)
   │  └─ Log: "[processPayment] Booking ... thanh toán thành công, chuyển sang pending"
   │
   └─ ✗ Hết hạn (> 10 phút)
      └─ pendingPaymentCleanupJob chạy
      └─ Booking status = cancelled
      └─ Bàn được giải phóng: isAvailable=true, currentBookingId=null

3️⃣ NHÀ HÀNG DUYỆT
   ├─ ✓ Xác nhận
   │  └─ Booking status = confirmed
   │  └─ Bàn vẫn bị khóa (chờ hết giờ booking)
   │
   └─ ✗ Quá hạn booking (booking time < now)
      └─ pendingConfirmationCleanupJob chạy
      └─ Booking status = cancelled
      └─ Bàn được giải phóng: isAvailable=true, currentBookingId=null

4️⃣ HẾT GIỜ BOOKING
   └─ bookingAutoCompleteJob chạy
   └─ Booking status = completed
   └─ Bàn được giải phóng: isAvailable=true, currentBookingId=null
```

---

## 🔧 Các File Được Cập Nhật

### 1. **BE/controllers/bookingController.js**

#### createBooking()
```javascript
// Trước: status: paymentMethod === "bank" ? "pending_payment" : "pending"
// Sau:
status: "pending_payment"  // Luôn tạo booking chờ thanh toán
```

#### processPayment()
```javascript
// Khi thanh toán thành công:
booking.status = "pending";  // Gửi nhà hàng duyệt
console.log(`[processPayment] Booking ${booking.bookingNumber} thanh toán thành công, chuyển sang pending (chờ nhà hàng duyệt)`);
```

### 2. **BE/services/pendingPaymentCleanupService.js**

```javascript
// Trước: PENDING_PAYMENT_TIMEOUT_MS = 30 * 60 * 1000
// Sau:
const PENDING_PAYMENT_TIMEOUT_MS = 10 * 60 * 1000;  // 10 phút

// Hủy booking pending_payment > 10 phút
cancellationReason: "Hết thời gian thanh toán (10 phút) - hệ thống tự động hủy"
```

### 3. **BE/services/bookingPendingConfirmationCleanupService.js**

```javascript
// Hủy booking pending quá hạn (chờ nhà hàng xác nhận)
// Trigger: booking time < hiện tại
cancellationReason: "Nhà hàng không xác nhận trong thời hạn - hệ thống tự động hủy"
```

---

## ⏱️ Các Job Chạy Định Kỳ

| Job | Interval | Chức Năng | Status |
|-----|----------|----------|--------|
| `pendingPaymentCleanupJob` | 5 phút | Hủy booking pending_payment > 10 phút | ✅ Cập nhật |
| `pendingConfirmationCleanupJob` | 10 phút | Hủy booking pending quá hạn | ✅ Đã có |
| `bookingAutoCompleteJob` | 10 phút | Hoàn thành booking hết giờ | ✅ Có sẵn |
| `tableCleanupJob` | 30 phút | Dọn dẹp bàn mồ côi | ✅ Có sẵn |

---

## 📊 Trạng Thái Booking

```
pending_payment (chờ thanh toán)
  ├─ Khách thanh toán → pending
  └─ Quá 10 phút → cancelled (tự động)

pending (chờ nhà hàng duyệt)
  ├─ Nhà hàng xác nhận → confirmed
  └─ Quá hạn booking → cancelled (tự động)

confirmed (đã xác nhận)
  ├─ Hết giờ booking → completed (tự động)
  └─ Khách hủy → cancelled (manual)

completed (hoàn thành)
  └─ Bàn được giải phóng

cancelled (đã hủy)
  └─ Bàn được giải phóng
```

---

## 🧪 Kiểm Tra

```bash
# Xem booking pending_payment (chờ thanh toán)
node BE/scripts/inspect-pending-payment.js

# Xem booking pending (chờ nhà hàng duyệt)
node BE/scripts/inspect-pending-confirmation.js

# Xem trạng thái booking & bàn
node BE/scripts/inspect-booking-state.js
```

---

## 📝 Ghi Chú

✅ Luồng thanh toán: 10 phút (thay vì 30 phút)  
✅ Tất cả booking phải thanh toán trước khi gửi nhà hàng  
✅ Nhà hàng chỉ nhận booking đã thanh toán (status=pending)  
✅ Tự động hủy nếu quá hạn ở bất kỳ bước nào  
✅ Bàn được giải phóng ngay lập tức khi booking bị hủy  
✅ Khách có thể đặt bàn lại sau khi bị hủy  
✅ Tất cả job chạy tự động khi server khởi động  

