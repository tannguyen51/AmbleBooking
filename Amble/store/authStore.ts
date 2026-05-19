import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await authAPI.login({ email, password });
      const { token, user } = res.data;

      await AsyncStorage.setItem('amble_token', token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      const message =
        error.response?.data?.message || 'Login failed. Please try again.';
      throw new Error(message);
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await authAPI.register(data);
      const { token, user } = res.data;

      await AsyncStorage.setItem('amble_token', token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      const message =
        error.response?.data?.message || 'Registration failed. Please try again.';
      throw new Error(message);
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('amble_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem('amble_token');
      if (!token) return;

      const res = await authAPI.getMe();
      set({ user: res.data.user, token, isAuthenticated: true });
    } catch {
      await AsyncStorage.removeItem('amble_token');
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
      const message = error.response?.data?.message || 'Update failed.';
      throw new Error(message);
    }
  },

}));