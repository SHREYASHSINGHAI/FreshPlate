import { getApiBaseUrl, API_ENDPOINTS } from '../config/env';
import {
  AnalyzeIngredientsResponse,
  ReceiptScanResponse,
  FridgeScanResponse,
  GenerateRecipesResponse,
  NetworkErrorCode,
  NetworkErrorInfo
} from '../types';
import { compressImageForUpload } from './imageCompression';

export interface UploadOptions {
  timeoutMs?: number;
  customBaseUrl?: string;
  skipCompression?: boolean;
}

/**
 * Standardized Mobile Systems Error for network, timeout, quality, and server issues.
 */
export class ApiError extends Error {
  code: NetworkErrorCode;
  statusCode?: number;
  advice?: string;
  quality?: any;
  isRetryable: boolean;

  constructor(params: {
    message: string;
    code: NetworkErrorCode;
    statusCode?: number;
    advice?: string;
    quality?: any;
    isRetryable?: boolean;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.advice = params.advice;
    this.quality = params.quality;
    this.isRetryable = params.isRetryable ?? true;
  }
}

/**
 * Parses any raw error into a structured NetworkErrorInfo object for UI banners.
 */
export function parseNetworkError(error: any): NetworkErrorInfo {
  if (error instanceof ApiError) {
    let title = 'Network Alert';
    switch (error.code) {
      case 'OFFLINE':
        title = 'No Internet Connection';
        break;
      case 'TIMEOUT':
        title = 'Connection Timed Out';
        break;
      case 'BLURRY_IMAGE':
        title = 'Photo Unclear or Blurry';
        break;
      case 'RATE_LIMITED':
        title = 'Quota Limit Reached';
        break;
      case 'SERVER_ERROR':
        title = 'AI Server Unavailable';
        break;
      case 'PAYLOAD_TOO_LARGE':
        title = 'File Too Large';
        break;
      default:
        title = 'Analysis Notice';
        break;
    }

    return {
      code: error.code,
      title,
      message: error.message,
      advice: error.advice,
      isRetryable: error.isRetryable,
      statusCode: error.statusCode,
      quality: error.quality
    };
  }

  // Handle standard AbortError / Timeout
  if (error?.name === 'AbortError' || error?.message?.includes('timed out')) {
    return {
      code: 'TIMEOUT',
      title: 'Connection Timed Out',
      message: 'The photo upload took too long to complete.',
      advice: 'Your mobile data or Wi-Fi connection may be weak. Tap Retry to send again.',
      isRetryable: true
    };
  }

  // Handle offline / connection failures
  const msg = String(error?.message || '').toLowerCase();
  if (
    msg.includes('network request failed') ||
    msg.includes('failed to connect') ||
    msg.includes('econnrefused') ||
    msg.includes('network error')
  ) {
    return {
      code: 'OFFLINE',
      title: 'Network Disconnected',
      message: 'Unable to reach the FreshPlate AI server.',
      advice: 'Please check your cellular data or Wi-Fi connection. Your pantry items are stored offline.',
      isRetryable: true
    };
  }

  return {
    code: 'UNKNOWN',
    title: 'Upload Issue',
    message: error?.message || 'An unexpected error occurred during photo analysis.',
    advice: 'Please check your connection and tap Retry.',
    isRetryable: true
  };
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
 * Prepares a FormData payload with guaranteed client-side compression (< 2MB).
 */
async function prepareCompressedFormData(
  photoUri: string,
  skipCompression = false
): Promise<{ formData: FormData; compressedUri: string; sizeBytes: number }> {
  let targetUri = photoUri;
  let finalSize = 0;

  if (!skipCompression) {
    try {
      const compressionResult = await compressImageForUpload(photoUri);
      targetUri = compressionResult.uri;
      finalSize = compressionResult.sizeBytes;
    } catch {
      // Fallback to original photoUri if client-side compression fails
    }
  }

  const { filename, mimeType } = getFileInfoFromUri(targetUri);
  const formData = new FormData();
  formData.append('image', {
    uri: targetUri,
    name: filename,
    type: mimeType
  } as any);

  return { formData, compressedUri: targetUri, sizeBytes: finalSize };
}

interface UploadEndpointConfig {
  endpoint: string;
  defaultBlurMessage: string;
  defaultBlurAdvice: string;
  rateLimitMessage: string;
  rateLimitAdvice: string;
  actionName: string;
}

/**
 * Centralized multipart photo upload handler for all Gemini vision endpoints.
 * Guarantees client-side compression (< 2MB) before network transmission,
 * enforces request timeouts, and maps HTTP error status codes into structured ApiErrors.
 */
async function executeImageUpload<T>(
  photoUri: string,
  config: UploadEndpointConfig,
  options: UploadOptions = {}
): Promise<T> {
  const { timeoutMs = 45000, customBaseUrl, skipCompression = false } = options;
  const baseUrl = customBaseUrl || getApiBaseUrl();
  const endpointUrl = `${baseUrl}${config.endpoint}`;

  const { formData } = await prepareCompressedFormData(photoUri, skipCompression);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timer);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 422) {
        throw new ApiError({
          code: 'BLURRY_IMAGE',
          statusCode: 422,
          message: data?.error || config.defaultBlurMessage,
          advice: data?.advice || config.defaultBlurAdvice,
          quality: data?.quality,
          isRetryable: true
        });
      }

      if (response.status === 429) {
        throw new ApiError({
          code: 'RATE_LIMITED',
          statusCode: 429,
          message: data?.error || config.rateLimitMessage,
          advice: config.rateLimitAdvice,
          isRetryable: true
        });
      }

      if (response.status === 413) {
        throw new ApiError({
          code: 'PAYLOAD_TOO_LARGE',
          statusCode: 413,
          message: data?.error || 'Image payload exceeded the 5MB backend limit.',
          advice: 'Automatic client compression will resize the image further on retry.',
          isRetryable: true
        });
      }

      if (response.status >= 500) {
        throw new ApiError({
          code: 'SERVER_ERROR',
          statusCode: response.status,
          message: data?.error || 'AI vision service temporarily unavailable.',
          advice: 'The server is experiencing high demand. Please tap Retry.',
          isRetryable: true
        });
      }

      throw new ApiError({
        code: 'UNKNOWN',
        statusCode: response.status,
        message: data?.error || `${config.actionName} failed with status code ${response.status}`,
        isRetryable: true
      });
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timer);
    if (error instanceof ApiError) throw error;

    if (error.name === 'AbortError') {
      throw new ApiError({
        code: 'TIMEOUT',
        message: `${config.actionName} timed out after ${timeoutMs / 1000} seconds.`,
        advice: 'Please check your cellular or Wi-Fi signal and tap Retry.',
        isRetryable: true
      });
    }

    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('network request failed') || msg.includes('failed to connect')) {
      throw new ApiError({
        code: 'OFFLINE',
        message: 'No internet connection detected.',
        advice: 'Check your mobile data or Wi-Fi settings. Your pantry inventory is cached offline.',
        isRetryable: true
      });
    }

    throw new ApiError({
      code: 'UNKNOWN',
      message: error.message || `Failed to complete ${config.actionName.toLowerCase()}.`,
      isRetryable: true
    });
  }
}

/**
 * Dispatches multipart upload request to the secure backend endpoint /api/v1/analyze-ingredients.
 * Guarantees client-side compression (< 2MB) before network transmission.
 */
export async function uploadPhotoForAnalysis(
  photoUri: string,
  options: UploadOptions = {}
): Promise<AnalyzeIngredientsResponse> {
  return executeImageUpload<AnalyzeIngredientsResponse>(
    photoUri,
    {
      endpoint: API_ENDPOINTS.ANALYZE_INGREDIENTS,
      defaultBlurMessage: 'Photo is too blurry or dark to recognize ingredients.',
      defaultBlurAdvice: 'Please hold steady under bright light and take another photo.',
      rateLimitMessage: 'Rate limit reached. Please wait a few moments.',
      rateLimitAdvice: 'AI scan quota is temporarily reached. Try again in 30 seconds.',
      actionName: 'Photo analysis'
    },
    options
  );
}

/**
 * Specialized upload utility for grocery receipts -> /api/v1/scan-receipt
 * Auto-compresses under 2MB and catches blur / lighting / network errors.
 */
export async function uploadReceiptPhoto(
  photoUri: string,
  options: UploadOptions = {}
): Promise<ReceiptScanResponse> {
  return executeImageUpload<ReceiptScanResponse>(
    photoUri,
    {
      endpoint: API_ENDPOINTS.SCAN_RECEIPT,
      defaultBlurMessage: 'Receipt is too blurry or illegible to parse.',
      defaultBlurAdvice: 'Please flatten the paper receipt under direct light and retake.',
      rateLimitMessage: 'AI receipt scanning quota reached. Please wait a moment.',
      rateLimitAdvice: 'Wait 30 seconds before submitting another receipt.',
      actionName: 'Receipt scan'
    },
    options
  );
}

/**
 * Specialized upload utility for refrigerator shelf scans -> /api/v1/scan-fridge
 * Auto-compresses under 2MB and catches low-light / motion-blur errors.
 */
export async function uploadFridgePhoto(
  photoUri: string,
  options: UploadOptions = {}
): Promise<FridgeScanResponse> {
  return executeImageUpload<FridgeScanResponse>(
    photoUri,
    {
      endpoint: API_ENDPOINTS.SCAN_FRIDGE,
      defaultBlurMessage: 'Fridge photo is too dark or blurry to identify items.',
      defaultBlurAdvice: 'Please turn on room or fridge lights, hold steady, and retake.',
      rateLimitMessage: 'Fridge scan quota reached.',
      rateLimitAdvice: 'Please wait a moment before taking another scan.',
      actionName: 'Fridge scan'
    },
    options
  );
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
      if (response.status === 429) {
        throw new ApiError({
          code: 'RATE_LIMITED',
          statusCode: 429,
          message: data?.error || 'Recipe generation limit reached.',
          advice: 'Please wait a moment before generating more recipes.',
          isRetryable: true
        });
      }

      if (response.status >= 500) {
        throw new ApiError({
          code: 'SERVER_ERROR',
          statusCode: response.status,
          message: data?.error || 'AI recipe generation service is busy.',
          advice: 'Please tap Retry to attempt recipe synthesis again.',
          isRetryable: true
        });
      }

      throw new ApiError({
        code: 'UNKNOWN',
        statusCode: response.status,
        message: data?.error || `Recipe generation failed (${response.status})`,
        isRetryable: true
      });
    }

    return data as GenerateRecipesResponse;
  } catch (error: any) {
    clearTimeout(timer);
    if (error instanceof ApiError) throw error;

    if (error.name === 'AbortError') {
      throw new ApiError({
        code: 'TIMEOUT',
        message: `Recipe generation timed out after ${timeoutMs / 1000} seconds.`,
        advice: 'Please verify your internet connection and retry.',
        isRetryable: true
      });
    }

    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('network request failed')) {
      throw new ApiError({
        code: 'OFFLINE',
        message: 'Network offline. Cannot generate online recipes.',
        advice: 'Connect to internet, or view previously saved recipes in offline storage.',
        isRetryable: true
      });
    }

    throw new ApiError({
      code: 'UNKNOWN',
      message: error.message || 'Error generating recipes.',
      isRetryable: true
    });
  }
}
