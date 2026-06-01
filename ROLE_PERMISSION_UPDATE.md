# 📝 CẬP NHẬT - MANAGER CÓ THỂ THÊM, SỬA, XÓA BÀN

## 🔄 THAY ĐỔI

**Ngày cập nhật**: 2026-05-30 16:50:19 UTC

### Trước (Cũ)
```javascript
manager: {
  tables: ['read'],           // Chỉ xem
  staff: ['create', 'read', 'update'],
  ...
}
```

### Sau (Mới)
```javascript
manager: {
  tables: ['create', 'read', 'update', 'delete'],  // Toàn quyền
  staff: ['create', 'read', 'update'],
  ...
}
```

---

## 🔐 QUYỀN MỚI

### 👔 MANAGER (Quản lí) - CẬP NHẬT
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
  ✗ Xóa (DELETE)

Nhà hàng:
  ✓ Xem (GET)

Đơn hàng:
  ✓ Xem (GET)

Dashboard:
  ✓ Xem (GET)
```

---

## 📊 BẢNG SO SÁNH

| Hành động | Owner | Manager | Staff |
|-----------|-------|---------|-------|
| Xem bàn | ✓ | ✓ | ✓ |
| Thêm bàn | ✓ | ✓ | ✗ |
| Sửa bàn | ✓ | ✓ | ✗ |
| Xóa bàn | ✓ | ✓ | ✗ |
| Xem nhân viên | ✓ | ✓ | ✗ |
| Thêm nhân viên | ✓ | ✓ | ✗ |
| Sửa nhân viên | ✓ | ✓ | ✗ |
| Xóa nhân viên | ✓ | ✗ | ✗ |

---

## ✅ FILE ĐÃ CẬP NHẬT

**File**: BE/middleware/rolePermission.js
- Manager tables: ['read'] → ['create', 'read', 'update', 'delete']

---

## 🧪 TEST

### Test: Manager có thể thêm bàn
```bash
curl -X POST http://localhost:5000/api/partner/tables \
  -H "Authorization: Bearer [manager_token]" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bàn 1",
    "type": "regular",
    "capacity": { "min": 2, "max": 4 },
    "pricing": { "baseDeposit": 100000 }
  }'

# Response: 201 Created ✓
```

### Test: Manager có thể sửa bàn
```bash
curl -X PUT http://localhost:5000/api/partner/tables/:tableId \
  -H "Authorization: Bearer [manager_token]" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bàn VIP",
    "type": "vip"
  }'

# Response: 200 OK ✓
```

### Test: Manager có thể xóa bàn
```bash
curl -X DELETE http://localhost:5000/api/partner/tables/:tableId \
  -H "Authorization: Bearer [manager_token]"

# Response: 200 OK ✓
```

---

## 📌 LƯU Ý

1. Manager vẫn **không thể xóa nhân viên**
2. Manager vẫn **không thể sửa nhà hàng**
3. Nhân viên (staff) vẫn **không được thêm, sửa, xóa bàn**
4. Owner vẫn có **toàn quyền**

---

**Trạng thái**: ✅ CẬP NHẬT THÀNH CÔNG
