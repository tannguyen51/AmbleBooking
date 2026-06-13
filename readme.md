# 🍽️ MunchMap — Nền tảng đặt bàn nhà hàng

> Đặt bàn nhà hàng thông minh, nhanh chóng, có AI hỗ trợ.

<p align="center">
  <img src="https://img.shields.io/badge/Expo-SDK%2051-blue?logo=expo" alt="Expo SDK 51" />
  <img src="https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js" alt="Node 18+" />
  <img src="https://img.shields.io/badge/MongoDB-7%2B-brightgreen?logo=mongodb" alt="MongoDB 7+" />
  <img src="https://img.shields.io/badge/AI-DeepSeek%20V4-purple?logo=openai" alt="DeepSeek V4" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License MIT" />
</p>

---

## ✨ Tính năng

### Cho khách hàng
- 🔍 **Tìm kiếm nhà hàng** theo khu vực, ẩm thực, giá cả
- 📍 **GPS nhà hàng gần đây** — tự động hiển thị khoảng cách
- 🤖 **AI Chatbot đặt bàn** — trò chuyện tự nhiên, AI tự động gợi ý bàn phù hợp
- 💳 **Thanh toán online** qua PayOS (VNPay)
- 🔔 **Thông báo** nhắc lịch đặt bàn sắp tới
- ❤️ **Yêu thích** nhà hàng, xem lịch sử đặt bàn
- 🌐 **Đa ngôn ngữ**: Tiếng Việt, English, 中文, 한국어, 日本語

### Cho đối tác (chủ nhà hàng)
- 📊 **Dashboard quản lý** — doanh thu, booking, trạng thái bàn
- 🪑 **Quản lý bàn** — thêm/sửa/xóa bàn, up ảnh, set giá cọc
- 📋 **Quản lý đặt bàn** — xác nhận, từ chối, check-in
- 📈 **Phân tích** — thống kê booking, doanh thu, giờ cao điểm
- 💎 **Gói Premium** — ưu tiên hiển thị, tăng độ phủ

### Cho Admin
- 🧠 **AI Phân tích** — chat với AI về doanh thu, xu hướng, top nhà hàng
- 👥 **Quản lý đối tác** — duyệt/từ chối, khóa/mở khóa
- 🏪 **Quản lý nhà hàng** — featured, active, gói dịch vụ
- 📊 **Analytics** — funnel, tỉ lệ hủy, chuyển đổi

---

## 🏗️ Cấu trúc dự án

```
AmbleBooking1/
├── BE/                          # Backend Express.js + MongoDB
│   ├── controllers/             # auth, admin, partner, restaurant, booking, payment
│   ├── models/                  # User, Partner, Restaurant, Table, Booking, Review
│   ├── routes/                  # auth, partner, admin, restaurants, booking, ai, payment, upload
│   ├── middleware/               # auth (JWT customer), partnerAuth, adminAuth, rolePermission
│   ├── services/                # dailyAnalytics, bookingCleanup, subscriptionExpiry
│   ├── utils/                   # mailer (Brevo API)
│   ├── config/                  # payos (PayOS SDK)
│   ├── uploads/                 # Ảnh upload (restaurants/, tables/)
│   ├── app.js                   # Entry point
│   ├── seed.js                  # Dữ liệu mẫu (10 nhà hàng, bàn, users)
│   └── .env.example
│
└── Amble/                       # Frontend Expo React Native
    ├── app/
    │   ├── _layout.tsx          # Root layout + auth guard + routing
    │   ├── (auth)/              # Login, Register, Forgot/Reset password
    │   ├── (tabs)/              # Home, Explore, Chat, History, Profile, Rewards
    │   ├── (partner)/           # Dashboard, Tables, Orders, Analytics, Profile
    │   ├── (partner-auth)/      # Partner login, register, forgot/reset, payment
    │   ├── admin/               # Dashboard, Partners, Restaurants, Bookings, Analytics
    │   ├── restaurant/[id].tsx  # Chi tiết nhà hàng + đặt bàn
    │   ├── booking/             # Select table, Confirm, Payment, Success
    │   └── welcome.tsx          # Chọn vai trò (Khách / Đối tác / Admin)
    ├── components/              # admin/, partner/ (shared UI components)
    ├── services/                # api.ts, ambleAI.ts, restaurantApi.ts
    ├── store/                   # authStore, partnerAuthStore, favoritesStore, languageStore
    ├── hooks/                   # useLocation (GPS hook)
    ├── i18n/                    # translations.ts (5 ngôn ngữ)
    ├── constants/               # adminTheme.ts, theme.ts, partnerPermissions.ts
    ├── types/                   # chat.ts, restaurant.ts, booking.ts
    ├── app.json                 # Expo config (scheme: munchmap, package: com.amble.app)
    └── eas.json                 # EAS Build profiles (staging APK, production AAB)
```
---

## 🔌 API Chính

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| **Auth** |||
| POST | `/api/auth/register` | Đăng ký khách hàng |
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/auth/google` | Google OAuth |
| POST | `/api/auth/forgot-password` | Quên mật khẩu |
| **Restaurant** |||
| GET | `/api/restaurants` | Danh sách nhà hàng |
| GET | `/api/restaurants/featured` | Nhà hàng nổi bật |
| GET | `/api/restaurants/nearby?lat=&lng=` | Nhà hàng gần đây (GPS) |
| GET | `/api/restaurants/:id` | Chi tiết nhà hàng |
| **Booking** |||
| GET | `/api/booking/tables/:restaurantId` | Danh sách bàn |
| POST | `/api/booking` | Tạo booking mới |
| **Payment** |||
| POST | `/api/payment/partner/create-payos` | Tạo thanh toán PayOS |
| POST | `/api/payment/partner/webhook` | Webhook PayOS |
| **AI** |||
| POST | `/api/ai/chat` | Chat AI khách hàng |
| POST | `/api/ai/admin-chat` | Chat AI admin (phân tích dữ liệu) |
| **Upload** |||
| POST | `/api/upload/image` | Upload ảnh (base64 → server) |
| **Partner** |||
| POST | `/api/partner/auth/register` | Đăng ký đối tác |
| GET | `/api/partner/dashboard/overview` | Dashboard đối tác |
| POST | `/api/partner/tables` | Tạo bàn mới |
| **Admin** |||
| GET | `/api/admin/dashboard` | Dashboard admin |
| GET | `/api/admin/partners` | Danh sách đối tác |
| PUT | `/api/admin/partners/:id/approve` | Duyệt đối tác |

---

## 🤖 AI Chatbot

MunchMap tích hợp **DeepSeek V4 Pro** qua AI-Box proxy cho cả khách hàng và admin.

| Tính năng | Khách hàng | Admin |
|-----------|-----------|-------|
| Mô hình | DeepSeek V4 Pro | DeepSeek V4 Pro |
| Chức năng | Đặt bàn tự nhiên, gợi ý nhà hàng | Phân tích doanh thu, booking, xu hướng |
| Context | Lịch sử đặt bàn + GPS | Dữ liệu thời gian thực từ DB |
| Ngôn ngữ | Tự động theo user (VI/EN) | Tiếng Việt |

---

## 🛠️ Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Frontend** | Expo SDK 51, React Native, Expo Router, Zustand, Axios |
| **Backend** | Node.js, Express.js, MongoDB/Mongoose, JWT |
| **AI** | DeepSeek V4 Pro (qua AI-Box), OpenRouter fallback |
| **Thanh toán** | PayOS |
| **Email** | Brevo API |
| **Auth** | JWT + Google OAuth |
| **Build** | EAS Build (Expo Application Services) |
| **Deploy** | Railway (backend), Google Play Store (Android) |



## 📝 License

MIT © 2026 MunchMap
