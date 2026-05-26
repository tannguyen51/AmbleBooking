# Phân Quyền Nhân Sự Nhà Hàng (Multi-role)

Áp dụng cho tài khoản trong khu vực Partner của từng nhà hàng:

- `owner`: Chủ nhà hàng
- `manager`: Quản lý
- `staff`: Nhân viên

## Danh sách permission

- `dashboard:view`: Xem dashboard nhà hàng
- `orders:view`: Xem danh sách đơn/đặt bàn
- `orders:update_status`: Cập nhật trạng thái đơn
- `tables:view`: Xem danh sách bàn
- `tables:manage`: Tạo/sửa/xóa bàn
- `restaurant_profile:view`: Xem hồ sơ nhà hàng
- `restaurant_profile:edit`: Chỉnh sửa hồ sơ nhà hàng
- `staff:view`: Xem danh sách nhân sự
- `staff:create`: Tạo tài khoản quản lý/nhân viên
- `staff:update`: Sửa vai trò/thông tin nhân sự
- `staff:deactivate`: Khóa/mở tài khoản nhân sự
- `notifications:view`: Xem thông báo

## Ma trận quyền

### Owner
- Có toàn bộ quyền ở trên.
- Được tạo nhiều tài khoản `manager` và `staff` trong cùng nhà hàng.

### Manager
- Quản lý vận hành: dashboard, đơn, bàn, hồ sơ nhà hàng, thông báo.
- Không có quyền quản lý nhân sự (`staff:*`).

### Staff
- Quyền vận hành cơ bản: xem dashboard, xem/cập nhật đơn, xem bàn, xem thông báo.
- Không có quyền cấu hình nhà hàng và nhân sự.

## Ghi chú luồng tạo tài khoản nhân sự

- Owner tạo tài khoản mới trong màn hình quản lý nhân sự.
- Hệ thống backend tự sinh tài khoản thuộc `restaurantId` của owner.
- Backend chịu trách nhiệm gửi thông tin đăng nhập (email/SMS) cho người được tạo.

