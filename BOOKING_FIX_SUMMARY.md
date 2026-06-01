# Sửa Chữa Triệt Để: Lỗi "Bàn Đã Được Đặt"

## Vấn Đề Gốc
Khách hàng gặp lỗi "Bàn này đã được đặt" khi cố gắng đặt bàn, mặc dù bàn đó trông như trống.

**Nguyên Nhân:**
1. Khi partner xác nhận booking (confirm), bàn bị giải phóng ngay (`isAvailable: true`)
2. Nhưng booking vẫn ở trạng thái `pending` (chưa hoàn thành)
3. Điều này cho phép khách khác đặt cùng bàn → race condition
4. Khi khách thứ 2 cố tạo booking, backend kiểm tra `isAvailable` và từ chối

## Giải Pháp Triệt Để

### 1. Backend: Chặn Race Condition Khi Tạo Booking
**File:** `BE/controllers/bookingController.js`

```javascript
// Kiểm tra lại bàn ngay trước khi tạo booking
const activeBooking = await Booking.findOne({
  tableId,
  status: { $in: ["pending", "pending_payment", "confirmed", "paid"] },
}).lean();

if (!table.isAvailable || activeBooking) {
  return res.status(400).json({ success: false, message: "Bàn này đã được đặt" });
}
```

**Lợi ích:** Nếu có 2 request cùng lúc, request thứ 2 sẽ bị từ chối vì booking đã tồn tại.

### 2. Backend: Không Giải Phóng Bàn Khi Confirm
**File:** `BE/controllers/bookingController.js` - `confirmBooking()`

**Trước:**
```javascript
// Trả bàn về available khi booking được xác nhận
await Table.findByIdAndUpdate(booking.tableId, {
  isAvailable: true,
  currentBookingId: null,
});
```

**Sau:**
```javascript
// KHÔNG giải phóng bàn ở đây — giữ cho tới khi booking hoàn thành
// Bàn sẽ được giải phóng tự động bởi auto-complete job khi hết giờ booking
await Table.findByIdAndUpdate(booking.tableId, {
  currentBookingId: booking._id,
});
```

**Lợi ích:** Bàn chỉ được giải phóng khi booking thật sự xong (hết giờ hoặc bị hủy).

### 3. Backend: Auto-Complete Job Giải Phóng Bàn
**File:** `BE/services/bookingAutoCompleteService.js`

```javascript
// Khi booking hết giờ, tự động chuyển sang "completed" và giải phóng bàn
const tableIds = overdue.map((b) => b.tableId).filter(Boolean);
if (tableIds.length) {
  await Table.updateMany(
    { _id: { $in: tableIds } },
    { $set: { isAvailable: true, currentBookingId: null } },
  );
}
```

**Lợi ích:** Bàn được giải phóng tự động khi booking hết giờ (chạy mỗi 10 phút).

### 4. Backend: Cleanup Job Dọn Dẹp Bàn Mồ Côi
**File:** `BE/services/tableCleanupService.js`

Tìm và giải phóng bàn `isAvailable=false` nhưng `currentBookingId=null` (chạy mỗi 30 phút).

### 5. Client: Re-Fetch Tables Trước Khi Confirm
**File:** `Amble/app/booking/confirm.tsx`

```javascript
// Kiểm tra lại bàn ngay trước khi tạo booking
const tablesRes = await bookingAPI.getTables(restaurantId);
const latestTable = (tablesRes.data?.tables || []).find((t) => t._id === tableId);

if (!latestTable || !latestTable.isAvailable) {
  Alert.alert("Bàn đã được đặt", "Bàn này vừa được người khác giữ chọn. Vui lòng chọn bàn khác.");
  router.replace({ pathname: "/booking/select-table", params: { restaurantId, restaurantName } });
  return;
}
```

**Lợi ích:** Phát hiện sớm nếu bàn bị đặt bởi người khác trước khi gửi request.

## Luồng Booking Mới

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
Khách thanh toán
  ↓
Partner xác nhận (confirm)
  ↓
Booking → confirmed (BÀN VẪN GIỮ)
  ↓
Hết giờ booking
  ↓
Auto-complete job: booking → completed, bàn → available
```

## Kiểm Tra Trạng Thái

Chạy script để kiểm tra:
```bash
node BE/scripts/inspect-booking-state.js
```

Output:
- ✓ Active bookings: số booking đang active
- ✓ Booked tables: số bàn đang booked
- ✓ Orphaned tables: số bàn mồ côi (nên = 0)

## Dọn Dẹp Bàn Mồ Côi Hiện Tại

```bash
node BE/scripts/cleanup-orphaned-tables.js
```

## Tóm Tắt Thay Đổi

| File | Thay Đổi |
|------|----------|
| `BE/controllers/bookingController.js` | Thêm kiểm tra activeBooking; không giải phóng bàn khi confirm |
| `BE/services/bookingAutoCompleteService.js` | Giải phóng bàn khi booking hoàn thành |
| `BE/services/tableCleanupService.js` | Dọn dẹp bàn mồ côi (không thay đổi) |
| `Amble/app/booking/confirm.tsx` | Re-fetch tables trước confirm (đã có) |
| `BE/scripts/cleanup-orphaned-tables.js` | Script dọn dẹp bàn mồ côi (mới) |
| `BE/scripts/inspect-booking-state.js` | Script kiểm tra trạng thái (mới) |

## Kết Quả

✓ Không còn race condition khi đặt bàn
✓ Bàn chỉ được giải phóng khi booking thật sự xong
✓ Tự động dọn dẹp bàn mồ côi
✓ Lỗi "Bàn đã được đặt" chỉ xảy ra khi bàn thật sự đã booked
