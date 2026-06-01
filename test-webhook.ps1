# Test Webhook Script for PowerShell

# Cấu hình
$ngrokUrl = "https://YOUR_NGROK_URL"  # Thay bằng URL ngrok của bạn
$bookingContent = "AMBLE-67815"        # Thay bằng Expected Content từ booking
$amount = 500000                       # Thay bằng Amount từ booking
$transactionId = "TEST-$(Get-Date -UFormat %s)"

# Payload
$payload = @{
    content = $bookingContent
    amount = $amount
    transactionId = $transactionId
    bankCode = "970422"
    accountNumber = "0123456789"
} | ConvertTo-Json

Write-Host "🚀 Testing Webhook..." -ForegroundColor Green
Write-Host "URL: $ngrokUrl/api/booking/payment/vietqr-webhook" -ForegroundColor Cyan
Write-Host "Payload:" -ForegroundColor Cyan
Write-Host $payload -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest `
        -Uri "$ngrokUrl/api/booking/payment/vietqr-webhook" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $payload

    Write-Host "✅ Success! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    Write-Host ($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10) -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}
