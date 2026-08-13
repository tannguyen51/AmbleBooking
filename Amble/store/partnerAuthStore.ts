import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { partnerAuthAPI } from '../services/api';

export interface Restaurant {
  _id: string;
  name: string;
  cuisine: string;
  location: string;
  city: string;
  address: string;
  phone: string;
  description: string;
  subscriptionPackage: 'basic' | 'standard';
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  images: string[];
  tags: string[];
}

export interface PartnerUser {
  _id: string;
  ownerName: string;
  email: string;
  phone: string;
  restaurantName: string;
  restaurantId: string | null;
  subscriptionPackage: 'basic' | 'standard';
  subscriptionStatus: 'pending' | 'paid_pending' | 'active' | 'expired' | 'cancelled';
  subscriptionExpiry: string | null;
  isPermanent: boolean;
  role: 'owner' | 'manager' | 'staff';
}

interface PartnerAuthState {
  partner: PartnerUser | null;
  restaurant: Restaurant | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    ownerName: string;
    email: string;
    password: string;
    phone: string;
    restaurantName: string;
    restaurantAddress?: string;
    restaurantCity?: string;
    cuisine?: string;
    subscriptionPackage?: 'basic' | 'standard';
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadPartner: () => Promise<void>;
}

const TOKEN_KEY = 'amble_partner_token';

export const usePartnerAuthStore = create<PartnerAuthState>((set) => ({
  partner: null,
  restaurant: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await partnerAuthAPI.login({
        email: email.trim().toLowerCase(),
        password,
      });
      const { token, partner, restaurant } = res.data;

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      // Remove user token to avoid conflicts
      await SecureStore.deleteItemAsync('amble_token');

      set({ partner, restaurant, token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.message || 'Đăng nhập thất bại.';
      throw new Error(message);
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await partnerAuthAPI.register(data);
      const { token, partner, restaurant } = res.data;

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.deleteItemAsync('amble_token');

      set({ partner, restaurant, token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.message || 'Đăng ký thất bại.';
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      await partnerAuthAPI.logout();
    } catch (e) {}

    await SecureStore.deleteItemAsync(TOKEN_KEY);

    set({
      partner: null,
      restaurant: null,
      isAuthenticated: false,
    });
  },

  loadPartner: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return;

      const res = await partnerAuthAPI.getMe();
      set({
        partner: res.data.partner,
        restaurant: res.data.restaurant,
        token,
        isAuthenticated: true,
      });
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      set({ partner: null, restaurant: null, token: null, isAuthenticated: false });
    }
  },
}));
