import { useLanguageStore } from "../store/languageStore";
import translations, { type Language, type TranslationKey } from "./translations";

const SUPPORTED: Language[] = ["vi", "en", "zh", "ko", "ja"];

export function useTranslation() {
  const { language } = useLanguageStore();

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    // Lấy bản dịch của ngôn ngữ hiện tại, fallback về en, rồi về vi
    let text = translations[language]?.[key];
    if (!text) text = translations.en?.[key];
    if (!text) text = translations.vi?.[key];
    if (!text) text = key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  const isEnglish = language === "en";

  return { t, isEnglish, language };
}

export type { TranslationKey };
