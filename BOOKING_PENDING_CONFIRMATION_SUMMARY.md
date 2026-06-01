# ✅ HOÀN THÀNH: Tự Động Hủy Booking Pending Quá Hạn

## 📋 Tóm Tắt

Bạn yêu cầu: **Những đơn đặt bàn phải đợi chờ xác nhận của nhà hàng, khi quá ngày nhưng nhà hàng vẫn chưa xác nhận thì trả bàn lại.**

**Giải pháp:** Tạo một job tự động chạy mỗi 10 phút để:
1. Tìm booking `pending` (chờ xác nhận)
2. Kiểm tra xem booking time có quá hiện tại không
3. Nếu quá hạn → tự động hủy booking + giải phóng bàn

---

## 🔧 Các File Được Tạo/Cập Nhật

### 1. **Service Mới** (Tạo)
📄 `BE/services/bookingPendingConfirmationCleanupService.js`
- Logic chính: tìm booking pending quá hạn, hủy + giải phóng bàn
- Chạy mỗi 10 phút
- Exports: `startPendingConfirmationCleanupJob()`

### 2. **App Entry Point** (Cập nhật)
📄 `BE/app.js`
- Thêm import: `bookingPendingConfirmationCleanupService`
- Thêm khởi động job trong `mongoose.connect().then()`

### 3. **Script Kiểm Tra** (Tạo)
📄 `BE/scripts/inspect-pending-confirmation.js`
- Liệt kê booking pending
- Phân loại: ACTIVE vs OVERDUE
- Chạy: `node BE/scripts/inspect-pending-confirmation.js`

---

## 📊 Luồng Hoạt Động

```
Booking pending (chờ xác nhận)
    ↓
[Mỗi 10 phút] pending-confirmation-cleanup job chạy
    ↓
Kiểm tra: booking time < now?
    ├─ YES → Hủy booking + Giải phóng bàn ✓
    └─ NO → Giữ nguyên (chờ xác nhận)
```

---

## ⏱️ Tất Cả Jobs Định Kỳ

| Job | Interval | Chức Năng |
|-----|----------|----------|
| `bookingAutoCompleteJob` | 10 phút | Hoàn thành booking hết giờ |
| `tableCleanupJob` | 30 phút | Dọn dẹp bàn mồ côi |
| `pendingPaymentCleanupJob` | 5 phút | Hủy booking pending_payment > 30 phút |
| `pendingConfirmationCleanupJob` | 10 phút | **[MỚI]** Hủy booking pending quá hạn |

---

## 🧪 Kiểm Tra

```bash
# Xem booking pending hiện tại
node BE/scripts/inspect-pending-confirmation.js

# Xem trạng thái booking & bàn
node BE/scripts/inspect-booking-state.js
```

---

## 📝 Ghi Chú

✅ Job chạy **tự động** khi server khởi động  
✅ Không cần cấu hình thêm  
✅ Log sẽ in ra console khi có booking bị hủy  
✅ Bàn sẽ được giải phóng ngay lập tức  
✅ Khách có thể đặt bàn đó lại

