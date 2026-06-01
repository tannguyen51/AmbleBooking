declare namespace NodeJS {
  interface ProcessEnv {
    APP_ENV?: "staging" | "production";
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_SENTRY_DSN?: string;
  }
}

