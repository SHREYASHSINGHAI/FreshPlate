import { Platform } from 'react-native';
import { getApiBaseUrl, API_ENDPOINTS } from '../config/env';
import {
  AnalyzeIngredientsResponse,
  ReceiptScanResponse,
  FridgeScanResponse,
  GenerateRecipesResponse
} from '../types';

export interface UploadOptions {
  timeoutMs?: number;
  customBaseUrl?: string;
}

/**
 * Extracts a normalized filename and MIME type from a local device photo URI.
 */
function getFileInfoFromUri(uri: string): { filename: string; mimeType: string } {
  const parts = uri.split('/');
  const rawFilename = parts[parts.length - 1] || `photo_${Date.now()}.jpg`;
  const cleanFilename = rawFilename.split('?')[0];
  const ext = (cleanFilename.split('.').pop() || 'jpg').toLowerCase();

  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif'
  };

  return {
    filename: cleanFilename,
    mimeType: mimeMap[ext] || 'image/jpeg'
  };
}

/**
 * Converts a captured photo URI into a multipart FormData payload and dispatches
 * the request to the secure backend endpoint /api/v1/analyze-ingredients.
 * 
 * @param photoUri Local file URI from expo-camera or expo-image-picker
 * @param options Timeout and custom URL overrides
 */
export async function uploadPhotoForAnalysis(
  photoUri: string,
  options: UploadOptions = {}
): Promise<AnalyzeIngredientsResponse> {
  const { timeoutMs = 45000, customBaseUrl } = options;
  const baseUrl = customBaseUrl || getApiBaseUrl();
  const endpointUrl = `${baseUrl}${API_ENDPOINTS.ANALYZE_INGREDIENTS}`;

  const { filename, mimeType } = getFileInfoFromUri(photoUri);

  // 1. Build multipart/form-data payload for React Native native fetch
  const formData = new FormData();
  formData.append('image', {
    uri: photoUri,
    name: filename,
    type: mimeType
  } as any);

  // 2. Setup AbortController for timeout protection
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        // Note: Do NOT explicitly set 'Content-Type' so the runtime appends multipart boundary
      },
      signal: controller.signal
    });

    clearTimeout(timer);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.error || `Upload failed with status code ${response.status}`;
      throw new Error(errorMessage);
    }

    return data as AnalyzeIngredientsResponse;
  } catch (error: any) {
    clearTimeout(timer);

    if (error.name === 'AbortError') {
      throw new Error(`Upload request timed out after ${timeoutMs / 1000} seconds. Please check your network connection.`);
    }

    console.error('[FreshPlate Mobile API] Error uploading photo:', error);
    throw error;
  }
}

/**
 * Specialized upload utility for grocery receipts -> /api/v1/scan-receipt
 */
export async function uploadReceiptPhoto(
  photoUri: string,
  options: UploadOptions = {}
): Promise<ReceiptScanResponse> {
  const { timeoutMs = 45000, customBaseUrl } = options;
  const baseUrl = customBaseUrl || getApiBaseUrl();
  const endpointUrl = `${baseUrl}${API_ENDPOINTS.SCAN_RECEIPT}`;

  const { filename, mimeType } = getFileInfoFromUri(photoUri);
  const formData = new FormData();
  formData.append('image', {
    uri: photoUri,
    name: filename,
    type: mimeType
  } as any);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timer);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || `Receipt scan failed (HTTP ${response.status})`);
    }

    return data as ReceiptScanResponse;
  } catch (error: any) {
    clearTimeout(timer);
    throw error;
  }
}

/**
 * Specialized upload utility for refrigerator shelf scans -> /api/v1/scan-fridge
 */
export async function uploadFridgePhoto(
  photoUri: string,
  options: UploadOptions = {}
): Promise<FridgeScanResponse> {
  const { timeoutMs = 45000, customBaseUrl } = options;
  const baseUrl = customBaseUrl || getApiBaseUrl();
  const endpointUrl = `${baseUrl}${API_ENDPOINTS.SCAN_FRIDGE}`;

  const { filename, mimeType } = getFileInfoFromUri(photoUri);
  const formData = new FormData();
  formData.append('image', {
    uri: photoUri,
    name: filename,
    type: mimeType
  } as any);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timer);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || `Fridge scan failed (HTTP ${response.status})`);
    }

    return data as FridgeScanResponse;
  } catch (error: any) {
    clearTimeout(timer);
    throw error;
  }
}

export interface GenerateRecipesOptions {
  cuisine?: string;
  language?: string;
  adults?: number;
  children?: number;
  timeoutMs?: number;
  customBaseUrl?: string;
}

/**
 * Sends confirmed pantry items to POST /api/v1/generate-recipes
 * to produce personalized recipes matching pantry stock and expiring items.
 */
export async function generateRecipesFromPantry(
  items: Array<{ id: string; name: string; quantity: string; status?: string; category?: string }>,
  options: GenerateRecipesOptions = {}
): Promise<GenerateRecipesResponse> {
  const {
    timeoutMs = 60000,
    customBaseUrl,
    cuisine = 'Any',
    language = 'English',
    adults = 2,
    children = 0
  } = options;
  const baseUrl = customBaseUrl || getApiBaseUrl();
  const endpointUrl = `${baseUrl}${API_ENDPOINTS.GENERATE_RECIPES}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payloadIngredients = items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity || '1 portion',
      status: item.status || 'fresh',
      category: item.category || 'Pantry'
    }));

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        ingredients: payloadIngredients,
        cuisine,
        language,
        adults,
        children
      }),
      signal: controller.signal
    });

    clearTimeout(timer);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || `Recipe generation failed with status ${response.status}`);
    }

    return data as GenerateRecipesResponse;
  } catch (error: any) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      throw new Error(`Recipe generation timed out after ${timeoutMs / 1000} seconds. Please verify your connection.`);
    }
    console.error('[FreshPlate Mobile API] Error generating recipes:', error);
    throw error;
  }
}
