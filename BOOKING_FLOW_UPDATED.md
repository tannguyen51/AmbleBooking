# ✅ HOÀN THÀNH: Sửa Luồng Booking

## 📋 Luồng Booking Mới

### Trước (Sai)
```
Khách đặt bàn
  ├─ Nếu chọn bank → pending_payment
  └─ Nếu không → pending (gửi nhà hàng ngay)
```

### Sau (Đúng)
```
1️⃣ Khách đặt bàn
   └─ Booking status = pending_payment (chờ thanh toán)
   └─ Bàn bị khóa: isAvailable=false

2️⃣ Khách thanh toán (10 phút)
   ├─ Thành công → Booking status = pending (gửi nhà hàng duyệt)
   └─ Hết hạn → Tự động hủy + Trả bàn

3️⃣ Nhà hàng duyệt
   ├─ Xác nhận → Booking status = confirmed
   └─ Không xác nhận quá hạn → Tự động hủy + Trả bàn

4️⃣ Hết giờ booking
   └─ Tự động hoàn thành: status = completed + Trả bàn
```

---

## 🔧 Các File Được Cập Nhật

### 1. **BE/controllers/bookingController.js**

#### createBooking()
- **Trước:** `status: paymentMethod === "bank" ? "pending_payment" : "pending"`
- **Sau:** `status: "pending_payment"` (luôn)
- **Lý do:** Tất cả booking phải chờ thanh toán trước

#### processPayment()
- **Trước:** `booking.status = "pending"`
- **Sau:** `booking.status = "pending"` (gửi nhà hàng duyệt)
- **Lý do:** Sau khi thanh toán thành công, booking mới được gửi nhà hàng

### 2. **BE/services/pendingPaymentCleanupService.js**

- **Trước:** Timeout = 30 phút
- **Sau:** Timeout = 10 phút
- **Lý do:** Khách chỉ có 10 phút để thanh toán
- **Hành động:** Hủy booking + Trả bàn

### 3. **BE/services/bookingPendingConfirmationCleanupService.js**

- **Chức năng:** Hủy booking `pending` quá hạn (chờ nhà hàng xác nhận)
- **Trigger:** Booking time < hiện tại
- **Hành động:** Hủy booking + Trả bàn
- **Interval:** 10 phút

---

## ⏱️ Các Job Chạy Định Kỳ

| Job | Interval | Chức Năng |
|-----|----------|----------|
| `pendingPaymentCleanupJob` | 5 phút | Hủy booking pending_payment > 10 phút |
| `pendingConfirmationCleanupJob` | 10 phút | Hủy booking pending quá hạn |
| `bookingAutoCompleteJob` | 10 phút | Hoàn thành booking hết giờ (confirmed/paid) |
| `tableCleanupJob` | 30 phút | Dọn dẹp bàn mồ côi |

---

## 📊 Trạng Thái Booking

```
pending_payment
  ├─ Khách thanh toán → pending
  └─ Quá 10 phút → cancelled (tự động)

pending
  ├─ Nhà hàng xác nhận → confirmed
  └─ Quá hạn booking → cancelled (tự động)

confirmed
  ├─ Hết giờ booking → completed (tự động)
  └─ Khách hủy → cancelled (manual)

completed
  └─ Bàn được giải phóng
```

---

## 🧪 Kiểm Tra

```bash
# Xem booking pending_payment
node BE/scripts/inspect-pending-payment.js

# Xem booking pending (chờ nhà hàng duyệt)
node BE/scripts/inspect-pending-confirmation.js

# Xem trạng thái booking & bàn
node BE/scripts/inspect-booking-state.js
```

---

## 📝 Ghi Chú

✅ Luồng thanh toán: 10 phút (thay vì 30 phút)  
✅ Luồng duyệt nhà hàng: Quá hạn booking → Tự động hủy  
✅ Tất cả job chạy tự động khi server khởi động  
✅ Bàn được giải phóng ngay lập tức khi booking bị hủy  
✅ Khách có thể đặt bàn lại sau khi bị hủy  

