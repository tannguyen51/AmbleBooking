import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://amblebooking-production.up.railway.app/api";

export const API_BASE_URL = BASE_URL;

if (__DEV__) console.log('[api] Base URL:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const userToken = await AsyncStorage.getItem("amble_token");
  const partnerToken = await AsyncStorage.getItem("amble_partner_token");
  const url = config.url || "";
  const isPartnerApi = url.startsWith("/partner/");
  const token = isPartnerApi ? partnerToken : userToken || partnerToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ────────────────────────────────────────────────
export const authAPI = {
  register: (data: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }) => api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  requestPasswordReset: (data: { email: string }) =>
    api.post("/auth/forgot-password", data, { timeout: 30000 }),
  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post("/auth/reset-password", data),
  getMe: () => api.get("/auth/me"),
};

// ── Partner Auth ────────────────────────────────────────
export const partnerAuthAPI = {
  register: (data: {
    ownerName: string;
    email: string;
    password: string;
    phone: string;
    restaurantName: string;
    restaurantAddress?: string;
    restaurantCity?: string;
    cuisine?: string;
    subscriptionPackage?: "basic" | "pro" | "premium";
  }) => api.post("/partner/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/partner/auth/login", data),
  getMe: () => api.get("/partner/auth/me"),
  logout: () => api.post("/partner/auth/logout"),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put("/partner/auth/change-password", data),
  forgotPassword: (data: { email: string }) =>
    api.post("/partner/auth/forgot-password", data, { timeout: 30000 }),
  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post("/partner/auth/reset-password", data),
};

// ── User ────────────────────────────────────────────────
export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data: {
    fullName?: string;
    phone?: string;
    bio?: string;
    location?: string;
    avatar?: string;
  }) => api.put("/users/profile", data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put("/users/change-password", data),
  toggleFavoriteRoute: (routeId: string) =>
    api.post(`/users/favorite/${routeId}`),
  getFavoriteRestaurants: () => api.get("/users/favorite-restaurants"),
  toggleFavoriteRestaurant: (restaurantId: string) =>
    api.post(`/users/favorite-restaurant/${restaurantId}`),
  getRewards: () => api.get("/users/rewards"),
};

// ── Restaurant ──────────────────────────────────────────
export const restaurantAPI = {
  getAll: (params?: {
    city?: string;
    cuisine?: string;
    category?: string;
    search?: string;
    priceRange?: string;
  }) => api.get("/restaurants", { params }),
  getNearby: (params: { lat: number; lng: number; maxDistance?: number }) =>
    api.get("/restaurants/nearby", { params }),
  getFeatured: () => api.get("/restaurants/featured"),
  getById: (id: string) => api.get(`/restaurants/${id}`),
  getReviews: (id: string) => api.get(`/restaurants/${id}/reviews`),
  createReview: (
    id: string,
    data: { rating: number; comment?: string; images?: string[]; bookingId: string },
  ) => api.post(`/restaurants/${id}/reviews`, data),
};

// ── Booking ─────────────────────────────────────────────
export const bookingAPI = {
  // Bàn của nhà hàng
  getTables: (restaurantId: string) =>
    api.get(`/booking/tables/${restaurantId}`),

  // Voucher danh mục cho flow đặt bàn
  getVouchers: () => api.get("/booking/vouchers"),

  // Tạo booking (1 bước: create + confirm + pay)
  create: (data: {
    userId: string;
    restaurantId: string;
    tableId: string;
    date: string;
    time: string;
    partySize: number;
    purpose?: string;
    specialRequests?: string;
    paymentMethod: string;
    voucherCode?: string;
    voucherDiscount?: number;
  }) => api.post("/booking/create", data),

  // Lịch sử booking của user
  getUserBookings: (userId: string) => api.get(`/booking/user/${userId}`),

  // Chi tiết 1 booking
  getById: (bookingId: string) => api.get(`/booking/${bookingId}`),

  getNotifications: (userId: string) => api.get(`/booking/notifications/${userId}`),

  // Hủy booking
  cancel: (
    bookingId: string,
    payload?:
      | string
      | {
          reason?: string;
          refundAccount?: {
            bankName: string;
            accountNumber: string;
            accountName: string;
          };
        },
  ) => {
    const data =
      typeof payload === "string" || !payload
        ? { reason: payload }
        : payload;
    return api.delete(`/booking/${bookingId}/cancel`, { data });
  },

  getRefundPreview: (bookingId: string) =>
    api.get(`/booking/${bookingId}/refund-preview`),

  // Partner xác nhận booking
  confirm: (bookingId: string) => api.put(`/booking/${bookingId}/confirm`),

  // Lấy QR chuyển khoản
  getPaymentQr: (bookingId: string) =>
    api.get(`/booking/${bookingId}/payment/qr`),

  // AI conversation
  processMessage: (data: {
    message: string;
    sessionId?: string;
    userId?: string;
  }) => api.post("/booking/conversation", data),

  getSession: (sessionId: string) => api.get(`/booking/session/${sessionId}`),
};

// ── Upload ──────────────────────────────────────────────
export const uploadAPI = {
  uploadImage: (base64: string, folder: string) =>
    api.post("/upload/image", { image: base64, folder }),
};

// ── Payment (PayOS) ────────────────────────────────────
export const paymentAPI = {
  createPayosPayment: (data: { bookingId: string; returnUrl: string; cancelUrl: string }) =>
    api.post("/payment/payos-create", data),
  getPayosStatus: (bookingId: string) =>
    api.get(`/payment/payos-status/${bookingId}`),
  cancelPayosPayment: (bookingId: string) =>
    api.post(`/payment/payos-cancel/${bookingId}`),
  createPartnerPayosPayment: (data: { partnerId: string; subscriptionPackage: string; returnUrl: string; cancelUrl: string }) =>
    api.post("/payment/partner/create-payos", data),
  createPartnerUpgradePayosPayment: (data: { partnerId: string; fromPackage: string; toPackage: string; returnUrl: string; cancelUrl: string }) =>
    api.post("/payment/partner/upgrade/create-payos", data),
  checkPartnerPaymentStatus: (partnerId: string) =>
    api.post("/payment/partner/check-status", { partnerId }),
};

// ── Partner Dashboard ───────────────────────────────────
export const partnerDashboardAPI = {
  getOverview: () => api.get("/partner/dashboard/overview"),
  getRevenue: (period?: string) => api.get("/partner/dashboard/revenue", { params: { period } }),
  getOrders: (status = "all") =>
    api.get("/partner/orders", { params: { status } }),
  getTables: () => api.get("/partner/tables"),
  createTable: (data: {
    name: string;
    type: "vip" | "view" | "regular" | "standard";
    capacity: { min: number; max: number };
    pricing: { baseDeposit: number };
    description?: string;
    features?: string[];
    images?: string[];
  }) => api.post("/partner/tables", data),
  updateTable: (
    tableId: string,
    data: {
      name?: string;
      type?: "vip" | "view" | "regular" | "standard";
      capacity?: { min: number; max: number };
      pricing?: { baseDeposit: number };
      description?: string;
      features?: string[];
      images?: string[];
      isAvailable?: boolean;
    },
  ) => api.put(`/partner/tables/${tableId}`, data),
  deleteTable: (tableId: string) => api.delete(`/partner/tables/${tableId}`),
  getNotifications: () => api.get("/partner/notifications"),
  getRestaurantProfile: () => api.get("/partner/restaurant-profile"),
  upgradeSubscription: (data: {
    package: "pro" | "premium";
    paymentMethod?: "in_app" | "bank_transfer" | "payos";
  }) => api.post("/partner/subscription/upgrade", data),
  updateRestaurantProfile: (data: {
    coverImage?: string;
    name?: string;
    address?: string;
    city?: string;
    phone?: string;
    description?: string;
    introduction?: string;
    cuisine?: string;
    hasParking?: boolean;
    priceMin?: number;
    priceMax?: number;
    openTime?: string;
    closeTime?: string;
    openDays?: string[];
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    website?: string;
  }) => api.put("/partner/restaurant-profile", data),

  // ── New: Booking actions for partner ────────────
  releaseBooking: (bookingId: string, data: { reason: string; note?: string }) =>
    api.post(`/partner/bookings/${bookingId}/release`, data),
  checkInBooking: (bookingId: string) =>
    api.post(`/partner/bookings/${bookingId}/check-in`),
  declineBooking: (bookingId: string) =>
    api.post(`/partner/bookings/${bookingId}/decline`),
  completeBooking: (bookingId: string) =>
    api.post(`/partner/bookings/${bookingId}/complete`),
  setCleaningDone: (tableId: string) =>
    api.put(`/partner/tables/${tableId}/cleaning-done`),
};

export const partnerStaffAPI = {
  getMembers: () => api.get("/partner/staff"),
  createMember: (data: {
    fullName: string;
    email: string;
    phone?: string;
    role: "manager" | "staff";
    sendMethod?: "email" | "sms" | "both";
  }) => api.post("/partner/staff", data),
  updateMember: (
    staffId: string,
    data: {
      fullName?: string;
      phone?: string;
      role?: "manager" | "staff";
      isActive?: boolean;
    },
  ) => api.put(`/partner/staff/${staffId}`, data),
  resendCredentials: (
    staffId: string,
    data?: { sendMethod?: "email" | "sms" | "both" },
  ) => api.post(`/partner/staff/${staffId}/resend-credentials`, data || {}),
  changePassword: (staffId: string, data: { newPassword: string }) =>
    api.put(`/partner/staff/${staffId}/change-password`, data),
};

// ── Partner Analytics ──────────────────────────────────
export const analyticsAPI = {
  getOverview: (from?: string, to?: string) =>
    api.get("/partner/analytics/overview", { params: { from, to } }),
  getUserActivity: (from?: string, to?: string) =>
    api.get("/partner/analytics/users", { params: { from, to } }),
  getSearchDiscovery: (from?: string, to?: string) =>
    api.get("/partner/analytics/search", { params: { from, to } }),
  getBookingFunnel: (from?: string, to?: string) =>
    api.get("/partner/analytics/funnel", { params: { from, to } }),
  getTableSelection: (from?: string, to?: string) =>
    api.get("/partner/analytics/tables", { params: { from, to } }),
  getCancellationMetrics: (from?: string, to?: string) =>
    api.get("/partner/analytics/cancellation", { params: { from, to } }),
  getPeakHours: (from?: string, to?: string) =>
    api.get("/partner/analytics/peak-hours", { params: { from, to } }),
  getAIMetrics: (from?: string, to?: string) =>
    api.get("/partner/analytics/ai", { params: { from, to } }),
  getEngagement: (from?: string, to?: string) =>
    api.get("/partner/analytics/engagement", { params: { from, to } }),
};

// ── Admin Analytics ──────────────────────────────────
export const adminAnalyticsAPI = {
  getOverview: (restaurantId?: string, from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (restaurantId) params.restaurantId = restaurantId;
    return api.get("/admin/analytics/overview", { params });
  },
  getUserActivity: (restaurantId?: string, from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (restaurantId) params.restaurantId = restaurantId;
    return api.get("/admin/analytics/users", { params });
  },
  getSearchDiscovery: (restaurantId?: string, from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (restaurantId) params.restaurantId = restaurantId;
    return api.get("/admin/analytics/search", { params });
  },
  getBookingFunnel: (restaurantId?: string, from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (restaurantId) params.restaurantId = restaurantId;
    return api.get("/admin/analytics/funnel", { params });
  },
  getTableSelection: (restaurantId?: string, from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (restaurantId) params.restaurantId = restaurantId;
    return api.get("/admin/analytics/tables", { params });
  },
  getCancellationMetrics: (restaurantId?: string, from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (restaurantId) params.restaurantId = restaurantId;
    return api.get("/admin/analytics/cancellation", { params });
  },
  getPeakHours: (restaurantId?: string, from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (restaurantId) params.restaurantId = restaurantId;
    return api.get("/admin/analytics/peak-hours", { params });
  },
  getAIMetrics: (restaurantId?: string, from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (restaurantId) params.restaurantId = restaurantId;
    return api.get("/admin/analytics/ai", { params });
  },
  getEngagement: (restaurantId?: string, from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (restaurantId) params.restaurantId = restaurantId;
    return api.get("/admin/analytics/engagement", { params });
  },
};

// ── Admin ──────────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => api.get("/admin/dashboard"),
  getAuditLogs: (params?: { action?: string; targetType?: string; targetId?: string; limit?: number }) =>
    api.get("/admin/audit", { params }),
  aiChat: (messages: { role: "user" | "assistant"; content: string }[]) =>
    api.post("/ai/admin-chat", { messages }),

  getUsers: (params?: {
    search?: string;
    role?: "customer" | "admin";
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) => api.get("/admin/users", { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  setUserActive: (id: string, isActive: boolean) =>
    api.put(`/admin/users/${id}/active`, { isActive }),
  setUserRole: (id: string, role: "customer" | "admin") =>
    api.put(`/admin/users/${id}/role`, { role }),
  adjustUserRewards: (
    id: string,
    data: { points: number; title: string; type: "earn" | "redeem" },
  ) => api.post(`/admin/users/${id}/rewards`, data),

  getPartners: (params?: {
    status?: "pending" | "active" | "expired" | "cancelled";
    search?: string;
    isActive?: boolean;
  }) => api.get("/admin/partners", { params }),
  getPartnerById: (id: string) => api.get(`/admin/partners/${id}`),
  approvePartner: (
    id: string,
    data?: { subscriptionPackage?: "basic" | "pro" | "premium"; subscriptionExpiry?: string; note?: string },
  ) => api.put(`/admin/partners/${id}/approve`, data || {}),
  rejectPartner: (id: string, reason: string) =>
    api.put(`/admin/partners/${id}/reject`, { reason }),
  setPartnerActive: (id: string, isActive: boolean) =>
    api.put(`/admin/partners/${id}/active`, { isActive }),

  getRestaurants: (params?: {
    search?: string;
    city?: string;
    cuisine?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    page?: number;
    limit?: number;
  }) => api.get("/admin/restaurants", { params }),
  updateRestaurant: (id: string, data: any) =>
    api.put(`/admin/restaurants/${id}`, data),
  setRestaurantFeatured: (id: string, isFeatured: boolean) =>
    api.put(`/admin/restaurants/${id}/featured`, { isFeatured }),
  setRestaurantActive: (id: string, isActive: boolean) =>
    api.put(`/admin/restaurants/${id}/active`, { isActive }),

  getBookings: (params?: {
    status?: string;
    search?: string;
    date?: string;
    restaurantId?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) => api.get("/admin/bookings", { params }),
  updateBookingStatus: (
    id: string,
    data: { status: string; reason?: string; paymentMethod?: string; transactionId?: string },
  ) => api.put(`/admin/bookings/${id}/status`, data),
  getRestaurantRevenue: (id: string, params?: { from?: string; to?: string; period?: string }) =>
    api.get(`/admin/restaurants/${id}/revenue`, { params }),

  getRoutes: () => api.get("/admin/routes"),
  createRoute: (data: {
    name: string;
    description?: string;
    location: string;
    distance: number;
    duration: number;
    difficulty?: "easy" | "moderate" | "hard";
    image?: string;
    tags?: string[];
    isPopular?: boolean;
    rating?: number;
    reviewCount?: number;
  }) => api.post("/admin/routes", data),
  updateRoute: (id: string, data: any) => api.put(`/admin/routes/${id}`, data),
  deleteRoute: (id: string) => api.delete(`/admin/routes/${id}`),
};

// ── Routes ──────────────────────────────────────────────
export const routesAPI = {
  getAll: (params?: { difficulty?: string; search?: string }) =>
    api.get("/routes", { params }),
  getPopular: () => api.get("/routes/popular"),
  getById: (id: string) => api.get(`/routes/${id}`),
};

export default api;
