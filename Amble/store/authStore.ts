import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authAPI, userAPI } from '../services/api';

interface User {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar?: string;
  role: string;
  totalWalks: number;
  totalDistance: number;
  favoriteRoutes: any[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  register: (data: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const TOKEN_KEY = 'amble_token';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await authAPI.login({ email, password });
      const { token, user } = res.data;

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.message || error.message || 'Login failed.';
      throw new Error(message);
    }
  },

  loginWithToken: async (token) => {
    set({ isLoading: true });
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      const res = await authAPI.getMe();
      set({ user: res.data.user, token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      throw new Error(error.response?.data?.message || 'Google login failed.');
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await authAPI.register(data);
      const { token, user } = res.data;

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.message || 'Registration failed.';
      throw new Error(message);
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return;

      const res = await authAPI.getMe();
      set({ user: res.data.user, token, isAuthenticated: true });
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  updateUser: async (data) => {
    set({ isLoading: true });
    try {
      const res = await userAPI.updateProfile(data);
      set({ user: res.data.user, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.message || 'Update failed.');
    }
  },
}));
