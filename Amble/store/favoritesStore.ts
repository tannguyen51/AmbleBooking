import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { userAPI } from "../services/api";

export interface FavoriteRestaurant {
  _id: string;
  name: string;
  cuisine?: string;
  location?: string;
  city?: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  images?: string[];
  tags?: string[];
  categories?: string[];
  openTime?: string;
  closeTime?: string;
  hasParking?: boolean;
  isFeatured?: boolean;
  subscriptionPackage?: "basic" | "standard";
}

interface FavoritesState {
  favorites: FavoriteRestaurant[];
  isSyncing: boolean;
  isFavorite: (restaurantId: string) => boolean;
  toggleFavorite: (restaurant: FavoriteRestaurant) => void;
  toggleFavoriteWithServer: (restaurant: FavoriteRestaurant) => Promise<void>;
  syncFavoritesFromServer: () => Promise<void>;
  removeFavorite: (restaurantId: string) => void;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      isSyncing: false,

      isFavorite: (restaurantId) =>
        get().favorites.some((item) => item._id === restaurantId),

      toggleFavorite: (restaurant) => {
        const exists = get().favorites.some(
          (item) => item._id === restaurant._id,
        );

        if (exists) {
          set((state) => ({
            favorites: state.favorites.filter(
              (item) => item._id !== restaurant._id,
            ),
          }));
          return;
        }

        set((state) => ({
          favorites: [restaurant, ...state.favorites],
        }));
      },

      toggleFavoriteWithServer: async (restaurant) => {
        const snapshot = get().favorites;
        get().toggleFavorite(restaurant);

        try {
          const res = await userAPI.toggleFavoriteRestaurant(restaurant._id);
          const serverFavorites = res.data?.favorites;
          if (Array.isArray(serverFavorites)) {
            set({ favorites: serverFavorites });
          }
        } catch (error) {
          set({ favorites: snapshot });
          throw error;
        }
      },

      syncFavoritesFromServer: async () => {
        set({ isSyncing: true });
        try {
          const res = await userAPI.getFavoriteRestaurants();
          const serverFavorites = res.data?.favorites;
          if (Array.isArray(serverFavorites)) {
            set({ favorites: serverFavorites });
          }
        } catch {
          // Giữ fallback local nếu API lỗi.
        } finally {
          set({ isSyncing: false });
        }
      },

      removeFavorite: (restaurantId) => {
        set((state) => ({
          favorites: state.favorites.filter(
            (item) => item._id !== restaurantId,
          ),
        }));
      },

      clearFavorites: () => set({ favorites: [] }),
    }),
    {
      name: "amble_favorites",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ favorites: state.favorites }),
    },
  ),
);
