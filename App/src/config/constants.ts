import Constants from 'expo-constants';

/** Base URL for MongoDB-backed API (HTTPS). Override with EXPO_PUBLIC_API_URL. */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-three-sepia-51.vercel.app/api';

export const APP_VERSION =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

/** Optional web URL for forgot-password flow */
export const FORGOT_PASSWORD_URL = process.env.EXPO_PUBLIC_FORGOT_PASSWORD_URL ?? '';
