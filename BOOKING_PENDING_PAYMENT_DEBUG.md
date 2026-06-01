# 🔧 Hướng Dẫn: Kiểm Tra Booking Pending_Payment

## 📋 Tóm Tắt Vấn Đề

Bạn đặt bàn nhưng không thấy đơn chưa thanh toán ở trang "đặt bàn" (history).

**Nguyên nhân có thể:**
1. Frontend chưa refresh sau khi tạo booking
2. Tab "Chờ thanh toán" bị ẩn hoặc không render
3. API fetch thất bại

## ✅ Những Gì Đã Được Kiểm Tra

### Backend
- ✅ Booking `pending_payment` đã được tạo trong database
- ✅ Booking ID: BK-20260529-5967
- ✅ API `getUserBookings()` trả về booking này

### Frontend
- ✅ File `history.tsx` có tab "Chờ thanh toán"
- ✅ Tab config đúng: `{ id: "pending_payment", label: "Chờ thanh toán", statuses: ["pending_payment"] }`
- ✅ Thêm log để debug

## 🧪 Cách Kiểm Tra

### Bước 1: Vào trang "đặt bàn" (history)
- Bạn có thấy 4 tab không?
  - "Đang đặt"
  - "Chờ thanh toán" ← **Tab này**
  - "Đã xong"
  - "Đã hủy"

### Bước 2: Click vào tab "Chờ thanh toán"
- Bạn có thấy booking BK-20260529-5967 không?

### Bước 3: Nếu không thấy
- Thử pull-to-refresh (kéo xuống)
- Hoặc quay lại trang chủ rồi vào lại

### Bước 4: Kiểm tra console
- Mở DevTools (F12)
- Xem console log:
  - `[history] Fetched bookings: X` (X = số booking)
  - Có lỗi nào không?

## 📝 Ghi Chú

- Bàn đã bị khóa (isAvailable=false) ✅
- Booking đã được tạo trong database ✅
- API trả về booking đúng ✅
- Frontend có UI để hiển thị ✅

**Vấn đề có thể là frontend chưa refresh hoặc có lỗi fetch**

## 🔍 Nếu Vẫn Không Thấy

Hãy cho tôi biết:
1. Bạn có thấy tab "Chờ thanh toán" không?
2. Nếu có, click vào tab đó, bạn có thấy gì không?
3. Mở console, có lỗi nào không?

