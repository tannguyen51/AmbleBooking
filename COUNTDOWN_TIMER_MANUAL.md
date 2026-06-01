# 📝 HƯỚNG DẪN: Thêm Countdown Timer Thủ Công

File `payment.tsx` có lỗi cấu trúc. Hãy thêm countdown timer thủ công theo các bước sau:

## Bước 1: Thêm State

Tìm dòng:
```javascript
const [checking, setChecking] = useState<boolean>(false);
```

Thêm dòng này ngay sau:
```javascript
const [timeRemaining, setTimeRemaining] = useState<number>(0);
```

## Bước 2: Thêm useEffect Countdown

Tìm dòng:
```javascript
useEffect(() => {
  loadQr();
}, [bookingId]);
```

Thêm useEffect này ngay sau:
```javascript
useEffect(() => {
  if (!bookingId) return;
  const fetchTime = async () => {
    try {
      const res = await bookingAPI.getById(bookingId);
      if (res.data?.booking?.paymentTimeRemainingSeconds !== undefined) {
        setTimeRemaining(res.data.booking.paymentTimeRemainingSeconds);
      }
    } catch (e) {}
  };
  fetchTime();
  const timer = setInterval(() => setTimeRemaining(p => Math.max(0, p - 1)), 1000);
  return () => clearInterval(timer);
}, [bookingId]);
```

## Bước 3: Thêm Hàm Format

Thêm hàm này trước `return (`:
```javascript
const formatTimeRemaining = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};
```

## Bước 4: Thêm UI Timer

Tìm dòng:
```javascript
<View style={s.section}>
  <Text style={s.sectionTitle}>Thông tin chuyển khoản</Text>
  <View style={s.card}>
```

Thay thành:
```javascript
<View style={s.section}>
  <View style={s.timerContainer}>
    <Text style={s.sectionTitle}>Thông tin chuyển khoản</Text>
    {timeRemaining > 0 && (
      <View style={s.timerBadge}>
        <Ionicons name="hourglass-outline" size={14} color="#fff" />
        <Text style={s.timerText}>{formatTimeRemaining(timeRemaining)}</Text>
      </View>
    )}
  </View>
  <View style={s.card}>
```

## Bước 5: Thêm Styles

Tìm cuối của `StyleSheet.create({` (trước `});`)

Thêm styles này:
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

## ✅ Hoàn Thành

Sau khi thêm xong, file sẽ có countdown timer hiển thị ở trang thanh toán!

