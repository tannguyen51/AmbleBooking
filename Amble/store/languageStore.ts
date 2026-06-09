import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppLanguage = "vi" | "en" | "zh" | "ko" | "ja" | "other";

interface LanguageState {
  language: AppLanguage | null;
  isLanguageReady: boolean;
  loadLanguage: () => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
}

const LANGUAGE_KEY = "amble_language";

export const useLanguageStore = create<LanguageState>((set) => ({
  language: null,
  isLanguageReady: false,

  loadLanguage: async () => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (
        saved === "vi" ||
        saved === "en" ||
        saved === "zh" ||
        saved === "ko" ||
        saved === "ja" ||
        saved === "other"
      ) {
        set({ language: saved, isLanguageReady: true });
        return;
      }
      // Không có ngôn ngữ lưu → mặc định tiếng Việt
      set({ language: "vi", isLanguageReady: true });
    } catch {
      set({ language: "vi", isLanguageReady: true });
    }
  },

  setLanguage: async (language) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    set({ language, isLanguageReady: true });
  },
}));
