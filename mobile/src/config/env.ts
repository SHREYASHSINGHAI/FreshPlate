import { Platform } from 'react-native';

/**
 * Resolves the backend server API host based on execution environment:
 * - Android Emulator maps host machine to 10.0.2.2
 * - iOS Simulator maps host machine to localhost
 * - Physical devices can supply their LAN IP (e.g. 192.168.1.x)
 */
export function getApiBaseUrl(): string {
  // Can be configured dynamically or read from Expo Constants / Env
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  // Production mobile backend URL
  return 'https://api.freshplate.app';
}

export const API_ENDPOINTS = {
  ANALYZE_INGREDIENTS: '/api/v1/analyze-ingredients',
  GENERATE_RECIPES: '/api/v1/generate-recipes',
  SCAN_RECEIPT: '/api/v1/scan-receipt',
  SCAN_FRIDGE: '/api/v1/scan-fridge'
} as const;
