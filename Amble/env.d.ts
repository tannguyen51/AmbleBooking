declare namespace NodeJS {
  interface ProcessEnv {
    APP_ENV?: "staging" | "production";
    EXPO_PUBLIC_API_URL?: string;
  }
}

