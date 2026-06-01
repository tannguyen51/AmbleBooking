# 🚀 HƯỚNG DẪN TEST WEBHOOK BẰNG POWERSHELL

## Bước 1: Lấy thông tin booking

Chạy script này để lấy Expected Content và Amount:

```powershell
node BE/scripts/check-booking-status.js
```

Ghi lại:
- Expected Content: VD: AMBLE-67815
- Amount: VD: 500000

## Bước 2: Khởi động ngrok

Mở PowerShell mới, chạy:

```powershell
ngrok http 5000
```

Ghi lại URL ngrok, VD: https://abc123-def456.ngrok.io

## Bước 3: Tạo file test-webhook.ps1

File đã được tạo sẵn. Hãy chỉnh sửa:

```powershell
$ngrokUrl = "https://abc123-def456.ngrok.io"  # ← Thay URL ngrok
$bookingContent = "AMBLE-67815"                # ← Thay Expected Content
$amount = 500000                               # ← Thay Amount
```

## Bước 4: Chạy script

```powershell
.\test-webhook.ps1
```

## Bước 5: Kiểm tra kết quả

Nếu thành công, sẽ hiển thị:
```
✅ Success! Status: 200
Response:
{
  "success": true,
  "bookingId": "..."
}
```

## Bước 6: Vào app kiểm tra

- Pull-to-refresh
- Click tab "Đang đặt"
- Bạn sẽ thấy booking với status "Chờ xác nhận" ✅

---

## ⚠️ Lỗi Thường Gặp

### 1. "Cannot bind parameter 'Date'"
→ Dùng PowerShell, không phải bash

### 2. "Connection refused"
→ Backend chưa chạy hoặc port sai

### 3. "404 Not Found"
→ URL ngrok sai hoặc endpoint sai

### 4. "400 Bad Request"
→ Expected Content hoặc Amount sai

---

## 💡 Mẹo

Nếu muốn test nhanh, dùng lệnh này:

```powershell
$payload = @{
    content = "AMBLE-67815"
    amount = 500000
    transactionId = "TEST-$(Get-Date -UFormat %s)"
    bankCode = "970422"
    accountNumber = "0123456789"
} | ConvertTo-Json

Invoke-WebRequest `
    -Uri "https://YOUR_NGROK_URL/api/booking/payment/vietqr-webhook" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $payload
```

Thay YOUR_NGROK_URL bằng URL ngrok của bạn.

