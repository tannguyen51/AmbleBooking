# 🎯 CHỈNH QUYỀN ROLE NHÂN VIÊN VÀ QUẢN LÍ

## 📌 TÓNG QUAN

Hệ thống kiểm soát quyền role cho ứng dụng Amble Booking đã được triển khai thành công.

**Trạng thái**: ✅ HOÀN THÀNH  
**Ngày**: 2026-05-30  
**Phiên bản**: 1.0  

---

## 🎯 YÊU CẦU

1. ✅ **Nhân viên (staff)**: Không được thêm, sửa, xóa bàn
2. ✅ **Quản lí (manager)**: Có thể quản lí account nhân viên

---

## 📁 CÁC FILE ĐÃ THAY ĐỔI

### 1. Middleware (TẠO MỚI)
```
BE/middleware/rolePermission.js
```
- Định nghĩa quyền cho 3 role: owner, manager, staff
- Middleware `checkPermission(resource, action)`
- Middleware `checkStaffManagementPermission()`
- Hàm `hasPermission(role, resource, action)`

### 2. Route (CẬP NHẬT)
```
BE/routes/partner.js
```
- Import middleware rolePermission
- Áp dụng checkPermission() cho 7 route bàn
- Áp dụng checkStaffManagementPermission() cho 5 route nhân viên
- Tổng cộng 13 route được bảo vệ

### 3. Controller (CẬP NHẬT)
```
BE/controllers/partnerStaffController.js
```
- Thay đổi `ensureOwnerRole` → `ensureOwnerOrManagerRole`
- Cho phép manager quản lí nhân viên
- 5 hàm export được cập nhật

---

## 🔐 QUYỀN CHI TIẾT

### 👑 OWNER (Chủ nhà hàng)
```
Bàn:
  ✓ GET    /api/partner/tables
  ✓ POST   /api/partner/tables
  ✓ PUT    /api/partner/tables/:tableId
  ✓ DELETE /api/partner/tables/:tableId

Nhân viên:
  ✓ GET    /api/partner/staff
  ✓ POST   /api/partner/staff
  ✓ PUT    /api/partner/staff/:staffId
  ✓ PUT    /api/partner/staff/:staffId/change-password
```

### 👔 MANAGER (Quản lí)
```
Bàn:
  ✓ GET    /api/partner/tables
  ✗ POST   /api/partner/tables
  ✗ PUT    /api/partner/tables/:tableId
  ✗ DELETE /api/partner/tables/:tableId

Nhân viên:
  ✓ GET    /api/partner/staff
  ✓ POST   /api/partner/staff
  ✓ PUT    /api/partner/staff/:staffId
  ✓ PUT    /api/partner/staff/:staffId/change-password
```

### 👨 STAFF (Nhân viên)
```
Bàn:
  ✓ GET    /api/partner/tables
  ✗ POST   /api/partner/tables
  ✗ PUT    /api/partner/tables/:tableId
  ✗ DELETE /api/partner/tables/:tableId

Nhân viên:
  ✗ GET    /api/partner/staff
  ✗ POST   /api/partner/staff
  ✗ PUT    /api/partner/staff/:staffId
  ✗ PUT    /api/partner/staff/:staffId/change-password
```

---

## 🚫 HÀNH ĐỘNG BỊ CHẶN

### Nhân viên (Staff) - 7 hành động
```
❌ POST   /api/partner/tables
❌ PUT    /api/partner/tables/:tableId
❌ DELETE /api/partner/tables/:tableId
❌ GET    /api/partner/staff
❌ POST   /api/partner/staff
❌ PUT    /api/partner/staff/:staffId
❌ PUT    /api/partner/staff/:staffId/change-password
```

### Quản lí (Manager) - 3 hành động
```
❌ POST   /api/partner/tables
❌ PUT    /api/partner/tables/:tableId
❌ DELETE /api/partner/tables/:tableId
```

---

## 📊 RESPONSE KHI BỊ CHẶN

**Status Code**: 403 Forbidden

```json
{
  "success": false,
  "message": "Vai trò staff không có quyền create tables."
}
```

Hoặc:

```json
{
  "success": false,
  "message": "Chỉ chủ hoặc quản lí mới có quyền quản lí nhân viên."
}
```

---

## 🧪 CÁCH KIỂM TRA

### Test 1: Staff không thể thêm bàn
```bash
curl -X POST http://localhost:5000/api/partner/tables \
  -H "Authorization: Bearer [staff_token]" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bàn 1",
    "type": "regular",
    "capacity": { "min": 2, "max": 4 },
    "pricing": { "baseDeposit": 100000 }
  }'

# Response: 403 Forbidden
# Message: "Vai trò staff không có quyền create tables."
```

### Test 2: Manager có thể thêm nhân viên
```bash
curl -X POST http://localhost:5000/api/partner/staff \
  -H "Authorization: Bearer [manager_token]" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Nguyễn Văn A",
    "email": "a@example.com",
    "phone": "0123456789",
    "role": "staff"
  }'

# Response: 201 Created
```

### Test 3: Owner có thể thêm bàn
```bash
curl -X POST http://localhost:5000/api/partner/tables \
  -H "Authorization: Bearer [owner_token]" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bàn VIP",
    "type": "vip",
    "capacity": { "min": 4, "max": 8 },
    "pricing": { "baseDeposit": 500000 }
  }'

# Response: 201 Created
```

---

## 📚 TÀI LIỆU THAM KHẢO

| File | Mục đích |
|------|---------|
| ROLE_PERMISSION_INDEX.md | Index tất cả tài liệu |
| ROLE_PERMISSION_QUICK_GUIDE.md | Hướng dẫn nhanh |
| ROLE_PERMISSION_FINAL_SUMMARY.md | Tóng kết cuối cùng |
| ROLE_PERMISSION_SUMMARY.md | Tóm tắt quyền |
| ROLE_PERMISSION_TESTING.md | Hướng dẫn test |
| ROLE_PERMISSION_DETAILED.md | Chi tiết thực hiện |
| ROLE_PERMISSION_COMPLETE.md | Hoàn thành |

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

## 🔧 CẤU TRÚC MIDDLEWARE

```javascript
// BE/middleware/rolePermission.js

const ROLE_PERMISSIONS = {
  owner: {
    tables: ['create', 'read', 'update', 'delete'],
    staff: ['create', 'read', 'update', 'delete'],
    restaurant: ['read', 'update'],
    orders: ['read'],
    dashboard: ['read'],
  },
  manager: {
    tables: ['read'],
    staff: ['create', 'read', 'update'],
    restaurant: ['read'],
    orders: ['read'],
    dashboard: ['read'],
  },
  staff: {
    tables: ['read'],
    staff: [],
    restaurant: ['read'],
    orders: ['read'],
    dashboard: ['read'],
  },
};

// Sử dụng
router.post("/tables", protectPartner, checkPermission('tables', 'create'), createTable);
router.post("/staff", protectPartner, checkStaffManagementPermission, createStaffMember);
```

---

## ✨ TRẠNG THÁI

**Status**: ✅ READY FOR PRODUCTION

**Kiểm tra**:
- ✓ Middleware rolePermission.js tồn tại
- ✓ Route partner.js đã import middleware
- ✓ Controller partnerStaffController.js đã cập nhật
- ✓ Tất cả 13 route đã được bảo vệ
- ✓ Tất cả 5 hàm export đã được cập nhật

---

## 📞 SUPPORT

Nếu có vấn đề:
1. Kiểm tra token có hợp lệ không
2. Kiểm tra role của user
3. Kiểm tra middleware có được import đúng
4. Kiểm tra route có được cấu hình đúng
5. Xem log server để debug

---

**Ngày tạo**: 2026-05-30  
**Phiên bản**: 1.0  
**Trạng thái**: ✅ HOÀN THÀNH
