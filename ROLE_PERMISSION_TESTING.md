# ROLE PERMISSION TESTING GUIDE

## Cách kiểm tra hệ thống quyền:

### 1. Test Nhân viên (Staff) - Không được thêm/sửa/xóa bàn

**Request: POST /api/partner/tables**
```
Headers:
  Authorization: Bearer [staff_token]

Body:
{
  "name": "Bàn 1",
  "type": "regular",
  "capacity": { "min": 2, "max": 4 },
  "pricing": { "baseDeposit": 100000 }
}

Expected Response (403):
{
  "success": false,
  "message": "Vai trò staff không có quyền create tables."
}
```

**Request: PUT /api/partner/tables/:tableId**
```
Expected Response (403):
{
  "success": false,
  "message": "Vai trò staff không có quyền update tables."
}
```

**Request: DELETE /api/partner/tables/:tableId**
```
Expected Response (403):
{
  "success": false,
  "message": "Vai trò staff không có quyền delete tables."
}
```

### 2. Test Quản lí (Manager) - Có thể quản lí nhân viên

**Request: GET /api/partner/staff**
```
Headers:
  Authorization: Bearer [manager_token]

Expected Response (200):
{
  "success": true,
  "staff": [...]
}
```

**Request: POST /api/partner/staff**
```
Headers:
  Authorization: Bearer [manager_token]

Body:
{
  "fullName": "Nguyễn Văn A",
  "email": "a@example.com",
  "phone": "0123456789",
  "role": "staff"
}

Expected Response (201):
{
  "success": true,
  "staff": {...}
}
```

**Request: PUT /api/partner/staff/:staffId**
```
Headers:
  Authorization: Bearer [manager_token]

Body:
{
  "fullName": "Nguyễn Văn B",
  "role": "manager"
}

Expected Response (200):
{
  "success": true,
  "staff": {...}
}
```

### 3. Test Quản lí (Manager) - Không được thêm/sửa/xóa bàn

**Request: POST /api/partner/tables**
```
Headers:
  Authorization: Bearer [manager_token]

Expected Response (403):
{
  "success": false,
  "message": "Vai trò manager không có quyền create tables."
}
```

### 4. Test Chủ (Owner) - Toàn quyền

**Request: POST /api/partner/tables**
```
Headers:
  Authorization: Bearer [owner_token]

Expected Response (201):
{
  "success": true,
  "table": {...}
}
```

**Request: POST /api/partner/staff**
```
Headers:
  Authorization: Bearer [owner_token]

Expected Response (201):
{
  "success": true,
  "staff": {...}
}
```

## Cách tạo test token:

1. Đăng nhập với tài khoản owner
2. Lấy token từ response
3. Tạo nhân viên với role "staff"
4. Đăng nhập với tài khoản nhân viên
5. Lấy token của nhân viên
6. Tạo nhân viên với role "manager"
7. Đăng nhập với tài khoản quản lí
8. Lấy token của quản lí

## Kiểm tra trong code:

File: BE/middleware/rolePermission.js
- ROLE_PERMISSIONS: Định nghĩa quyền cho mỗi role
- checkPermission(): Middleware kiểm tra quyền
- checkStaffManagementPermission(): Middleware kiểm tra quyền quản lí nhân viên

File: BE/routes/partner.js
- Tất cả route đã được thêm middleware kiểm soát quyền

File: BE/controllers/partnerStaffController.js
- ensureOwnerOrManagerRole(): Kiểm tra owner hoặc manager
