# 🚀 HƯỚNG DẪN NHANH - QUYỀN ROLE

## 📌 QUICK REFERENCE

### Nhân viên (Staff) - Chỉ xem
```
GET  /api/partner/tables          ✓ Xem bàn
POST /api/partner/tables          ✗ CHẶN
PUT  /api/partner/tables/:id      ✗ CHẶN
DEL  /api/partner/tables/:id      ✗ CHẶN

GET  /api/partner/staff           ✗ CHẶN
POST /api/partner/staff           ✗ CHẶN
PUT  /api/partner/staff/:id       ✗ CHẶN
```

### Quản lí (Manager) - Quản lí nhân viên
```
GET  /api/partner/tables          ✓ Xem bàn
POST /api/partner/tables          ✗ CHẶN
PUT  /api/partner/tables/:id      ✗ CHẶN
DEL  /api/partner/tables/:id      ✗ CHẶN

GET  /api/partner/staff           ✓ Xem nhân viên
POST /api/partner/staff           ✓ Thêm nhân viên
PUT  /api/partner/staff/:id       ✓ Sửa nhân viên
```

### Chủ (Owner) - Toàn quyền
```
GET  /api/partner/tables          ✓ Xem bàn
POST /api/partner/tables          ✓ Thêm bàn
PUT  /api/partner/tables/:id      ✓ Sửa bàn
DEL  /api/partner/tables/:id      ✓ Xóa bàn

GET  /api/partner/staff           ✓ Xem nhân viên
POST /api/partner/staff           ✓ Thêm nhân viên
PUT  /api/partner/staff/:id       ✓ Sửa nhân viên
```

---

## 🔧 CÁC FILE CHÍNH

### 1. Middleware: rolePermission.js
```javascript
// Định nghĩa quyền
const ROLE_PERMISSIONS = {
  owner: { tables: ['create', 'read', 'update', 'delete'], ... },
  manager: { tables: ['read'], staff: ['create', 'read', 'update'], ... },
  staff: { tables: ['read'], staff: [], ... }
};

// Sử dụng
checkPermission('tables', 'create')
checkStaffManagementPermission()
```

### 2. Route: partner.js
```javascript
// Bàn - với quyền
router.post("/tables", protectPartner, checkPermission('tables', 'create'), createTable);
router.put("/tables/:tableId", protectPartner, checkPermission('tables', 'update'), updateTable);
router.delete("/tables/:tableId", protectPartner, checkPermission('tables', 'delete'), deleteTable);

// Nhân viên - với quyền
router.post("/staff", protectPartner, checkStaffManagementPermission, createStaffMember);
router.put("/staff/:staffId", protectPartner, checkStaffManagementPermission, updateStaffMember);
```

### 3. Controller: partnerStaffController.js
```javascript
// Kiểm tra owner hoặc manager
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

---

## 🧪 TEST NHANH

### Test 1: Staff không thể thêm bàn
```bash
curl -X POST http://localhost:5000/api/partner/tables \
  -H "Authorization: Bearer [staff_token]" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bàn 1","type":"regular","capacity":{"min":2,"max":4},"pricing":{"baseDeposit":100000}}'

# Response: 403 Forbidden
# Message: "Vai trò staff không có quyền create tables."
```

### Test 2: Manager có thể thêm nhân viên
```bash
curl -X POST http://localhost:5000/api/partner/staff \
  -H "Authorization: Bearer [manager_token]" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Nguyễn Văn A","email":"a@example.com","phone":"0123456789","role":"staff"}'

# Response: 201 Created
# Staff mới được tạo thành công
```

### Test 3: Owner có thể thêm bàn
```bash
curl -X POST http://localhost:5000/api/partner/tables \
  -H "Authorization: Bearer [owner_token]" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bàn VIP","type":"vip","capacity":{"min":4,"max":8},"pricing":{"baseDeposit":500000}}'

# Response: 201 Created
# Bàn mới được tạo thành công
```

---

## 📊 BẢNG SO SÁNH

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

## ⚠️ LƯU Ý

1. **Middleware được kiểm tra trước controller**
   - Nếu không có quyền → 403 Forbidden
   - Không bao giờ đến controller

2. **Manager không thể xóa nhân viên**
   - Chỉ có owner mới xóa được
   - Manager chỉ có thể tạo, xem, sửa

3. **Staff không thể quản lí nhân viên**
   - Không thể xem danh sách nhân viên
   - Không thể thêm, sửa, xóa nhân viên

4. **Tất cả route đều yêu cầu xác thực**
   - protectPartner middleware kiểm tra token
   - Sau đó mới kiểm tra quyền

---

## 📞 LIÊN HỆ

Nếu có vấn đề, kiểm tra:
1. Token có hợp lệ không?
2. Role của user là gì?
3. Middleware có được import đúng không?
4. Route có được cấu hình đúng không?
