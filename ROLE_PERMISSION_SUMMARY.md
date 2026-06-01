# ROLE PERMISSION SYSTEM - SUMMARY

## Các thay đổi đã thực hiện:

### 1. Tạo Middleware: rolePermission.js
- File: BE/middleware/rolePermission.js
- Định nghĩa quyền cho 3 role: owner, manager, staff
- Cung cấp 2 middleware chính:
  * checkPermission(resource, action) - kiểm tra quyền chi tiết
  * checkStaffManagementPermission - chỉ owner/manager mới quản lí nhân viên

### 2. Cập nhật Routes: partner.js
- Thêm middleware kiểm soát quyền vào tất cả route
- Áp dụng checkPermission cho các hành động bàn (tables)
- Áp dụng checkStaffManagementPermission cho quản lí nhân viên

### 3. Cập nhật Controller: partnerStaffController.js
- Thay đổi ensureOwnerRole thành ensureOwnerOrManagerRole
- Cho phép manager quản lí nhân viên (tạo, xem, sửa)
- Giữ nguyên logic xác thực nhà hàng

## QUYỀN CHI TIẾT:

### OWNER (Chủ nhà hàng):
✓ Bàn: Xem, Thêm, Sửa, Xóa
✓ Nhân viên: Xem, Thêm, Sửa, Xóa
✓ Nhà hàng: Xem, Sửa
✓ Đơn hàng: Xem
✓ Dashboard: Xem

### MANAGER (Quản lí):
✓ Bàn: Xem (chỉ xem)
✓ Nhân viên: Xem, Thêm, Sửa (không xóa)
✓ Nhà hàng: Xem
✓ Đơn hàng: Xem
✓ Dashboard: Xem

### STAFF (Nhân viên):
✓ Bàn: Xem (chỉ xem)
✗ Nhân viên: Không có quyền
✓ Nhà hàng: Xem
✓ Đơn hàng: Xem
✓ Dashboard: Xem

## HÀNH ĐỘNG BỊ CHẶN:

1. Nhân viên (staff) không thể:
   - Thêm bàn
   - Sửa bàn
   - Xóa bàn
   - Quản lí nhân viên

2. Quản lí (manager) không thể:
   - Thêm bàn
   - Sửa bàn
   - Xóa bàn
   - Xóa nhân viên

## RESPONSE KHI BỊ CHẶN:

Status: 403 Forbidden
{
  "success": false,
  "message": "Vai trò [role] không có quyền [action] [resource]."
}

Hoặc:

{
  "success": false,
  "message": "Chỉ chủ hoặc quản lí mới có quyền quản lí nhân viên."
}
