# 🔍 Kiểm Tra: Booking Pending_Payment Không Hiển Thị

## 📋 Tóm Tắt Vấn Đề

Bạn đặt bàn nhưng:
- ❌ Không thấy đơn chưa thanh toán ở trang "đặt bàn"
- ✅ Bàn đã bị ẩn trong nhà hàng

## ✅ Những Gì Đã Kiểm Tra

### 1. Database
- ✅ Booking `pending_payment` đã được tạo
- ✅ Booking ID: BK-20260529-5967
- ✅ Status: pending_payment
- ✅ User ID: 69c400c2ee7fec1feaa45029

### 2. API Backend
- ✅ `getUserBookings()` trả về booking pending_payment
- ✅ Booking có trong danh sách 32 bookings của user

### 3. Frontend
- ✅ File `history.tsx` có tab "Chờ thanh toán"
- ✅ Tab config: `{ id: "pending_payment", label: "Chờ thanh toán", statuses: ["pending_payment"] }`
- ✅ Status display: `pending_payment: { label: "Chờ thanh toán", color: "#B45309", bg: "#FEF3C7" }`

## 🤔 Nguyên Nhân Có Thể

1. **Frontend không refresh** sau khi tạo booking
   - Booking được tạo nhưng frontend chưa fetch lại danh sách
   - Cần refresh trang hoặc pull-to-refresh

2. **Tab "Chờ thanh toán" bị ẩn**
   - Có thể tab không được render nếu không có booking pending_payment
   - Hoặc tab bị ẩn bởi logic nào đó

3. **Fetch bookings thất bại**
   - API call không thành công
   - Cần kiểm tra console log

## 🧪 Cách Kiểm Tra

### Bước 1: Vào trang "đặt bàn" (history)
- Bạn có thấy tab "Chờ thanh toán" không?

### Bước 2: Nếu thấy tab
- Click vào tab "Chờ thanh toán"
- Bạn có thấy booking BK-20260529-5967 không?

### Bước 3: Nếu không thấy
- Thử pull-to-refresh (kéo xuống)
- Hoặc quay lại trang chủ rồi vào lại

### Bước 4: Kiểm tra console
- Mở DevTools (F12)
- Xem có lỗi nào không

## 📝 Ghi Chú

- Booking đã được tạo thành công trong database
- Bàn đã bị khóa (isAvailable=false)
- API trả về booking đúng
- Frontend có UI để hiển thị tab "Chờ thanh toán"

**Vấn đề có thể là frontend chưa refresh hoặc tab bị ẩn**

