# Amble Mobile App

## Environments

This project is configured for 2 deployment environments:

1. `staging` for internal QA/closed testing
2. `production` for Google Play release

## Environment Variables

Use HTTPS API URLs for release builds.

Example (`.env`):

```env
APP_ENV=staging
EXPO_PUBLIC_API_URL=https://api-staging.amble.vn/api
```

## EAS Build Commands

```bash
eas build --platform android --profile staging
eas build --platform android --profile production
```

## Submit to Google Play

```bash
eas submit --platform android --profile production
```

