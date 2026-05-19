import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://10.0.2.2:5000/api"; // Android emulator
// const BASE_URL = 'http://localhost:5000/api'; // iOS simulator
// const BASE_URL = 'http://192.168.x.x:5000/api'; // Real device — đổi IP

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
    api.post("/auth/forgot-password", data),
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
  }) => api.get("/restaurants", { params }),
  getFeatured: () => api.get("/restaurants/featured"),
  getById: (id: string) => api.get(`/restaurants/${id}`),
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

  // Hủy booking
  cancel: (bookingId: string, reason?: string) =>
    api.delete(`/booking/${bookingId}/cancel`, { data: { reason } }),

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

// ── Partner Dashboard ───────────────────────────────────
export const partnerDashboardAPI = {
  getOverview: () => api.get("/partner/dashboard/overview"),
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
    openTime?: string;
    closeTime?: string;
    openDays?: string[];
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    website?: string;
  }) => api.put("/partner/restaurant-profile", data),
};

// ── Routes ──────────────────────────────────────────────
export const routesAPI = {
  getAll: (params?: { difficulty?: string; search?: string }) =>
    api.get("/routes", { params }),
  getPopular: () => api.get("/routes/popular"),
  getById: (id: string) => api.get(`/routes/${id}`),
};

export default api;
