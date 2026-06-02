declare namespace NodeJS {
  interface ProcessEnv {
    APP_ENV?: "staging" | "production";
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_SENTRY_DSN?: string;
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
  }
}
