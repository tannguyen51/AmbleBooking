# Thiết kế Admin Dashboard - Hệ thống Đặt bàn Nhà hàng

## Mục lục
1. [System Overview](#1-system-overview)
2. [Luồng nghiệp vụ cốt lõi](#2-luồng-nghiệp-vụ-cốt-lõi)
3. [Database Schema](#3-database-schema)
4. [API Endpoints](#4-api-endpoints)
5. [Phân quyền chi tiết (RBAC)](#5-phân-quyền-chi-tiết-rbac)
6. [UI/UX Design](#6-uiux-design)
7. [Analytics & Metrics](#7-analytics--metrics)
8. [Migration Plan](#8-migration-plan)

---

## 1. System Overview

### 1.1 Kiến trúc Multi-tenant

```
Super Admin (xuyên suốt tất cả nhà hàng)
│
├── Nhà hàng A
│   ├── Owner A-1
│   ├── Manager A-1, A-2
│   └── Staff A-1, A-2, A-3
│
├── Nhà hàng B
│   ├── Owner B-1
│   ├── Manager B-1
│   └── Staff B-1, B-2
│
└── Nhà hàng C ...
```

Mỗi nhà hàng là một **workspace riêng biệt**. Dữ liệu hoàn toàn cách biệt giữa các nhà hàng (isolation by `restaurantId`). Nhân viên/chủ chỉ thao tác trong phạm vi nhà hàng của họ.

### 1.2 Nguyên lý thiết kế cốt lõi

1. **Không có thời lượng mặc định (No default duration)**: Bỏ hoàn toàn `duration`, `bufferTime`, `expectedEndTime`, `gracePeriodEndTime` khỏi booking logic. Bàn ngồi bao lâu là tùy khách, không bị ràng buộc bởi hệ thống.
2. **Không tự động chuyển trạng thái**: Bàn chỉ chuyển về `Available` khi có tác động thủ công từ Staff/Manager/Owner. Tắt hoàn toàn bookingAutoCompleteService và tableCleanupService.
3. **Manual release là bắt buộc**: Quy trình bắt buộc: Check-in → (khách dùng bữa) → Hoàn tất thủ công → Bàn về Available.
4. **Multi-tenant first**: Mọi API đều gắn với `restaurantId`, dữ liệu được cô lập hoàn toàn.

### 1.3 Luồng trạng thái booking (NEW - simplified)

```
                    ┌─────────────────────────────────────────────┐
                    │             KHÁCH HÀNG ĐẶT BÀN              │
                    │           (qua app / website)               │
                    └──────────────────┬──────────────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────────────┐
                    │               pending                       │
                    │     (chờ nhà hàng xác nhận)                 │
                    │     Bàn KHÔNG bị lock                       │
                    └──────────────────┬──────────────────────────┘
                                       │
                     ┌─────────────────┼──────────────────┐
                     │                 │                   │
                     ▼                 ▼                   ▼
              ┌────────────┐   ┌──────────────┐   ┌──────────────┐
              │  cancel    │   │  confirm     │   │   decline    │
              │  (khách)   │   │  (staff)     │   │   (staff)    │
              └──────┬─────┘   └──────┬───────┘   └──────┬───────┘
                     │                │                   │
                     ▼                ▼                   ▼
              ┌────────────┐   ┌──────────────┐   ┌──────────────┐
              │ cancelled  │   │  confirmed   │   │  declined    │
              │            │   │  Bàn: RESERVED│   │              │
              └────────────┘   └──────┬───────┘   └──────────────┘
                                     │
                         ┌───────────┼───────────┐
                         │           │           │
                         ▼           ▼           ▼
                  ┌──────────┐ ┌─────────┐ ┌──────────┐
                  │ Check-in │ │ Hủy     │ │ No-show  │
                  │ (staff)  │ │ (staff) │ │ (staff)  │
                  └────┬─────┘ └────┬────┘ └────┬─────┘
                       │            │           │
                       ▼            ▼           ▼
                ┌──────────┐  ┌──────────┐ ┌──────────┐
                │ occupied │  │ cancelled│ │ no_show  │
                │ Bàn: OCC.│  │          │ │          │
                └────┬─────┘  └──────────┘ └──────────┘
                     │
           ┌─────────┼─────────┐
           │         │         │
           ▼         ▼         ▼
    ┌──────────┐ ┌────────┐ ┌──────────┐
    │ Hoàn tất │ │ Release│ │ Chuyển   │
    │ (staff)  │ │ (staff)│ │ bàn      │
    └────┬─────┘ └───┬────┘ └────┬─────┘
         │           │           │
         ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ completed│ │ released │ │ occupied │
    │ Bàn: AV. │ │ Bàn: AV. │ │(bàn mới) │
    └──────────┘ └──────────┘ └──────────┘
```

**Ý nghĩa các trạng thái booking** (đơn giản hóa):

| Trạng thái | Mô tả | Bàn |
|---|---|---|
| `pending` | Khách vừa đặt, chờ xác nhận | Không bị lock |
| `confirmed` | Staff xác nhận, giữ chỗ | `reserved` |
| `occupied` | Khách đã check-in, đang dùng bữa | `occupied` |
| `completed` | Khách đã về, staff bấm "Hoàn tất" | `available` |
| `cancelled` | Hủy (khách/staff) | `available` |
| `declined` | Nhà hàng từ chối | `available` |
| `no_show` | Khách không đến | `available` |
| `released` | Giải phóng bàn thủ công | `available` |

### 1.4 Trạng thái bàn (Table status)

| Trạng thái | Màu | Ý nghĩa |
|---|---|---|
| `available` | 🟢 Xanh lá | Bàn trống, sẵn sàng đón khách |
| `reserved` | 🟡 Vàng | Đã có booking confirmed, chờ khách đến |
| `occupied` | 🔴 Đỏ | Khách đang dùng |
| `cleaning` | 🔵 Xanh dương | Đang dọn dẹp sau khách |
| `maintenance` | ⚫ Xám | Bàn đang bảo trì (không nhận booking) |

**Luồng chuyển đổi trạng thái bàn (BẮT BUỘC)**:

```
available ──(confirm booking)──► reserved ──(check-in)──► occupied
                                                              │
                                              ┌───────────────┼───────────────┐
                                              ▼               ▼               ▼
                                         completed       released        cleaning
                                         (hoàn tất)     (giải phóng)    (dọn dẹp)
                                              │               │               │
                                              ▼               ▼               ▼
                                          available       available       available
```

**Không có đường tắt nào tự động.** Mọi chuyển đổi đều do thao tác thủ công.

---

## 2. Luồng nghiệp vụ cốt lõi

### 2.1 Đặt bàn (Booking Flow)

```
Bước 1: Khách chọn nhà hàng, ngày giờ, số người, bàn
Bước 2: Khách đặt cọc (nếu có) - PayOS / Bank Transfer
Bước 3: Booking tạo với status = "pending"
Bước 4: Staff thấy booking pending trong dashboard
Bước 5: Staff bấm "Xác nhận" → status = "confirmed", bàn → RESERVED
        hoặc Staff bấm "Từ chối" → status = "declined"
```

### 2.2 Check-in (Khách đến)

```
Bước 1: Khách đến nhà hàng, báo tên/SĐT/bookingNumber
Bước 2: Staff tìm booking trong dashboard
Bước 3: Staff bấm "Check-in"
Bước 4: Booking → "occupied", Bàn → OCCUPIED
Bước 5: Staff dẫn khách vào bàn
```

### 2.3 Hoàn tất (Complete - extremely important)

> **Đây là điểm mấu chốt của toàn bộ thiết kế.**

```
Bước 1: Khách thanh toán và rời đi
Bước 2: Staff xác nhận bàn đã trống
Bước 3: Staff bấm "Hoàn tất" trên booking
         → Booking status = "completed"
         → Bàn → AVAILABLE
```

**Hoặc nếu không có booking (khách walk-in):**
- Staff chọn bàn trên sơ đồ
- Bấm "Bàn trống" (Set available)
- Bàn → AVAILABLE ngay lập tức

### 2.4 Hủy / No-show / Release

- **Hủy (khách)**: Khách hủy qua app → cancelled
- **Hủy (staff)**: Staff hủy booking → cancelled
- **No-show**: Quá giờ ân hạn (cấu hình mỗi nhà hàng) → no_show
- **Release**: Bất kỳ lý do nào khác → released

### 2.5 Walk-in (Khách không booking trước)

```
Bước 1: Staff chọn bàn trống trên sơ đồ
Bước 2: Chọn "Walk-in"
Bước 3: Nhập tên, SĐT, số người (tối thiểu)
Bước 4: Hệ thống tạo booking nhanh với status = "occupied"
Bước 5: Bàn → OCCUPIED
```

---

## 3. Database Schema

### 3.1 Schema hiện tại cần sửa đổi

#### 3.1.1 Table Model (`models/table.js`) - SỬA ĐỔI

```javascript
const tableSchema = new mongoose.Schema({
  restaurantId: { type: ObjectId, ref: 'Restaurant', required: true },

  // Thông tin cơ bản
  name:      { type: String, required: true },          // Tên bàn: "Bàn 1", "Bàn VIP 1"
  type:      { type: String, enum: ['vip','view','regular','standard'], default: 'regular' },
  capacity: {
    min: { type: Number, required: true },               // Tối thiểu: 1
    max: { type: Number, required: true },               // Tối đa: 10
  },
  area:      { type: String, default: '' },              // Khu vực: "Trong nhà", "Ngoài trời", "Sảnh VIP"
  floor:     { type: Number, default: 1 },               // Tầng
  position: {
    x: { type: Number, default: 0 },                     // Tọa độ X trên sơ đồ (%)
    y: { type: Number, default: 0 },                     // Tọa độ Y trên sơ đồ (%)
    w: { type: Number, default: 1 },                     // Chiều rộng trên sơ đồ (ô)
    h: { type: Number, default: 1 },                     // Chiều cao trên sơ đồ (ô)
  },
  shape:     { type: String, enum: ['circle','rectangle','rounded'], default: 'circle' },
  isRound:   { type: Boolean, default: true },

  // Giá / cọc
  pricing: {
    baseDeposit: { type: Number, default: 0 },           // Tiền cọc mặc định
  },

  // Hình ảnh & mô tả
  images:      [{ type: String }],
  features:    [{ type: String }],                       // "Gần cửa sổ", "Yên tĩnh", "Có ổ điện"
  description: { type: String, default: '' },

  // Trạng thái
  isActive: { type: Boolean, default: true },             // Bàn có đang hoạt động không
  status: {
    type: String,
    enum: ['available', 'reserved', 'occupied', 'cleaning', 'maintenance'],
    default: 'available',
  },
  currentBookingId: { type: ObjectId, ref: 'Booking', default: null },
}, { timestamps: true });
```

> **Thay đổi so với hiện tại:**
> - Xóa `isAvailable` (dùng `status === 'available'` để判断)
> - Thêm `area`, `floor`, `position`, `shape`, `isRound` (cho floorplan)
> - Thêm `maintenance` vào enum status
> - Xóa `released` khỏi enum (chỉ dùng ở booking)

#### 3.1.2 Booking Model (`models/booking.js`) - SỬA ĐỔI LỚN

```javascript
const bookingSchema = new mongoose.Schema({
  bookingNumber: { type: String, unique: true },
  restaurantId:  { type: ObjectId, ref: 'Restaurant', required: true },
  tableId:       { type: ObjectId, ref: 'Table' },
  userId:        { type: ObjectId, ref: 'User' },       // Khách hàng (nếu đặt qua app)

  // Thông tin khách hàng (cho walk-in và lưu trữ)
  customerInfo: {
    name:  { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    note:  { type: String, default: '' },
  },

  // Thông tin đặt bàn (TINH GỌN - không có duration/buffer)
  bookingDetails: {
    date:      { type: String, required: true },         // YYYY-MM-DD
    time:      { type: String, required: true },         // HH:mm
    partySize: { type: Number, required: true },         // Số người
    purpose:   { type: String, default: 'casual' },
  },

  // Nguồn đặt
  source: {
    type: String,
    enum: ['app', 'walkin', 'phone', 'facebook', 'google', 'zalo', 'other'],
    default: 'app',
  },

  // Giá
  pricing: {
    depositAmount:  { type: Number, default: 0 },
    voucherDiscount:{ type: Number, default: 0 },
    totalAmount:    { type: Number, default: 0 },
    appliedVoucher: {
      code:          String,
      discountValue: Number,
    },
  },

  // Lịch sử trạng thái (quan trọng cho audit)
  statusHistory: [{
    status:     String,
    changedBy:  { type: ObjectId, refPath: 'statusHistory.changedByModel' },
    changedByModel: { type: String, enum: ['User', 'Partner'] },
    changedAt:  { type: Date, default: Date.now },
    note:       String,
  }],

  // Trạng thái hiện tại
  status: {
    type: String,
    enum: [
      'pending', 'confirmed', 'occupied', 'completed',
      'cancelled', 'declined', 'no_show', 'released',
    ],
    default: 'pending',
  },

  // Payment
  payment: {
    transactionId: String,
    method:        { type: String, enum: ['momo','bank','credit','apple','payos','cash'] },
    paidAt:        Date,
    amount:        Number,
  },

  // Refund
  refund: {
    refundPercent: { type: Number, default: 0 },
    refundAmount:  { type: Number, default: 0 },
    bankName:      { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountName:   { type: String, default: '' },
    refundedAt:    Date,
  },

  // Walk-in booking
  walkedInAt: Date,             // Thời gian walk-in check-in
  completedAt: Date,            // Thời gian hoàn tất

}, { timestamps: true });
```

> **Thay đổi lớn:**
> - Xóa toàn bộ: `duration`, `durationAdjustment`, `expectedEndTime`, `bufferTime`, `gracePeriodEndTime`, `mealTime`, `specialRequests`
> - Xóa `conversationSessionId`
> - Xóa `releaseReason`, `releaseNote`, `releasedAt`, `releasedBy`, `isAutoReleased`
> - Xóa các status cũ: `draft`, `pending_payment`, `paid`, `refund_pending`, `refunded`
> - Thêm `customerInfo` cho walk-in
> - Thêm `source` để biết nguồn đặt
> - Thêm `statusHistory` array để audit trail
> - Thêm `walkedInAt`, `completedAt`
> - Thêm `partnerId` để biết ai xử lý booking

#### 3.1.3 Partner Model (`models/partner.js`) - SỬA ĐỔI

```javascript
const partnerSchema = new mongoose.Schema({
  ownerName: { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, select: false },
  phone:     { type: String, default: '' },
  avatar:    { type: String, default: '' },

  // Role
  role: {
    type: String,
    enum: ['super_admin', 'owner', 'manager', 'staff'],
    default: 'staff',
  },
  isActive: { type: Boolean, default: true },

  // Admin có thể không gắn với restaurant nào
  restaurantId: { type: ObjectId, ref: 'Restaurant', default: null },

  // Super admin flags
  isSystemAdmin: { type: Boolean, default: false },

  // Permission override (cho phép custom permissions)
  permissions: [{
    resource: String,   // 'bookings', 'tables', 'staff', 'restaurant', 'analytics'
    action:   String,   // 'create', 'read', 'update', 'delete', 'manage'
  }],

  // Thông tin đăng nhập (cho owner/manager/staff)
  lastLoginAt: Date,
  loginCount:  { type: Number, default: 0 },
}, { timestamps: true });
```

> **Thay đổi:**
> - Xóa toàn bộ field restaurant cũ (restaurantName, restaurantAddress, ...) - đã có trong Restaurant
> - Xóa subscription fields (business decision, sẽ tách ra sau)
> - Xóa approval fields
> - Thêm `isSystemAdmin` và `permissions` array
> - Thêm `lastLoginAt`, `loginCount`
> - Thêm `super_admin` vào role enum

### 3.2 Schema MỚI cần tạo

#### 3.2.1 Restaurant Configuration (`models/restaurantConfig.js`) - MỚI

```javascript
const restaurantConfigSchema = new mongoose.Schema({
  restaurantId: { type: ObjectId, ref: 'Restaurant', required: true, unique: true },

  // Giờ hoạt động
  openingHours: {
    monday:    { open: { type: String, default: '08:00' }, close: { type: String, default: '22:00' }, isOpen: { type: Boolean, default: true } },
    tuesday:   { open: { type: String, default: '08:00' }, close: { type: String, default: '22:00' }, isOpen: { type: Boolean, default: true } },
    wednesday: { open: { type: String, default: '08:00' }, close: { type: String, default: '22:00' }, isOpen: { type: Boolean, default: true } },
    thursday:  { open: { type: String, default: '08:00' }, close: { type: String, default: '22:00' }, isOpen: { type: Boolean, default: true } },
    friday:    { open: { type: String, default: '08:00' }, close: { type: String, default: '22:00' }, isOpen: { type: Boolean, default: true } },
    saturday:  { open: { type: String, default: '08:00' }, close: { type: String, default: '22:00' }, isOpen: { type: Boolean, default: true } },
    sunday:    { open: { type: String, default: '08:00' }, close: { type: String, default: '22:00' }, isOpen: { type: Boolean, default: true } },
  },

  // Cấu hình đặt bàn
  bookingConfig: {
    maxPartySize:      { type: Number, default: 20 },     // Số người tối đa
    minPartySize:      { type: Number, default: 1 },      // Số người tối thiểu
    advanceBookingDays:{ type: Number, default: 30 },     // Đặt trước tối đa bao nhiêu ngày
    noShowGraceMinutes:{ type: Number, default: 30 },     // Ân hạn bao nhiêu phút (trước khi no-show)
    allowWalkin:       { type: Boolean, default: true },  // Cho phép walk-in
    requireDeposit:    { type: Boolean, default: false }, // Yêu cầu đặt cọc
    depositPercent:    { type: Number, default: 0 },      // Phần trăm tiền cọc
    maxActiveBookingsPerPhone: { type: Number, default: 3 }, // Số booking tối đa cho 1 SĐT

    // Khung giờ nhận booking
    bookingSlots: {
      lunchStart:  { type: String, default: '11:00' },
      lunchEnd:    { type: String, default: '14:00' },
      dinnerStart: { type: String, default: '17:00' },
      dinnerEnd:   { type: String, default: '22:00' },
    },
  },

  // Cấu hình bàn VIP
  vipConfig: {
    minSpend:  { type: Number, default: 0 },             // Chi tiêu tối thiểu
    requireDeposit: { type: Boolean, default: true },
    depositAmount:  { type: Number, default: 500000 },
  },

  // Floor plan settings
  floorPlan: {
    backgroundImage: { type: String, default: '' },
    gridCols: { type: Number, default: 10 },
    gridRows: { type: Number, default: 8 },
  },
}, { timestamps: true });
```

#### 3.2.2 Order/Food Items (`models/orderItem.js`) - MỚI (cho tương lai)

```javascript
const orderItemSchema = new mongoose.Schema({
  restaurantId: { type: ObjectId, ref: 'Restaurant', required: true },
  bookingId:    { type: ObjectId, ref: 'Booking', required: true },
  tableId:      { type: ObjectId, ref: 'Table' },
  items: [{
    name:     String,
    quantity: Number,
    price:    Number,
    note:     String,
  }],
  totalAmount: { type: Number, default: 0 },
  servedAt:    Date,
}, { timestamps: true });
```

#### 3.2.3 Notification (`models/notification.js`) - MỚI

```javascript
const notificationSchema = new mongoose.Schema({
  restaurantId: { type: ObjectId, ref: 'Restaurant' },
  recipientId:  { type: ObjectId, ref: 'Partner' },    // Gửi đến ai
  recipientRole:{ type: String, enum: ['owner','manager','staff'] },
  type: {
    type: String,
    enum: ['new_booking', 'cancellation', 'checkin', 'no_show', 'system'],
  },
  title:    String,
  subtitle: String,
  data:     { type: mongoose.Schema.Types.Mixed },     // Dữ liệu bổ sung (bookingId...)
  isRead:   { type: Boolean, default: false },
  readAt:   Date,
}, { timestamps: true });
```

#### 3.2.4 Analytics Event (`models/analyticsEvent.js`) - MỚI

```javascript
const analyticsEventSchema = new mongoose.Schema({
  restaurantId: { type: ObjectId, ref: 'Restaurant', required: true },

  // Loại event
  event: {
    type: String,
    enum: [
      'page_view', 'search', 'restaurant_view', 'table_view',
      'booking_start', 'booking_complete', 'booking_cancel',
      'checkin', 'complete', 'no_show', 'walkin',
      'ai_chat_start', 'ai_chat_complete',
    ],
    required: true,
  },

  // Metadata
  userId:    { type: ObjectId, ref: 'User', default: null },
  sessionId: String,

  // Dữ liệu
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  timestamp: { type: Date, default: Date.now },
});

// Index cho analytics queries
analyticsEventSchema.index({ restaurantId: 1, event: 1, timestamp: -1 });
analyticsEventSchema.index({ restaurantId: 1, timestamp: -1 });
analyticsEventSchema.index({ event: 1, timestamp: -1 });
```

#### 3.2.5 Daily Analytics Snapshot (`models/dailyAnalytics.js`) - MỚI

```javascript
const dailyAnalyticsSchema = new mongoose.Schema({
  restaurantId: { type: ObjectId, ref: 'Restaurant', required: true },
  date:         { type: String, required: true },  // YYYY-MM-DD

  // User Activity
  totalUsers:        { type: Number, default: 0 },
  activeUsers:       { type: Number, default: 0 },
  newUsers:          { type: Number, default: 0 },
  returningUsers:    { type: Number, default: 0 },

  // Search & Discovery
  totalSearches:     { type: Number, default: 0 },
  uniqueSearchUsers: { type: Number, default: 0 },
  topSearchKeywords: [{ keyword: String, count: Number }],
  searchToViewRate:  { type: Number, default: 0 },  // % search → xem nhà hàng

  // Booking Funnel
  funnel: {
    restaurantViews:   { type: Number, default: 0 },
    tableViews:        { type: Number, default: 0 },
    bookingStarted:    { type: Number, default: 0 },  // Bắt đầu đặt
    bookingCompleted:  { type: Number, default: 0 },  // Đặt thành công
    bookingConfirmed:  { type: Number, default: 0 },  // Được xác nhận
    checkedIn:         { type: Number, default: 0 },  // Đã check-in
    completed:         { type: Number, default: 0 },  // Hoàn tất
  },
  funnelConversion: {
    viewToStart:  { type: Number, default: 0 },  // %
    startToBook:  { type: Number, default: 0 },  // %
    bookToConfirm:{ type: Number, default: 0 },  // %
    confirmToCheckin: { type: Number, default: 0 }, // %
    checkinToComplete:{ type: Number, default: 0 }, // %
  },

  // Table Selection
  vipTableBookings:     { type: Number, default: 0 },
  standardTableBookings:{ type: Number, default: 0 },
  tableTypeRatio: {
    vip:      { type: Number, default: 0 },
    view:     { type: Number, default: 0 },
    regular:  { type: Number, default: 0 },
    standard: { type: Number, default: 0 },
  },

  // Cancellation & No-show
  totalCancelled: { type: Number, default: 0 },
  totalNoShow:    { type: Number, default: 0 },
  cancelRate:     { type: Number, default: 0 },       // %
  noShowRate:     { type: Number, default: 0 },       // %
  cancelReasons:  [{ reason: String, count: Number }],
  avgCancellationLeadTime: { type: Number, default: 0 }, // giờ trước booking

  // AI Assistant
  aiTotalChats:      { type: Number, default: 0 },
  aiUniqueUsers:     { type: Number, default: 0 },
  aiCompletedBookings: { type: Number, default: 0 },
  aiConversionRate:  { type: Number, default: 0 },

  // Peak Hours (heatmap data)
  peakHours: [{
    hour:   Number,       // 0-23
    dayOfWeek: Number,    // 0-6 (CN=0, T2=1, ...)
    bookings: Number,     // Số booking
    checkins: Number,     // Số check-in
  }],

  // Doanh thu ước tính
  estimatedRevenue: { type: Number, default: 0 },
  totalDeposits:    { type: Number, default: 0 },

  // Thời gian
  avgDiningDuration: { type: Number, default: 0 },    // phút (từ check-in đến complete)
  avgPartySize:      { type: Number, default: 0 },

  // Tổng quan
  totalBookings:   { type: Number, default: 0 },
  totalWalkIns:    { type: Number, default: 0 },
}, { timestamps: true });

dailyAnalyticsSchema.index({ restaurantId: 1, date: -1 }, { unique: true });
```

#### 3.2.6 Shift Log (`models/shiftLog.js`) - MỚI (cho quản lý ca)

```javascript
const shiftLogSchema = new mongoose.Schema({
  restaurantId: { type: ObjectId, ref: 'Restaurant', required: true },
  partnerId:    { type: ObjectId, ref: 'Partner', required: true },
  date:         { type: String, required: true },   // YYYY-MM-DD
  checkIn:      { type: Date, default: Date.now },
  checkOut:     Date,
  note:         String,
  actions: [{
    action:    String,     // 'checkin', 'complete', 'cancel', etc.
    bookingId: { type: ObjectId, ref: 'Booking' },
    timestamp: { type: Date, default: Date.now },
  }],
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
}, { timestamps: true });
```

---

## 4. API Endpoints

### 4.1 Super Admin APIs (`/api/admin/v2`)

#### Authentication

| Method | Path | Mô tả | Body |
|--------|------|-------|------|
| POST | `/api/admin/auth/login` | Đăng nhập admin | `{email, password}` |
| POST | `/api/admin/auth/logout` | Đăng xuất | - |
| GET | `/api/admin/auth/me` | Thông tin admin hiện tại | - |

#### Restaurant Management

| Method | Path | Mô tả | Query/Body |
|--------|------|-------|------------|
| GET | `/api/admin/v2/restaurants` | Danh sách nhà hàng | `?search, city, cuisine, isActive, isFeatured, page, limit` |
| GET | `/api/admin/v2/restaurants/:id` | Chi tiết nhà hàng | - |
| POST | `/api/admin/v2/restaurants` | Tạo nhà hàng | `{name, address, city, phone, ...}` |
| PUT | `/api/admin/v2/restaurants/:id` | Cập nhật nhà hàng | `{...}` |
| DELETE | `/api/admin/v2/restaurants/:id` | Xóa nhà hàng (soft) | - |
| PUT | `/api/admin/v2/restaurants/:id/status` | Kích hoạt/vô hiệu | `{isActive}` |

#### Partner/Staff Management

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/admin/v2/partners` | Danh sách tài khoản partner/staff |
| GET | `/api/admin/v2/partners/:id` | Chi tiết partner |
| POST | `/api/admin/v2/partners` | Tạo partner mới |
| PUT | `/api/admin/v2/partners/:id` | Cập nhật partner |
| PUT | `/api/admin/v2/partners/:id/role` | Thay đổi role |
| DELETE | `/api/admin/v2/partners/:id` | Xóa partner |

#### Customer Management

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/admin/v2/users` | Danh sách người dùng |
| GET | `/api/admin/v2/users/:id` | Chi tiết người dùng |
| PUT | `/api/admin/v2/users/:id/status` | Vô hiệu hóa/kích hoạt |

#### Super Admin Dashboard

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/admin/v2/dashboard` | Tổng quan toàn hệ thống |
| GET | `/api/admin/v2/dashboard/revenue` | Doanh thu toàn hệ thống |
| GET | `/api/admin/v2/audit-logs` | Audit logs |

### 4.2 Partner Dashboard APIs (`/api/partner/v2`)

> Tất cả API đều hoạt động trong context của nhà hàng mà partner thuộc về.

#### Authentication & Profile

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/partner/auth/login` | Đăng nhập |
| POST | `/api/partner/auth/logout` | Đăng xuất |
| GET | `/api/partner/auth/me` | Thông tin + nhà hàng |
| PUT | `/api/partner/profile` | Cập nhật profile |

#### Overview Dashboard

| Method | Path | Mô tả | Query params |
|--------|------|-------|-------------|
| GET | `/api/partner/v2/dashboard/overview` | Tổng quan dashboard | - |
| GET | `/api/partner/v2/dashboard/today` | Chi tiết hôm nay | - |
| GET | `/api/partner/v2/dashboard/weekly` | Thống kê tuần | - |

**Response mẫu GET /api/partner/v2/dashboard/overview:**
```json
{
  "success": true,
  "data": {
    "today": {
      "totalBookings": 15,
      "confirmedBookings": 8,
      "occupiedTables": 5,
      "completedBookings": 3,
      "cancelledBookings": 1,
      "noShowBookings": 0,
      "walkIns": 2,
      "estimatedRevenue": 5000000,
      "totalGuests": 45
    },
    "tableStats": {
      "total": 20,
      "available": 8,
      "reserved": 5,
      "occupied": 5,
      "cleaning": 2,
      "maintenance": 0
    },
    "upcomingBookings": [
      {
        "id": "...",
        "bookingNumber": "BK-...",
        "customerName": "Nguyễn Văn A",
        "customerPhone": "090...",
        "tableName": "Bàn VIP 1",
        "tableType": "vip",
        "time": "18:00",
        "partySize": 4,
        "status": "confirmed",
        "source": "app",
        "depositAmount": 200000,
        "bookedAt": "..."
      }
    ]
  }
}
```

#### Bookings Management

| Method | Path | Mô tả | Query/Body |
|--------|------|-------|------------|
| GET | `/api/partner/v2/bookings` | Danh sách booking | `?status, date, search, source, page, limit` |
| GET | `/api/partner/v2/bookings/:id` | Chi tiết booking | - |
| PUT | `/api/partner/v2/bookings/:id/confirm` | Xác nhận booking | - |
| PUT | `/api/partner/v2/bookings/:id/decline` | Từ chối booking | `{reason}` |
| PUT | `/api/partner/v2/bookings/:id/checkin` | Check-in khách | - |
| PUT | `/api/partner/v2/bookings/:id/complete` | **Hoàn tất (giải phóng bàn)** | - |
| PUT | `/api/partner/v2/bookings/:id/cancel` | Hủy booking | `{reason}` |
| PUT | `/api/partner/v2/bookings/:id/noshow` | Đánh dấu no-show | - |
| POST | `/api/partner/v2/bookings/walkin` | Tạo walk-in | `{tableId, date, time, partySize, customerName, phone}` |
| PUT | `/api/partner/v2/bookings/:id/transfer` | Chuyển bàn | `{newTableId}` |

**Chi tiết luồng Complete (cực kỳ quan trọng):**
```
PUT /api/partner/v2/bookings/:id/complete
Response: { success: true, message: "Bàn đã được giải phóng" }

Logic:
1. Kiểm tra booking.status === 'occupied'
2. booking.status = 'completed'
3. booking.completedAt = now
4. Thêm statusHistory
5. Table.status = 'available', Table.currentBookingId = null
```

#### Table Management

| Method | Path | Mô tả | Body |
|--------|------|-------|------|
| GET | `/api/partner/v2/tables` | Danh sách bàn | - |
| GET | `/api/partner/v2/tables/:id` | Chi tiết bàn | - |
| POST | `/api/partner/v2/tables` | Thêm bàn | `{name, type, capacity, area, floor, position, ...}` |
| PUT | `/api/partner/v2/tables/:id` | Cập nhật bàn | `{...}` |
| DELETE | `/api/partner/v2/tables/:id` | Xóa bàn | - |
| PUT | `/api/partner/v2/tables/:id/status` | **Đổi trạng thái bàn thủ công** | `{status, note}` |
| PUT | `/api/partner/v2/tables/batch-status` | Đổi status hàng loạt | `{tableIds[], status}` |
| PUT | `/api/partner/v2/tables/:id/cleaning-done` | Dọn xong | - |
| PUT | `/api/partner/v2/tables/:id/maintenance` | Bảo trì | `{isUnderMaintenance}` |

#### Floor Plan

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/partner/v2/floor-plan` | Lấy sơ đồ bàn + trạng thái realtime |
| PUT | `/api/partner/v2/floor-plan` | Cập nhật sơ đồ (vị trí bàn) |
| GET | `/api/partner/v2/floor-plan/live` | Trạng thái realtime (polling) |

#### Staff Management (Owner/Manager only)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/partner/v2/staff` | Danh sách nhân viên |
| POST | `/api/partner/v2/staff` | Thêm nhân viên |
| PUT | `/api/partner/v2/staff/:id` | Cập nhật nhân viên |
| PUT | `/api/partner/v2/staff/:id/role` | Đổi vai trò |
| DELETE | `/api/partner/v2/staff/:id` | Xóa nhân viên |
| PUT | `/api/partner/v2/staff/:id/reset-password` | Reset mật khẩu |

#### Shift Management

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/partner/v2/shifts/start` | Bắt đầu ca làm việc |
| PUT | `/api/partner/v2/shifts/end` | Kết thúc ca làm việc |
| GET | `/api/partner/v2/shifts` | Lịch sử ca làm việc |
| GET | `/api/partner/v2/shifts/active` | Ca làm việc hiện tại |

#### Notification

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/partner/v2/notifications` | Danh sách thông báo |
| PUT | `/api/partner/v2/notifications/:id/read` | Đánh dấu đã đọc |
| PUT | `/api/partner/v2/notifications/read-all` | Đánh dấu tất cả đã đọc |

#### Restaurant Settings

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/partner/v2/settings` | Lấy cấu hình nhà hàng |
| PUT | `/api/partner/v2/settings` | Cập nhật cấu hình |
| PUT | `/api/partner/v2/settings/booking` | Cập nhật cấu hình đặt bàn |
| PUT | `/api/partner/v2/settings/opening-hours` | Cập nhật giờ mở cửa |

### 4.3 Analytics APIs (`/api/partner/v2/analytics`)

| Method | Path | Mô tả | Query |
|--------|------|-------|-------|
| GET | `/api/partner/v2/analytics/overview` | Tổng quan analytics | `?from, to` |
| GET | `/api/partner/v2/analytics/users` | User activity | `?from, to` |
| GET | `/api/partner/v2/analytics/search` | Search & discovery | `?from, to` |
| GET | `/api/partner/v2/analytics/funnel` | Booking funnel | `?from, to` |
| GET | `/api/partner/v2/analytics/tables` | Table selection | `?from, to` |
| GET | `/api/partner/v2/analytics/cancellation` | Cancellation & no-show | `?from, to` |
| GET | `/api/partner/v2/analytics/ai` | AI assistant | `?from, to` |
| GET | `/api/partner/v2/analytics/peak-hours` | Peak hours heatmap | `?from, to` |
| GET | `/api/partner/v2/analytics/daily/:date` | Chi tiết ngày | date=YYYY-MM-DD |

### 4.4 WebSocket (cho real-time)

```javascript
// Socket events cho floor plan realtime
socket.on('join:restaurant', restaurantId => {
  socket.join(`restaurant:${restaurantId}`);
});

// Server emit khi có thay đổi
socket.to(`restaurant:${restaurantId}`).emit('table:status-changed', {
  tableId: '...',
  oldStatus: 'occupied',
  newStatus: 'available',
  bookingId: '...',
});

socket.to(`restaurant:${restaurantId}`).emit('booking:new', {
  bookingId: '...',
  customerName: '...',
  tableName: '...',
  time: '18:00',
});

socket.to(`restaurant:${restaurantId}`).emit('booking:status-changed', {
  bookingId: '...',
  oldStatus: 'pending',
  newStatus: 'confirmed',
});
```

---

## 5. Phân quyền chi tiết (RBAC)

### 5.1 Ma trận quyền

| Tính năng | Super Admin | Owner | Manager | Staff |
|-----------|:-----------:|:-----:|:-------:|:-----:|
| **All Restaurants** | | | | |
| Xem danh sách | ✅ | ❌ | ❌ | ❌ |
| Xem workspace NH | ✅ | ✅ | ✅ | ✅ |
| **Workspace NH** | | | | |
| Xem tổng quan | ✅ | ✅ | ✅ | ✅ |
| **Dashboard** | | | | |
| Xem overview | ✅ | ✅ | ✅ | ✅ |
| Xem analytics | ✅ | ✅ | ✅ | ❌ |
| **Bookings** | | | | |
| Xem danh sách | ✅ | ✅ | ✅ | ✅ |
| Xác nhận | ✅ | ✅ | ✅ | ✅ |
| Từ chối | ✅ | ✅ | ✅ | ✅ |
| Check-in | ✅ | ✅ | ✅ | ✅ |
| Hoàn tất | ✅ | ✅ | ✅ | ✅ |
| Hủy | ✅ | ✅ | ✅ | ✅ |
| No-show | ✅ | ✅ | ✅ | ✅ |
| Release bàn | ✅ | ✅ | ✅ | ❌ |
| Chuyển bàn | ✅ | ✅ | ✅ | ✅ |
| Tạo walk-in | ✅ | ✅ | ✅ | ✅ |
| **Tables** | | | | |
| Xem danh sách | ✅ | ✅ | ✅ | ✅ |
| Thêm bàn | ✅ | ✅ | ✅ | ❌ |
| Sửa bàn | ✅ | ✅ | ✅ | ❌ |
| Xóa bàn | ✅ | ✅ | ✅ | ❌ |
| Sắp xếp floorplan | ✅ | ✅ | ✅ | ❌ |
| Cập nhật trạng thái | ✅ | ✅ | ✅ | ✅ |
| Đánh dấu bảo trì | ✅ | ✅ | ✅ | ❌ |
| **Staff** | | | | |
| Xem danh sách | ✅ | ✅ | ✅ | ❌ |
| Thêm/sửa/xóa | ✅ | ✅ | ✅ | ❌ |
| **Settings** | | | | |
| Cấu hình NH | ✅ | ✅ | ✅ | ❌ |
| Cập nhật profile | ✅ | ✅ | ✅ | ❌ |
| **Analytics** | | | | |
| Xem tất cả | ✅ | ✅ | ✅ | ❌ |

### 5.2 Giải thích role

| Role | Mô tả |
|------|-------|
| **Super Admin** | Nhân viên của Amble, quản lý toàn bộ hệ thống. Có thể xem workspace của bất kỳ nhà hàng nào, can thiệp khi cần. |
| **Owner** | Chủ nhà hàng. Có toàn quyền trong workspace của mình. |
| **Manager** | Quản lý nhà hàng. Có quyền CRUD trừ một số quyền cao nhất (xóa vĩnh viễn, quản lý subscription). |
| **Staff** | Nhân viên phục vụ. Chỉ có quyền thao tác nghiệp vụ hằng ngày (check-in, complete, xem booking). |

---

## 6. UI/UX Design

### 6.1 Tổng quan kiến trúc màn hình

```
App Admin (React Native / Web)
│
├── Super Admin Flow
│   ├── Login (/admin/login)
│   ├── All Restaurants (/admin/restaurants)
│   │   ├── Restaurant Card Grid
│   │   └── Filter + Search
│   └── Restaurant Workspace (/admin/restaurant/:id/*)
│       ├── Dashboard
│       ├── Bookings
│       ├── Floor Plan
│       ├── Staff
│       ├── Settings
│       └── Analytics
│
└── Partner Flow
    ├── Login (/partner/login)
    └── Workspace (/partner/*)
        ├── Dashboard
        ├── Bookings
        ├── Floor Plan
        ├── Staff (Owner/Manager)
        ├── Settings
        └── Analytics
```

### 6.2 Màn hình chi tiết

#### 6.2.1 Màn hình Đăng nhập (`/admin/login`, `/partner/login`)

**Mô tả:**
- Input email + password
- Nút "Đăng nhập"
- Link "Quên mật khẩu" (nếu có)

**Luồng:**
1. Nhập email, password
2. POST login API
3. Check role:
   - `super_admin` → redirect `/admin/restaurants`
   - `owner/manager/staff` → redirect `/partner/dashboard`
4. Nếu `owner/manager/staff` chưa có `restaurantId` → redirect đến màn hình "Chưa được phân quyền"

#### 6.2.2 All Restaurants Page (`/admin/restaurants`)

**Bố cục:**
```
┌─────────────────────────────────────────────────────────┐
│ [Logo] Amble Admin            [Avatar] Super Admin ▼    │
├─────────────────────────────────────────────────────────┤
│ 🔍 Tìm kiếm nhà hàng...       [Thành phố ▼] [Lọc ▼]    │
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ 🏪 Nhà   │ │ 🏪 Nhà   │ │ 🏪 Nhà   │ │ 🏪 Nhà   │   │
│ │ hàng A   │ │ hàng B   │ │ hàng C   │ │ hàng D   │   │
│ │ Đà Nẵng  │ │ Hà Nội   │ │ Sài Gòn  │ │ Đà Nẵng  │   │
│ │ 📊 15 BN │ │ 📊 8 BN  │ │ 📊 12 BN │ │ 📊 20 BN │   │
│ │ 🟢 Active│ │ 🟢 Active│ │ 🔴 Inact.│ │ 🟢 Active│   │
│ │ [Vào NH] │ │ [Vào NH] │ │ [Vào NH] │ │ [Vào NH] │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│ ┌──────────┐ ┌──────────┐                               │
│ │ 🏪 Nhà   │ │ 🏪 Nhà   │    < 1 2 3 ... 10 >         │
│ │ hàng E   │ │ hàng F   │                               │
│ │ ...      │ │ ...      │                               │
│ └──────────┘ └──────────┘                               │
└─────────────────────────────────────────────────────────┘
```

**Trên mỗi card nhà hàng:**
- Tên nhà hàng
- Địa chỉ / Thành phố
- Số booking hôm nay
- Trạng thái Active/Inactive (badge màu)
- Nút "Vào quản lý" → vào workspace

**Khi click vào card → navigate đến workspace của nhà hàng đó.**

#### 6.2.3 Workspace Layout (dùng chung cho Super Admin & Partner)

```
┌─────────────────────────────────────────────────────────┐
│ [←] [Logo NH] Nhà hàng A                       [Notif][Avt]│
├──────────┬──────────────────────────────────────────────┤
│ ⬜ Tổng  │                                              │
│   quan   │           NỘI DUNG CHÍNH                    │
│ 📋 Đặt   │                                              │
│   bàn    │       (thay đổi theo tab)                   │
│ 🪑 Sơ đồ │                                              │
│   bàn    │                                              │
│ 👥 Nhân  │                                              │
│   viên   │                                              │
│ ⚙ Cài    │                                              │
│   đặt    │                                              │
│ 📊 Phân  │                                              │
│   tích   │                                              │
└──────────┴──────────────────────────────────────────────┘
```

**Thanh sidebar (hoặc bottom nav trên mobile):**
- 📊 **Tổng quan** (Dashboard)
- 📋 **Đặt bàn** (Bookings)
- 🪑 **Sơ đồ bàn** (Floor Plan)
- 👥 **Nhân viên** (Staff - Owner/Manager only)
- ⚙ **Cài đặt** (Settings)
- 📊 **Phân tích** (Analytics)

#### 6.2.4 Dashboard - Tổng quan (`/partner/dashboard`)

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Tổng quan hôm nay                          [Hôm nay] │
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ 📋 Đặt   │ │ 🪑 Bàn   │ │ 👥 Khách │ │ 💰 Doanh │   │
│ │ bàn h.nay│ │ đang dùng│ │ hôm nay  │ │ thu      │   │
│ │    15    │ │  5/20    │ │   45     │ │ 5.000.000│   │
│ │  +3 h.nay│ │ 🟢 10 ✓  │ │          │ │          │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
├─────────────────────────────────────────────────────────┤
│ 📋 Đặt bàn sắp tới (hôm nay)                           │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ⏰ 18:00 👤 Nguyễn Văn A · 4 người                  ││
│ │   🪑 Bàn VIP 1 · 💰 200k đặt cọc · ✅ Confirmed     ││
│ │   [Check-in] [Hủy]                                  ││
│ ├─────────────────────────────────────────────────────┤│
│ │ ⏰ 18:30 👤 Trần Thị B · 2 người                    ││
│ │   🪑 Bàn 5 · 💰 0 đặt cọc · 🟡 Pending             ││
│ │   [Xác nhận] [Từ chối]                              ││
│ ├─────────────────────────────────────────────────────┤│
│ │ ⏰ 19:00 👤 Lê Văn C · 6 người · 📞 090...         ││
│ │   🪑 Bàn 8 · 💰 300k đặt cọc · 🔴 Walk-in          ││
│ │   [Đã check-in]                                     ││
│ └─────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│ 🪑 Trạng thái bàn (thu nhỏ)                            │
│ ┌─────────────────────────────────────────────────────┐│
│ │ B1🟢 B2🟡 B3🔴 B4🔴 B5🟢                          ││
│ │ B6🟡 B7🟢 B8🔴 B9🟢 B10🟦                        ││
│ │ B11🟢 B12🟡 B13🟢 B14🟢 B15🟦                    ││
│ └─────────────────────────────────────────────────────┘│
│ [Xem sơ đồ lớn →]                                      │
└─────────────────────────────────────────────────────────┘
```

#### 6.2.5 Bookings Management (`/partner/bookings`)

```
┌─────────────────────────────────────────────────────────┐
│ 📋 Quản lý đặt bàn                              [Thêm →]│
├─────────────────────────────────────────────────────────┤
│ 🔍 Tìm kiếm (tên, SĐT, mã booking...)   [Hôm nay ▼]   │
├─────────────────────────────────────────────────────────┤
│ [Tất cả] [Chờ] [Xác nhận] [Đang dùng] [HT] [Hủy] [NS] │
│   20      5       8         5        3    1     1      │
├─────────────────────────────────────────────────────────┤
│ Nguồn: [Tất cả ▼]  [Xuất Excel]                        │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐│
│ │ #BK-001 │ 👤 Nguyễn Văn A │ 📞 0901234567           ││
│ │ 🪑 Bàn VIP 1 · 4 người · ⏰ 18:00 · 📱 App         ││
│ │ ✅ Confirmed · 💰 200.000đ                          ││
│ │ [Check-in] [Hoàn tất] [Hủy] [Chuyển bàn]           ││
│ ├─────────────────────────────────────────────────────┤│
│ │ #BK-002 │ 👤 Trần Thị B │ 📞 0909876543             ││
│ │ 🪑 Bàn 5 · 2 người · ⏰ 18:30 · 📞 Điện thoại      ││
│ │ 🟡 Pending · 💰 0đ                                  ││
│ │ [Xác nhận] [Từ chối]                                ││
│ ├─────────────────────────────────────────────────────┤│
│ │ Walk-in  │ 👤 Lê Văn C │ 📞 0912345678              ││
│ │ 🪑 Bàn 8 · 6 người · ⏰ 19:00 · 🚶 Walk-in         ││
│ │ 🔴 Đang dùng                                        ││
│ │ [Hoàn tất] [Chuyển bàn]                             ││
│ └─────────────────────────────────────────────────────┘│
│ < 1 2 3 ... 10 >                                      │
└─────────────────────────────────────────────────────────┘
```

**Các nút hành động theo trạng thái:**

| Trạng thái | Nút hành động |
|---|---|
| `pending` | [Xác nhận] [Từ chối] |
| `confirmed` | [Check-in] [Hủy] |
| `occupied` | [**Hoàn tất**] [Chuyển bàn] |
| `completed` | (chỉ xem) |
| `cancelled` | (chỉ xem) |
| `no_show` | (chỉ xem) |

**Nút "Hoàn tất" (Complete) — cực kỳ quan trọng:**
- Khi click → confirm dialog: "Xác nhận khách đã rời đi và bàn đã trống?"
- Sau khi confirm:
  - Booking → `completed`
  - Bàn → `available`
  - Ghi nhận thời gian hoàn tất
  - Hiển thị toast "Đã giải phóng bàn thành công"

#### 6.2.6 Floor Plan (`/partner/floor-plan`)

```
┌─────────────────────────────────────────────────────────┐
│ 🪑 Sơ đồ bàn                    [Tự động刷新] [Chế độ sửa]│
├─────────────────────────────────────────────────────────┤
│ [Tất cả] [VIP] [View] [Regular] [Trong nhà] [Ngoài trời]│
│ 🟢 10 trống · 🟡 5 giữ chỗ · 🔴 5 đang dùng · 🟦 2 dọn │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌──────────────────────────────────────────┐          │
│   │           SƠ ĐỒ NHÀ HÀNG                 │          │
│   │  ┌──────┐ ┌──────┐              ┌────┐  │          │
│   │  │ B1🟢 │ │ B2🟡 │    CỬA       │ B3 │  │          │
│   │  │  Bàn │ │  Bàn │      VÀO     │🔴  │  │          │
│   │  │   số1│ │   số2│              │Bàn │  │          │
│   │  └──────┘ └──────┘              │số3 │  │          │
│   │                                       │  │          │
│   │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│  │          │
│   │  │ B4🔴 │ │ B5🟢 │ │ B6🟡 │ │ B7🟦││  │          │
│   │  │  Bàn │ │  Bàn │ │  Bàn │ │ Bàn  ││  │          │
│   │  │   số4│ │   số5│ │   số6│ │ số7  ││  │          │
│   │  └──────┘ └──────┘ └──────┘ └──────┘│  │          │
│   │                                       │  │          │
│   │       ┌─────────┐ ┌─────────┐        │  │          │
│   │       │ B8🔴    │ │ B9🟢    │        │  │          │
│   │       │ Bàn VIP │ │ Bàn VIP │        │  │          │
│   │       │   số1   │ │   số2   │        │  │          │
│   │       └─────────┘ └─────────┘        │  │          │
│   └──────────────────────────────────────────┘          │
│                                                         │
│ Click vào bàn B2:                                       │
│ ┌────────────────────────────────────────────────┐     │
│ │ 🪑 Bàn số 2 · Regular · 2-4 người             │     │
│ │ 📍 Trong nhà · Tầng 1                          │     │
│ │                                                 │     │
│ │ 🟡 Đang giữ chỗ                                 │     │
│ │ 👤 Nguyễn Văn A · 📞 0901234567                │     │
│ │ ⏰ 18:00 · 4 người                             │     │
│ │                                                 │     │
│ │ [Check-in] [Hủy booking] [Đặt là Bàn trống]    │     │
│ └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

**Tương tác trên sơ đồ:**
1. **Click vào bàn trống (Available)** → menu: "Walk-in", "Xem chi tiết"
2. **Click vào bàn đang giữ (Reserved)** → menu: "Check-in", "Hủy", "Thông tin khách"
3. **Click vào bàn đang dùng (Occupied)** → menu: "**Hoàn tất**", "Chuyển bàn", "Thông tin khách"
4. **Click vào bàn đang dọn (Cleaning)** → menu: "Dọn xong", "Thông tin"
5. **Chế độ sửa (Edit mode)**: Kéo thả bàn để thay đổi vị trí, thêm bàn mới, xóa bàn

#### 6.2.7 Quick Actions - "Bàn trống" (Set Available)

**Kịch bản:**
1. Staff thấy bàn đã dùng xong (khách đã rời, bàn đã dọn)
2. Staff click vào bàn trên sơ đồ
3. Chọn "**Đặt là Bàn trống**" (Set available)
4. Confirm dialog: "Xác nhận bàn đã sẵn sàng đón khách mới?"
5. Bàn available ngay lập tức

**Hoặc từ danh sách booking:**
1. Staff tìm booking có status "occupied"
2. Click "**Hoàn tất**"
3. Confirm dialog: "Xác nhận khách đã thanh toán và rời đi?"
4. Booking → "completed", Bàn → "available"

#### 6.2.8 Walk-in Dialog

```
┌──────────────────────────────────┐
│ 🚶 Thêm khách walk-in           │
├──────────────────────────────────┤
│ Bàn: [Bàn số 5 ▼]  🟢 Available │
│                                  │
│ Tên khách:  [..................] │
│ SĐT:        [..................] │
│ Số người:   [ 4  ][+][-]        │
│ Ghi chú:    [..................] │
│                                  │
│          [Hủy]  [Xác nhận]      │
└──────────────────────────────────┘
```

#### 6.2.9 Staff Management (`/partner/staff`)

```
┌─────────────────────────────────────────────────────────┐
│ 👥 Quản lý nhân viên                        [+ Thêm NV] │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐│
│ │ 👤 Nguyễn Văn A · nva@email.com · 0901234567       ││
│ │ 🛡 Quản lý · 🟢 Đang hoạt động                     ││
│ │ [Sửa] [Đổi mật khẩu] [Vô hiệu hóa]                 ││
│ ├─────────────────────────────────────────────────────┤│
│ │ 👤 Trần Thị B · ttb@email.com · 0909876543          ││
│ │ 🧑‍💼 Nhân viên · 🟢 Đang hoạt động                 ││
│ │ [Sửa] [Đổi mật khẩu] [Vô hiệu hóa]                 ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

#### 6.2.10 Settings (`/partner/settings`)

```
┌─────────────────────────────────────────────────────────┐
│ ⚙ Cài đặt nhà hàng                                     │
├─────────────────────────────────────────────────────────┤
│ 📝 Thông tin cơ bản                                     │
│ ├─ Tên: [Nhà hàng A................................]    │
│ ├─ Địa chỉ: [123 Đường ABC, Quận 1................]    │
│ ├─ Điện thoại: [0901234567...........................]  │
│ └─ ...                                                  │
│                                                         │
│ ⏰ Giờ mở cửa                                           │
│ ├─ Thứ 2: [08:00] ─ [22:00] [✓ Mở cửa]               │
│ ├─ Thứ 3: [08:00] ─ [22:00] [✓ Mở cửa]               │
│ └─ ...                                                  │
│                                                         │
│ 📋 Cấu hình đặt bàn                                     │
│ ├─ Số người tối đa: [20]                               │
│ ├─ Đặt trước tối đa: [30] ngày                         │
│ ├─ Ân hạn no-show: [30] phút                          │
│ ├─ Cho phép walk-in: [✓]                               │
│ ├─ Yêu cầu đặt cọc: [ ]                                │
│ └─ ...                                                  │
│                                                         │
│ 🪑 Cấu hình sơ đồ bàn                                   │
│ ├─ Số cột lưới: [10]                                   │
│ ├─ Số hàng lưới: [8]                                   │
│ └─ ...                                                  │
└─────────────────────────────────────────────────────────┘
```

#### 6.2.11 Analytics Page (`/partner/analytics`) — Dành cho Owner/Manager

##### Tab 1: User Activity Metrics
```
┌──────────────────────────────────────────────────────────┐
│ 📊 Phân tích người dùng              [Tuần này ▼] [Lọc ▼]│
├──────────────────────────────────────────────────────────┤
│ ┌───────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│ │👥Total│ │📱HĐộng│ │🆕Mới │ │🔄Quay │                   │
│ │ Users │ │Active │ │Users │ │lại   │                   │
│ │ 1,234 │ │  567  │ │  89  │ │ 120  │                   │
│ └───────┘ └──────┘ └──────┘ └──────┘                   │
├──────────────────────────────────────────────────────────┤
│ Biểu đồ: Users theo ngày (line chart)                   │
│   ▲                                                      │
│ 200│  ╱╲    ╱╲                                            │
│ 150│ ╱  ╲  ╱  ╲  ╱╲                                     │
│ 100│╱    ╲╱    ╲╱  ╲                                    │
│  50│                        ╱╲                          │
│    └──────────────────────────▶                         │
│      T2  T3  T4  T5  T6  T7  CN                         │
└──────────────────────────────────────────────────────────┘
```

##### Tab 2: Search & Discovery Metrics
```
┌──────────────────────────────────────────────────────────┐
│ 🔍 Tìm kiếm & Khám phá                                   │
├──────────────────────────────────────────────────────────┤
│ ● Tổng lượt tìm kiếm: 2,456                             │
│ ● Người dùng tìm kiếm: 890                              │
│ ● Từ khóa phổ biến: "lẩu"(123), "nướng"(98), "hải sản"(87)│
│ ● Tỉ lệ tìm → xem NH: 34%                               │
├──────────────────────────────────────────────────────────┤
│ Biểu đồ: Từ khóa tìm kiếm (bar chart)                    │
│ lẩu    ████████████████████ 123                          │
│ nướng  ████████████████     98                           │
│ hải sản████████████████     87                           │
└──────────────────────────────────────────────────────────┘
```

##### Tab 3: Booking Funnel (5 bước)
```
┌──────────────────────────────────────────────────────────┐
│ 🎯 Phễu đặt bàn                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Xem nhà hàng            ██████████████████████  1,000   │
│                            ▼  80%                       │
│  Xem bàn                 ████████████████        800     │
│                            ▼  62%                       │
│  Bắt đầu đặt             ██████████              500     │
│                            ▼  70%                       │
│  Đặt thành công          ███████                 350     │
│                            ▼  85%                       │
│  Xác nhận                ██████                  300     │
│                            ▼  80%                       │
│  Check-in                █████                   240     │
│                            ▼  90%                       │
│  Hoàn tất                ████                    216     │
│                                                          │
│  ● Tỉ lệ từ xem → đặt: 35%                              │
│  ● Tỉ lệ từ đặt → hoàn tất: 62%                         │
└──────────────────────────────────────────────────────────┘
```

##### Tab 4: Table Selection Metrics
```
┌──────────────────────────────────────────────────────────┐
│ 🪑 Lựa chọn bàn                                          │
├──────────────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│ │🌟VIP │ │👁View│ │📋Reg.│ │📦Std │                    │
│ │ 120  │ │  89  │ │ 345  │ │ 156  │                    │
│ │(17%) │ │(13%) │ │(49%) │ │(22%) │                    │
│ └──────┘ └──────┘ └──────┘ └──────┘                    │
├──────────────────────────────────────────────────────────┤
│ Pie chart: Tỉ lệ loại bàn                                │
│                    ┌───┐                                 │
│                  ┌─┤VIP├─┐                               │
│                 ┌┤ │17%│ ├┐                              │
│                 ││ └───┘ ││                              │
│                 ││ ┌───┐ ││                              │
│                 │└─┤Std│─┘│                              │
│                  └─┤22%├─┘                               │
│                    └───┘                                 │
└──────────────────────────────────────────────────────────┘
```

##### Tab 5: Cancellation & No-show Metrics
```
┌──────────────────────────────────────────────────────────┐
│ ❌ Hủy & Không đến                                        │
├──────────────────────────────────────────────────────────┤
│ ┌───────┐ ┌──────┐ ┌──────┐ ┌────────┐                 │
│ │❌ Hủy │ │🚫No  │ │📊 Tỉ  │ │⏰ TGian │                 │
│ │       │ │-show │ │ lệ   │ │TB hủy  │                 │
│ │  45   │ │  12  │ │ 8.5% │ │18 giờ  │                 │
│ └───────┘ └──────┘ └──────┘ └────────┘                 │
├──────────────────────────────────────────────────────────┤
│ ● Lý do hủy:                                            │
│   Khách bận (35%) │ Thay đổi kế hoạch (28%) │...        │
│                                                          │
│ ● Biểu đồ: Hủy theo ngày trong tuần                     │
│   ▲                                                      │
│ 10│     ██                                                │
│  8│  ██ ██ ██     ██                                    │
│  6│  ██ ██ ██  ██ ██  ██                                │
│   └──────────────────────────▶                           │
│     T2 T3 T4 T5 T6 T7 CN                                 │
└──────────────────────────────────────────────────────────┘
```

##### Tab 6: AI Assistant Metrics
```
┌──────────────────────────────────────────────────────────┐
│ 🤖 Trợ lý AI                                             │
├──────────────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐                │
│ │💬Trò  │ │👤User│ │✅Đặt  │ │📈Tỉ lệ   │                │
│ │chuyện │ │      │ │thành │ │chuyển   │                │
│ │  567  │ │ 234  │ │ 120  │ │  51%    │                │
│ └──────┘ └──────┘ └──────┘ └──────────┘                │
├──────────────────────────────────────────────────────────┤
│ Câu hỏi phổ biến:                                       │
│ ● "Bàn cho 4 người?" (45 lần)                           │
│ ● "Còn bàn VIP tối nay?" (32 lần)                       │
│ ● "Giá trung bình?" (28 lần)                           │
└──────────────────────────────────────────────────────────┘
```

##### Tab 7: Peak Hours Analysis
```
┌──────────────────────────────────────────────────────────┐
│ ⏰ Phân tích giờ cao điểm                                 │
├──────────────────────────────────────────────────────────┤
│ Biểu đồ: Booking theo khung giờ                          │
│   ▲                                                      │
│ 30│              ██                                      │
│ 25│           ██ ██ ██                                   │
│ 20│        ██ ██ ██ ██ ██                               │
│ 15│  ██    ██ ██ ██ ██ ██ ██                            │
│ 10│  ██ ██ ██ ██ ██ ██ ██ ██ ██                        │
│  5│  ██ ██ ██ ██ ██ ██ ██ ██ ██ ██ ██                  │
│   └─────────────────────────────────────────▶            │
│     10 11 12 13 14 15 16 17 18 19 20 21 22              │
│                                                          │
│ Heatmap: Giờ × Ngày trong tuần                          │
│      T2  T3  T4  T5  T6  T7  CN                        │
│ 10    ·   ·   ·   ·   ·   ·   ·                        │
│ 11    ░   ░   ░   ░   ░   ░   ░                        │
│ 12    ▓   ▓   ▓   ▓   ▓   ▓   ▓                        │
│ 13    ░   ░   ░   ░   ░   ░   ░                        │
│ 14    ·   ·   ·   ·   ·   ·   ·                        │
│ 17    ░   ░   ░   ░   ░   ░   ░                        │
│ 18    ▓   ▓   ▓   ▓   ▓   ▓   ▒                        │
│ 19    █   █   █   █   █   █   ▓                        │
│ 20    ▓   ▓   ▓   ▓   ▓   ▓   ░                        │
│ 21    ░   ░   ░   ░   ░   ░   ·                        │
│ 22    ·   ·   ·   ·   ·   ·   ·                        │
│                                                          │
│ ● Giờ cao điểm: 19:00-20:00 (T6-CN)                     │
│ ● Khung giờ đề xuất tăng nhân sự: 18:00-21:00           │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Analytics & Metrics

### 7.1 Chi tiết từng metrics

#### User Activity Metrics

| Metric | Công thức | Mô tả |
|--------|-----------|-------|
| Total Users | Tổng số User đã từng booking | Tất cả người dùng đã đặt bàn tại NH này |
| Active Users | User có booking trong kỳ | Người dùng có ít nhất 1 booking trong khoảng thời gian |
| New Users | User đầu tiên booking trong kỳ | Chưa từng booking trước đó |
| Returning Users | User đã từng booking trước kỳ | Đã từng booking trước khoảng thời gian xem xét |

#### Search & Discovery Metrics

| Metric | Mô tả |
|--------|-------|
| Total Searches | Tổng lượt tìm kiếm trên toàn hệ thống |
| Unique Search Users | Số user duy nhất có thao tác tìm kiếm |
| Top Search Keywords | Từ khóa tìm kiếm phổ biến nhất (có thể lọc theo NH) |
| Search to View Rate | % user tìm kiếm → vào được trang NH |

#### Booking Funnel (5 steps)

| Step | Mô tả |
|------|-------|
| 🏪 Xem nhà hàng | User xem trang chi tiết nhà hàng |
| 🪑 Xem bàn | User xem sơ đồ bàn / chọn bàn |
| 📝 Bắt đầu đặt | User mở form đặt bàn |
| ✅ Đặt thành công | User hoàn thành đặt bọc (status: pending) |
| ✔ Xác nhận | Staff xác nhận booking |
| 🚶 Check-in | Khách đến nhà hàng |
| 🎉 Hoàn tất | Kết thúc bữa ăn |

#### Table Selection Metrics

| Metric | Mô tả |
|--------|-------|
| VIP Table Bookings | Tổng số booking vào bàn VIP |
| Standard Table Bookings | Tổng số booking vào bàn Standard |
| Table Type Ratio | Tỉ lệ phân bổ theo loại bàn (VIP/View/Regular/Standard) |

#### Cancellation & No-show Metrics

| Metric | Công thức | Mô tả |
|--------|-----------|-------|
| Total Cancelled | Đếm booking cancelled | Tổng số booking bị hủy |
| Total No-show | Đếm booking no_show | Tổng số booking no-show |
| Cancel Rate | Cancelled / Total Bookings | Tỉ lệ hủy |
| No-show Rate | No-show / Confirmed Bookings | Tỉ lệ không đến |
| Avg Cancellation Lead Time | Trung bình thời gian trước giờ đặt | Khách hủy trước bao lâu |

#### AI Assistant Metrics

| Metric | Mô tả |
|--------|-------|
| Total AI Chats | Tổng số phiên chat với AI |
| Unique AI Users | Số user duy nhất dùng AI |
| AI Completed Bookings | Booking được hoàn thành qua AI |
| AI Conversion Rate | AI Completed / AI Chats |

#### Peak Hours Analysis

| Metric | Mô tả |
|--------|-------|
| Hourly Booking Distribution | Số booking theo từng giờ trong ngày |
| Day-of-Week Heatmap | Số booking theo (giờ × thứ) |
| Peak Hour Prediction | Giờ cao điểm dựa trên dữ liệu lịch sử |

### 7.2 Cách thu thập dữ liệu

**Phương pháp: Event-driven + Daily Snapshot**

1. **Real-time events**: Mọi hành động đều ghi `AnalyticsEvent`:
   - User xem nhà hàng → `page_view` event
   - User tìm kiếm → `search` event với keyword
   - User đặt bàn → `booking_start` + `booking_complete`
   - Staff check-in → `checkin` event
   - Staff hoàn tất → `complete` event
   - Chat với AI → `ai_chat_start` + `ai_chat_complete`

2. **Daily aggregation**: Mỗi ngày chạy 1 cron job (vào 00:05) để:
   - Gom tất cả events trong ngày
   - Tính toán các metrics
   - Ghi vào `DailyAnalytics` snapshot

3. **Real-time dashboard**: Analytics page đọc từ `DailyAnalytics` (đã pre-compute)
   - Cho phép chọn khoảng thời gian (7 ngày, 30 ngày, 90 ngày)
   - Tổng hợp từ nhiều DailyAnalytics documents

---

## 8. Migration Plan

### 8.1 Các bước migration từ hệ thống cũ → mới

#### Phase 1: Backend changes
1. **Tắt background jobs**: Vô hiệu hóa `bookingAutoCompleteService`, `tableCleanupService`, `pendingPaymentCleanupService`, `bookingPendingConfirmationCleanupService`
2. **Sửa Table model**: Thêm fields mới, xóa `isAvailable`
3. **Sửa Booking model**: Xóa duration/buffer fields, thêm `source`, `customerInfo`, `statusHistory`
4. **Sửa Partner model**: Thêm `isSystemAdmin`, `permissions`, `lastLoginAt`
5. **Tạo models mới**: `restaurantConfig`, `analyticsEvent`, `dailyAnalytics`, `notification`, `shiftLog`
6. **Viết migration script**: Chuyển đổi dữ liệu cũ → mới

#### Phase 2: API routes
1. **Tạo routes mới**: `/api/admin/v2`, `/api/partner/v2`
2. **Giữ routes cũ** để tương thích ngược
3. **Chuyển dần** các API consumers sang routes mới

#### Phase 3: Frontend
1. **Admin Super Admin**: Màn hình All Restaurants hoàn toàn mới
2. **Partner Dashboard**: Redesign với sidebar, floor plan realtime
3. **Booking Management**: Thêm các nút Complete, Walk-in, Transfer
4. **Analytics**: 7 tabs metrics

#### Phase 4: Go live
1. **Test kỹ** toàn bộ luồng (đặc biệt là Complete)
2. **Chuyển DNS / routing** sang bản mới
3. **Theo dõi** trong 48h đầu
4. **Xóa routes cũ** sau khi ổn định

### 8.2 Script xóa dữ liệu duration cũ (tham khảo)

```javascript
// migration_remove_duration.js
const Booking = require('../models/booking');

async function migrate() {
  // Xóa duration-related fields khỏi tất cả bookings
  await Booking.updateMany({}, {
    $unset: {
      'bookingDetails.duration': '',
      'bookingDetails.durationAdjustment': '',
      'bookingDetails.expectedEndTime': '',
      'bookingDetails.bufferTime': '',
      'bookingDetails.gracePeriodEndTime': '',
      'bookingDetails.mealTime': '',
      'bookingDetails.specialRequests': '',
    }
  });

  // Map status cũ → mới
  const statusMap = {
    'pending_payment': 'pending',
    'paid': 'confirmed',
    'draft': 'pending',
    'refund_pending': 'cancelled',
    'refunded': 'cancelled',
    'completed': 'completed', // keep
  };

  for (const [oldStatus, newStatus] of Object.entries(statusMap)) {
    await Booking.updateMany(
      { status: oldStatus },
      { $set: { status: newStatus } }
    );
  }
}
```

### 8.3 Files cần xóa hoặc tắt

| File | Hành động |
|------|-----------|
| `services/bookingDuration.js` | ❌ Xóa (không còn dùng) |
| `services/bookingAutoCompleteService.js` | ❌ Xóa (auto complete) |
| `services/tableCleanupService.js` | ❌ Xóa (cleanup tự động) |
| `services/pendingPaymentCleanupService.js` | ❌ Xóa (không còn pending_payment) |
| `services/bookingPendingConfirmationCleanupService.js` | ❌ Xóa (không còn dùng) |

---

## Tổng kết

| Thành phần | Mô tả |
|------------|-------|
| **Kiến trúc** | Multi-tenant, mỗi NH là 1 workspace riêng |
| **Core change** | Xóa hoàn toàn duration/buffer, manual release bắt buộc |
| **Định nghĩa lại status** | Booking: pending → confirmed → occupied → completed |
| **Bảng status** | available → reserved → occupied → available (manual) |
| **Phân quyền** | 4 roles: super_admin, owner, manager, staff |
| **API** | RESTful, versioned (/v2), đầy đủ CRUD + analytics |
| **UI** | Sidebar navigation, floor plan realtime, analytics 7 tabs |
| **Analytics** | 7 nhóm metrics, event-driven + daily snapshot |
