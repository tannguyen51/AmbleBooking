# Luồng đặt bàn - Từ khách hàng đến nhà hàng

## 1. Tổng quan trạng thái

### Booking (Đơn đặt bàn)
```
pending → confirmed → occupied → completed
  ↓          ↓                      ↓
declined  cancelled              no_show
```

### Payment (Thanh toán)
```
unpaid → paid → refund_pending → refunded
```

### Table (Bàn)
```
available → reserved → occupied → cleaning → available
```

> **Lưu ý:** `isAvailable` tự động đồng bộ với `status` qua `pre-save` hook.
> `isAvailable = true` khi `status === 'available'`.

---

## 2. Luồng chi tiết

### Bước 1: Khách hàng đặt bàn

**Màn hình:** `select-table.tsx` (3 bước)
1. Chọn ngày, số khách, khung giờ
2. Chọn loại bàn (Standard / View / VIP)
3. Chọn bàn cụ thể → nhấn "Đặt bàn"

**Màn hình:** `confirm.tsx`
- Xem lại thông tin: nhà hàng, bàn, ngày giờ, số khách, tiền cọc
- Chọn phương thức thanh toán: **PayOS** (online) hoặc **Bank** (chuyển khoản)
- Nhấn "Xác nhận đặt bàn"

**API:** `POST /api/booking/create`
- Kiểm tra bàn còn trống (atomic lock)
- Tạo booking với `status: 'pending'`, `payment.status: 'unpaid'`

**Kết quả:**
| Loại thanh toán | Booking status | Table status | Payment status |
|---|---|---|---|
| Bank/Cash | pending | reserved | unpaid |
| PayOS | pending | available | unpaid |

> **PayOS:** Bàn KHÔNG bị lock ngay. Lock chỉ xảy ra khi PayOS webhook báo thanh toán thành công.

---

### Bước 2: Khách hàng thanh toán (nếu có)

#### PayOS
- App mở URL thanh toán PayOS
- PayOS gửi webhook → `payment.status = 'paid'`, table → `reserved`
- Booking vẫn ở `pending` (chờ nhà hàng xác nhận)

#### Bank Transfer (VietQR)
- App hiển thị mã QR
- Khách hàng chuyển khoản
- VietQR webhook → `payment.status = 'paid'`
- Booking vẫn ở `pending`

---

### Bước 3: Nhà hàng xử lý đơn

**Màn hình:** Partner Dashboard → Orders

#### Xác nhận (Confirm)
**API:** `PUT /api/booking/:bookingId/confirm`
- **Điều kiện:** booking đang `pending`
- Kết quả: `booking.status = 'confirmed'`, table → `reserved`
- Atomic lock: đảm bảo bàn chưa bị người khác chiếm

#### Từ chối (Decline)
**API:** `POST /api/partner/bookings/:bookingId/decline`
- **Điều kiện:** booking đang `pending`
- Kết quả: `booking.status = 'declined'`
- ⚠️ **Bàn KHÔNG được release** (xem Bug #1 bên dưới)

---

### Bước 4: Khách đến nhà hàng

#### Check-in (Nhận bàn)
**API:** `POST /api/partner/bookings/:bookingId/check-in`
- **Điều kiện:** booking đang `confirmed`
- Quyền: staff, manager, owner
- Kết quả: `booking.status = 'occupied'`, table → `occupied`

---

### Bước 5: Khách kết thúc

#### Hoàn tất (Complete)
**API:** `POST /api/partner/bookings/:bookingId/complete`
- **Điều kiện:** booking đang `occupied`
- Quyền: staff, manager, owner
- Kết quả: `booking.status = 'completed'`, table → `available`

---

### Bước 6: Xử lý đặc biệt

#### Khách hủy đơn
**API:** `DELETE /api/booking/:bookingId/cancel`
- **Điều kiện:** booking đang `pending` hoặc `confirmed`
- Kết quả: `booking.status = 'cancelled'`, table → `available`
- Nếu đã thanh toán → `payment.status = 'refund_pending'`

#### Release (Owner/Manager)
**API:** `POST /api/partner/bookings/:bookingId/release`
- **Điều kiện:** booking chưa kết thúc
- Quyền: **owner**, **manager** (staff không có quyền)
- Nếu `reason = 'no_show'` → `booking.status = 'no_show'`
- Nếu không → `booking.status = 'cancelled'`
- Kết quả: table → `available`

#### Dọn bàn (Cleaning Done)
**API:** `PUT /api/partner/tables/:tableId/cleaning-done`
- **Điều kiện:** table đang `cleaning`
- Kết quả: table → `available`

---

## 3. API Endpoints

### Customer Routes (`/api/booking/`)

| Method | Path | Mô tả |
|--------|------|-------|
| POST | /create | Tạo booking mới |
| GET | /tables/:restaurantId | Danh sách bàn trống |
| PUT | /:bookingId/confirm | Xác nhận booking |
| DELETE | /:bookingId/cancel | Hủy booking |
| GET | /user/:userId | Lịch sử đặt bàn |
| GET | /notifications/:userId | Thông báo |
| GET | /vouchers | Danh sách voucher |
| GET | /:bookingId/payment/qr | QR chuyển khoản |
| GET | /:bookingId/refund-preview | Xem tiền hoàn |
| POST | /payment/vietqr-webhook | Webhook ngân hàng |

### Partner Routes (`/api/partner/`)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | /orders | Danh sách đơn (có filter) |
| POST | /bookings/:id/check-in | Nhận bàn |
| POST | /bookings/:id/decline | Từ chối đơn |
| POST | /bookings/:id/complete | Hoàn tất |
| POST | /bookings/:id/release | Release (owner/manager) |
| GET | /tables | Danh sách bàn |
| POST | /tables | Tạo bàn mới |
| PUT | /tables/:id | Sửa bàn |
| PUT | /tables/:id/cleaning-done | Dọn xong |
| DELETE | /tables/:id | Xóa bàn |

---

## 4. Sơ đồ state machine

```
                    ┌──────────┐
                    │  pending  │ ◄── Khách đặt bàn
                    └────┬─────┘
                         │
              ┌──────────┼──────────┬──────────────┐
              │          │          │              │
              v          v          v              v
         ┌────────┐ ┌────────┐ ┌──────────┐  ┌──────────┐
         │confirmed│ │declined│ │cancelled │  │ pending  │
         └───┬────┘ └────────┘ │(bởi user)│  │(quá 60ph │
             │                 └──────────┘  │ tự hủy)  │
             v                               └──────────┘
         ┌─────────┐
         │ occupied │
         └────┬────┘
              │
      ┌───────┼──────────┐
      │       │          │
      v       v          v
  ┌─────────┐ ┌──────┐ ┌──────────┐
  │completed│ │no_show│ │cancelled │
  └─────────┘ └──────┘ │(release) │
                        └──────────┘
```

---

## 5. Bugs đã biết

### Bug #1: `declineBooking` không release bàn
- **File:** `BE/controllers/bookingController.js` (dòng ~687)
- **Vấn đề:** Khi staff decline một booking `pending` (đã lock bàn ở bước tạo), bàn vẫn ở trạng thái `reserved` vĩnh viễn.
- **Hậu quả:** Bàn không bao giờ quay lại `available`, không thể đặt lại.

### Bug #2: Cleanup service không release bàn
- **File:** `BE/services/bookingCleanupService.js`
- **Vấn đề:** Service tự động hủy booking `pending` quá 60 phút nhưng KHÔNG release bàn.
- **Hậu quả:** Giống Bug #1 — bàn bị kẹt ở `reserved`.

### Bug #3: Không có auto-confirm sau khi PayOS thanh toán
- **Vấn đề:** Sau khi PayOS webhook báo thành công, `payment.status = 'paid'` nhưng `booking.status` vẫn là `pending`. Nhà hàng phải tự confirm thủ công.
- **Hậu quả:** Khách đã thanh toán nhưng đơn chưa được xác nhận, gây nhầm lẫn.

---

## 6. Luồng thông báo

- **Khi nhà hàng xác nhận đơn:** Booking status `pending → confirmed`
  - Khách hàng nhận thông báo (qua API `/notifications/:userId`)
- **Khi sắp tới giờ đặt (trước 1h):** Hệ thống gợi ý thông báo
- **Khi nhà hàng từ chối:** Khách cần được thông báo (đang thiếu)
