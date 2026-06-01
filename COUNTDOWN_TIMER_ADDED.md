# ✅ HOÀN THÀNH: Thêm Countdown Timer Cho Đơn Chờ Thanh Toán

## 📋 Tóm Tắt

Đã thêm bộ đếm thời gian (countdown timer) cho đơn chờ thanh toán. Khách sẽ thấy còn bao lâu để thanh toán trước khi bị hủy tự động.

## 🔧 Các File Được Cập Nhật

### 1. Backend: BE/controllers/bookingController.js

#### Thêm hàm `computePaymentTimeRemaining()`
```javascript
const computePaymentTimeRemaining = (booking) => {
  if (booking.status !== "pending_payment") {
    return { timeRemaining: 0, timeRemainingSeconds: 0 };
  }

  const createdAt = new Date(booking.createdAt);
  const now = new Date();
  const PAYMENT_TIMEOUT_MS = 10 * 60 * 1000; // 10 phút
  const elapsedMs = now.getTime() - createdAt.getTime();
  const timeRemainingMs = Math.max(0, PAYMENT_TIMEOUT_MS - elapsedMs);
  const timeRemainingSeconds = Math.floor(timeRemainingMs / 1000);
  const timeRemaining = Math.floor(timeRemainingMs / 1000 / 60); // phút

  return { timeRemaining, timeRemainingSeconds };
};
```

#### Cập nhật `getBookingById()`
- Thêm `paymentTimeRemaining` (phút)
- Thêm `paymentTimeRemainingSeconds` (giây)

#### Cập nhật `getUserBookings()`
- Thêm `paymentTimeRemaining` cho tất cả booking
- Thêm `paymentTimeRemainingSeconds` cho tất cả booking

### 2. Frontend: Amble/app/booking/payment.tsx

#### Thêm State
```javascript
const [timeRemaining, setTimeRemaining] = useState<number>(0);
```

#### Thêm useEffect Countdown
```javascript
useEffect(() => {
  if (!bookingId) return;
  
  const fetchTimeRemaining = async () => {
    try {
      const res = await bookingAPI.getById(bookingId);
      const booking = res.data?.booking;
      if (booking?.paymentTimeRemainingSeconds !== undefined) {
        setTimeRemaining(booking.paymentTimeRemainingSeconds);
      }
    } catch (error) {
      console.error("Error fetching time remaining:", error);
    }
  };

  fetchTimeRemaining();

  const countdownTimer = setInterval(() => {
    setTimeRemaining((prev) => Math.max(0, prev - 1));
  }, 1000);

  return () => clearInterval(countdownTimer);
}, [bookingId]);
```

#### Thêm Hàm Format Thời Gian
```javascript
const formatTimeRemaining = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};
```

#### Thêm UI Countdown Timer
```javascript
<View style={s.timerContainer}>
  <Text style={s.sectionTitle}>Thông tin chuyển khoản</Text>
  {timeRemaining > 0 && (
    <View style={s.timerBadge}>
      <Ionicons name="hourglass-outline" size={14} color="#fff" />
      <Text style={s.timerText}>{formatTimeRemaining(timeRemaining)}</Text>
    </View>
  )}
</View>
```

#### Thêm Styles
```javascript
timerContainer: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
},
timerBadge: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#FF6B35",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 20,
  gap: 6,
},
timerText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 12,
},
```

## 📊 Cách Hoạt Động

```
1️⃣ Khách vào trang thanh toán
   └─ Fetch booking từ API
   └─ Lấy paymentTimeRemainingSeconds

2️⃣ Hiển thị countdown timer
   └─ Format: MM:SS (phút:giây)
   └─ Cập nhật mỗi 1 giây

3️⃣ Khi hết thời gian
   └─ Timer = 0:00
   └─ Booking tự động bị hủy (backend job)

4️⃣ Khách thanh toán
   └─ Webhook cập nhật status → pending
   └─ Timer biến mất
```

## 🎨 UI Hiển Thị

**Trang Thanh Toán:**
```
┌─────────────────────────────────┐
│ Thông tin chuyển khoản    9:45  │ ← Timer hiển thị ở đây
├─────────────────────────────────┤
│ Ngân hàng: TCB                  │
│ Số tài khoản: 0123456789        │
│ Chủ tài khoản: AMBLE            │
│ Số tiền: 500,000đ               │
└─────────────────────────────────┘
```

## ⏱️ Timeout

- **Timeout:** 10 phút
- **Cập nhật:** Mỗi 1 giây
- **Format:** MM:SS (phút:giây)

## 📝 Ghi Chú

✅ Backend tính thời gian còn lại  
✅ Frontend hiển thị countdown  
✅ Cập nhật real-time mỗi giây  
✅ Tự động hủy khi hết thời gian  
✅ Khách biết còn bao lâu để thanh toán  

