# 📑 INDEX - CHỈNH QUYỀN ROLE NHÂN VIÊN VÀ QUẢN LÍ

## 🎯 TÓNG QUAN DỰ ÁN

**Mục tiêu**: Triển khai hệ thống kiểm soát quyền role cho ứng dụng Amble Booking

**Trạng thái**: ✅ HOÀN THÀNH

**Ngày hoàn thành**: 2026-05-30

---

## 📚 DANH SÁCH TÀI LIỆU

### 1. 🚀 HƯỚNG DẪN NHANH
**File**: `ROLE_PERMISSION_QUICK_GUIDE.md`
- Quick reference cho các quyền
- Bảng so sánh quyền
- Test nhanh
- Lưu ý quan trọng

### 2. 📋 TÓNG KẾT CUỐI CÙNG
**File**: `ROLE_PERMISSION_FINAL_SUMMARY.md`
- Hoàn thành
- Yêu cầu ban đầu
- Thay đổi thực hiện
- Quyền chi tiết
- Hành động bị chặn
- Cách kiểm tra

### 3. 📝 TÓNG TẮT QUYỀN
**File**: `ROLE_PERMISSION_SUMMARY.md`
- Các thay đổi đã thực hiện
- Quyền chi tiết
- Hành động bị chặn
- Response khi bị chặn

### 4. 🧪 HƯỚNG DẪN TEST
**File**: `ROLE_PERMISSION_TESTING.md`
- Cách kiểm tra hệ thống quyền
- Test cho nhân viên
- Test cho quản lí
- Test cho chủ
- Cách tạo test token

### 5. 🔧 CHI TIẾT THỰC HIỆN
**File**: `ROLE_PERMISSION_DETAILED.md`
- Chi tiết các file thay đổi
- Middleware rolePermission.js
- Route partner.js
- Controller partnerStaffController.js
- Bảng quyền chi tiết
- Hành động bị chặn
- Response khi bị chặn
- Cách kiểm tra

### 6. ✅ HOÀN THÀNH
**File**: `ROLE_PERMISSION_COMPLETE.md`
- Hoàn thành
- Tóng quan thay đổi
- Danh sách file tham khảo
- Cách kiểm tra nhanh
- Lưu ý quan trọng

---

## 🔧 CÁC FILE CODE ĐÃ THAY ĐỔI

### 1. Middleware (TẠO MỚI)
**File**: `BE/middleware/rolePermission.js`
- Định nghĩa quyền cho 3 role
- Middleware checkPermission()
- Middleware checkStaffManagementPermission()
- Hàm hasPermission()

### 2. Route (CẬP NHẬT)
**File**: `BE/routes/partner.js`
- Import middleware rolePermission
- Áp dụng checkPermission() cho route bàn
- Áp dụng checkStaffManagementPermission() cho route nhân viên
- 13 route được bảo vệ

### 3. Controller (CẬP NHẬT)
**File**: `BE/controllers/partnerStaffController.js`
- Thay đổi ensureOwnerRole → ensureOwnerOrManagerRole
- Cho phép manager quản lí nhân viên
- 5 hàm export được cập nhật

---

## 🔐 QUYỀN CHI TIẾT

### OWNER (Chủ nhà hàng) - ✅ Toàn quyền
```
Bàn:
  ✓ Xem (GET)
  ✓ Thêm (POST)
  ✓ Sửa (PUT)
  ✓ Xóa (DELETE)

Nhân viên:
  ✓ Xem (GET)
  ✓ Thêm (POST)
  ✓ Sửa (PUT)
  ✓ Xóa (DELETE)

Nhà hàng:
  ✓ Xem (GET)
  ✓ Sửa (PUT)

Đơn hàng:
  ✓ Xem (GET)

Dashboard:
  ✓ Xem (GET)
```

### MANAGER (Quản lí) - ✅ Quản lí nhân viên
```
Bàn:
  ✓ Xem (GET)
  ✗ Thêm (POST)
  ✗ Sửa (PUT)
  ✗ Xóa (DELETE)

Nhân viên:
  ✓ Xem (GET)
  ✓ Thêm (POST)
  ✓ Sửa (PUT)
  ✗ Xóa (DELETE)

Nhà hàng:
  ✓ Xem (GET)
  ✗ Sửa (PUT)

Đơn hàng:
  ✓ Xem (GET)

Dashboard:
  ✓ Xem (GET)
```

### STAFF (Nhân viên) - ✅ Chỉ xem
```
Bàn:
  ✓ Xem (GET)
  ✗ Thêm (POST)
  ✗ Sửa (PUT)
  ✗ Xóa (DELETE)

Nhân viên:
  ✗ Xem (GET)
  ✗ Thêm (POST)
  ✗ Sửa (PUT)
  ✗ Xóa (DELETE)

Nhà hàng:
  ✓ Xem (GET)
  ✗ Sửa (PUT)

Đơn hàng:
  ✓ Xem (GET)

Dashboard:
  ✓ Xem (GET)
```

---

## 🚫 HÀNH ĐỘNG BỊ CHẶN

### Nhân viên (Staff) - 7 hành động
1. ❌ POST /api/partner/tables
2. ❌ PUT /api/partner/tables/:tableId
3. ❌ DELETE /api/partner/tables/:tableId
4. ❌ GET /api/partner/staff
5. ❌ POST /api/partner/staff
6. ❌ PUT /api/partner/staff/:staffId
7. ❌ PUT /api/partner/staff/:staffId/change-password

### Quản lí (Manager) - 3 hành động
1. ❌ POST /api/partner/tables
2. ❌ PUT /api/partner/tables/:tableId
3. ❌ DELETE /api/partner/tables/:tableId

---

## 🧪 CÁCH KIỂM TRA NHANH

### Test 1: Staff không thể thêm bàn
```bash
curl -X POST http://localhost:5000/api/partner/tables \
  -H "Authorization: Bearer [staff_token]" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bàn 1","type":"regular","capacity":{"min":2,"max":4},"pricing":{"baseDeposit":100000}}'

# Response: 403 Forbidden
```

### Test 2: Manager có thể thêm nhân viên
```bash
curl -X POST http://localhost:5000/api/partner/staff \
  -H "Authorization: Bearer [manager_token]" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Nguyễn Văn A","email":"a@example.com","phone":"0123456789","role":"staff"}'

# Response: 201 Created
```

### Test 3: Owner có thể thêm bàn
```bash
curl -X POST http://localhost:5000/api/partner/tables \
  -H "Authorization: Bearer [owner_token]" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bàn VIP","type":"vip","capacity":{"min":4,"max":8},"pricing":{"baseDeposit":500000}}'

# Response: 201 Created
```

---

## 📊 BẢNG SO SÁNH QUYỀN

| Hành động | Owner | Manager | Staff |
|-----------|-------|---------|-------|
| Xem bàn | ✓ | ✓ | ✓ |
| Thêm bàn | ✓ | ✗ | ✗ |
| Sửa bàn | ✓ | ✗ | ✗ |
| Xóa bàn | ✓ | ✗ | ✗ |
| Xem nhân viên | ✓ | ✓ | ✗ |
| Thêm nhân viên | ✓ | ✓ | ✗ |
| Sửa nhân viên | ✓ | ✓ | ✗ |
| Xóa nhân viên | ✓ | ✗ | ✗ |

---

## 💡 LƯU Ý QUAN TRỌNG

1. **Middleware được kiểm tra trước controller**
   - Nếu không có quyền → 403 Forbidden ngay lập tức
   - Không bao giờ đến logic controller

2. **Manager có thể quản lí nhân viên**
   - Tạo nhân viên mới
   - Xem danh sách nhân viên
   - Sửa thông tin nhân viên
   - Đổi mật khẩu nhân viên
   - NHƯNG không thể xóa nhân viên

3. **Nhân viên chỉ có quyền xem**
   - Không thể thêm/sửa/xóa bàn
   - Không thể quản lí nhân viên
   - Chỉ xem thông tin

4. **Chủ nhà hàng có toàn quyền**
   - Quản lí bàn, nhân viên, nhà hàng
   - Xem đơn hàng và dashboard

---

## 📞 SUPPORT

Nếu có vấn đề:
1. Kiểm tra token có hợp lệ không
2. Kiểm tra role của user
3. Kiểm tra middleware có được import đúng
4. Kiểm tra route có được cấu hình đúng
5. Xem log server để debug

---

## ✨ TRẠNG THÁI

**Status**: ✅ READY FOR PRODUCTION

**Ngày tạo**: 2026-05-30
**Phiên bản**: 1.0
**Hoàn thành**: ✅ YES
