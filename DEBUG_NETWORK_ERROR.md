# 🔧 DEBUG: Network Error - Hướng Dẫn Khắc Phục

## 📋 Vấn Đề
```
ERROR [DEBUG] Booking error: [AxiosError: Network Error]
ERROR [DEBUG] Error details: undefined
```

## ✅ Kiểm Tra Danh Sách

### 1. Backend Chạy Chưa?
```bash
# Kiểm tra port 5000
netstat -ano | findstr :5000

# Nếu chưa chạy:
cd BE
npm start
```

### 2. MongoDB Kết Nối Chưa?
```bash
# Kiểm tra .env
cat BE/.env | grep MONGODB_URI

# Nếu không có, thêm vào BE/.env:
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
```

### 3. API URL Đúng Chưa?
**File:** `Amble/services/api.ts`
```typescript
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:5000/api"  // ← Đúng cho Android emulator
    : "http://localhost:5000/api");
```

### 4. Test API Trực Tiếp
```bash
# Từ terminal, test endpoint:
curl http://localhost:5000/api/booking/tables/restaurantId

# Hoặc dùng Postman:
GET http://localhost:5000/api/booking/tables/restaurantId
```

### 5. Xóa Cache & Restart
```bash
# Xóa cache Expo
npm start -- --clear

# Hoặc restart hoàn toàn:
Ctrl+C
npm start
```

## 🎯 Nếu Vẫn Lỗi

### Kiểm Tra Backend Logs
```bash
# Xem logs backend
# Tìm dòng có "error" hoặc "Error"
```

### Kiểm Tra CORS
**File:** `BE/app.js`
```javascript
app.use(cors());  // ← Phải có dòng này
```

### Kiểm Tra Routes
```bash
# Xem tất cả routes
node BE/scripts/inspect-routes.js
```

## 📝 Ghi Chú

- Android emulator dùng `10.0.2.2` để trỏ đến localhost
- iOS simulator dùng `localhost` trực tiếp
- Nếu dùng device thực, phải dùng IP của máy (ví dụ: `192.168.1.110:5000`)

