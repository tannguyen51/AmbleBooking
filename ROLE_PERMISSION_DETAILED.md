# CHỈNH QUYỀN ROLE - CHI TIẾT THỰC HIỆN

## 📋 TỔNG QUAN

Đã triển khai hệ thống kiểm soát quyền role cho 3 vai trò:
- **Owner (Chủ)**: Toàn quyền
- **Manager (Quản lí)**: Quản lí nhân viên, xem bàn/đơn hàng
- **Staff (Nhân viên)**: Chỉ xem, không được thêm/sửa/xóa

---

## 📁 CÁC FILE ĐÃ THAY ĐỔI

### 1. BE/middleware/rolePermission.js (TẠO MỚI)
**Mục đích**: Định nghĩa quyền cho mỗi role

**Nội dung chính**:
```javascript
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
```

**Middleware được cung cấp**:
- `checkPermission(resource, action)` - Kiểm tra quyền chi tiết
- `checkStaffManagementPermission()` - Chỉ owner/manager mới quản lí nhân viên
- `hasPermission(role, resource, action)` - Hàm kiểm tra quyền

---

### 2. BE/routes/partner.js (CẬP NHẬT)
**Thay đổi**: Thêm middleware kiểm soát quyền vào tất cả route

**Trước**:
```javascript
router.post("/tables", protectPartner, createTable);
router.put("/tables/:tableId", protectPartner, updateTable);
router.delete("/tables/:tableId", protectPartner, deleteTable);
router.post("/staff", protectPartner, createStaffMember);
```

**Sau**:
```javascript
router.post("/tables", protectPartner, checkPermission('tables', 'create'), createTable);
router.put("/tables/:tableId", protectPartner, checkPermission('tables', 'update'), updateTable);
router.delete("/tables/:tableId", protectPartner, checkPermission('tables', 'delete'), deleteTable);
router.post("/staff", protectPartner, checkStaffManagementPermission, createStaffMember);
```

**Route được bảo vệ**:
- GET /api/partner/tables - checkPermission('tables', 'read')
- POST /api/partner/tables - checkPermission('tables', 'create')
- PUT /api/partner/tables/:tableId - checkPermission('tables', 'update')
- DELETE /api/partner/tables/:tableId - checkPermission('tables', 'delete')
- GET /api/partner/staff - checkStaffManagementPermission
- POST /api/partner/staff - checkStaffManagementPermission
- PUT /api/partner/staff/:staffId - checkStaffManagementPermission

---

### 3. BE/controllers/partnerStaffController.js (CẬP NHẬT)
**Thay đổi**: Cho phép manager quản lí nhân viên

**Trước**:
```javascript
const ensureOwnerRole = (req, res) => {
  if (req.partner?.role !== "owner") {
    res.status(403).json({
      success: false,
      message: "Chỉ chủ nhà hàng mới có quyền quản lí nhân viên.",
    });
    return false;
  }
  return true;
};
```

**Sau**:
```javascript
const ensureOwnerOrManagerRole = (req, res) => {
  const role = req.partner?.role;
  if (!["owner", "manager"].includes(role)) {
    res.status(403).json({
      success: false,
      message: "Chỉ chủ hoặc quản lí mới có quyền quản lí nhân viên.",
    });
    return false;
  }
  return true;
};
```

**Tất cả hàm export đã được cập nhật**:
- getStaffMembers()
- createStaffMember()
- updateStaffMember()
- resendStaffCredentials()
- changeStaffPassword()

---

## 🔐 QUYỀN CHI TIẾT

### OWNER (Chủ nhà hàng)
| Hành động | Bàn | Nhân viên | Nhà hàng | Đơn hàng | Dashboard |
|-----------|-----|----------|---------|---------|-----------|
| Xem       | ✓   | ✓        | ✓       | ✓       | ✓         |
| Thêm      | ✓   | ✓        | ✗       | ✗       | ✗         |
| Sửa       | ✓   | ✓        | ✓       | ✗       | ✗         |
| Xóa       | ✓   | ✓        | ✗       | ✗       | ✗         |

### MANAGER (Quản lí)
| Hành động | Bàn | Nhân viên | Nhà hàng | Đơn hàng | Dashboard |
|-----------|-----|----------|---------|---------|-----------|
| Xem       | ✓   | ✓        | ✓       | ✓       | ✓         |
| Thêm      | ✗   | ✓        | ✗       | ✗       | ✗         |
| Sửa       | ✗   | ✓        | ✗       | ✗       | ✗         |
| Xóa       | ✗   | ✗        | ✗       | ✗       | ✗         |

### STAFF (Nhân viên)
| Hành động | Bàn | Nhân viên | Nhà hàng | Đơn hàng | Dashboard |
|-----------|-----|----------|---------|---------|-----------|
| Xem       | ✓   | ✗        | ✓       | ✓       | ✓         |
| Thêm      | ✗   | ✗        | ✗       | ✗       | ✗         |
| Sửa       | ✗   | ✗        | ✗       | ✗       | ✗         |
| Xóa       | ✗   | ✗        | ✗       | ✗       | ✗         |

---

## ⚠️ HÀNH ĐỘNG BỊ CHẶN

### Nhân viên (Staff) không thể:
1. ❌ Thêm bàn (POST /api/partner/tables)
2. ❌ Sửa bàn (PUT /api/partner/tables/:tableId)
3. ❌ Xóa bàn (DELETE /api/partner/tables/:tableId)
4. ❌ Xem danh sách nhân viên (GET /api/partner/staff)
5. ❌ Thêm nhân viên (POST /api/partner/staff)
6. ❌ Sửa nhân viên (PUT /api/partner/staff/:staffId)
7. ❌ Đổi mật khẩu nhân viên (PUT /api/partner/staff/:staffId/change-password)

### Quản lí (Manager) không thể:
1. ❌ Thêm bàn (POST /api/partner/tables)
2. ❌ Sửa bàn (PUT /api/partner/tables/:tableId)
3. ❌ Xóa bàn (DELETE /api/partner/tables/:tableId)
4. ❌ Xóa nhân viên (không có endpoint xóa, nhưng được kiểm soát)

---

## 📝 RESPONSE KHI BỊ CHẶN

**Status Code**: 403 Forbidden

**Response Body**:
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

### 1. Kiểm tra nhân viên không thể thêm bàn
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
```

### 2. Kiểm tra quản lí có thể thêm nhân viên
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

### 3. Kiểm tra chủ có toàn quyền
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

- ROLE_PERMISSION_SUMMARY.md - Tóm tắt quyền
- ROLE_PERMISSION_TESTING.md - Hướng dẫn test
- BE/middleware/rolePermission.js - Middleware quyền
- BE/routes/partner.js - Route với quyền
- BE/controllers/partnerStaffController.js - Controller quản lí nhân viên
