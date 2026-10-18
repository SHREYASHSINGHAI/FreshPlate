import { Request } from 'express';
import { config } from '../config/env';

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]);

export interface ExtractedImageData {
  base64Data: string | null;
  mimeType: string;
  error?: string;
  statusCode?: number;
}

/**
 * Parses and strips Data URI scheme prefixes (e.g. "data:image/png;base64,...")
 * returning the normalized raw Base64 string and any embedded MIME type.
 */
export function parseBase64DataUri(input: string): { cleanedBase64: string; detectedMime: string | null } {
  let cleaned = input.trim();
  let detectedMime: string | null = null;

  if (cleaned.startsWith('data:')) {
    const parts = cleaned.split(';base64,');
    if (parts.length === 2) {
      detectedMime = parts[0].replace('data:', '').toLowerCase();
      cleaned = parts[1];
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.split(',')[1];
  }

  return { cleanedBase64: cleaned, detectedMime };
}

/**
 * Calculates the approximate binary byte length of a Base64-encoded string,
 * taking standard '=' padding characters into account.
 */
export function calculateBase64ByteLength(base64Str: string): number {
  const padding = base64Str.endsWith('==') ? 2 : base64Str.endsWith('=') ? 1 : 0;
  return Math.floor((base64Str.length * 3) / 4) - padding;
}

/**
 * Extracts and normalizes Base64 image data from either:
 * 1. Pre-validated request properties from validateImageInput middleware
 * 2. Multer multipart file upload (req.file)
 * 3. JSON request body ({ imageBase64, mimeType })
 */
export function extractImageData(req: Request): ExtractedImageData {
  // 1. Fast-path: use pre-validated payload from middleware if available
  if ((req as any).cleanedBase64) {
    return {
      base64Data: (req as any).cleanedBase64,
      mimeType: (req as any).validatedMimeType || 'image/jpeg'
    };
  }

  let base64Data: string | null = null;
  let mimeType = 'image/jpeg';

  // 2. Case: Multer multipart form upload
  if (req.file) {
    if (req.file.size > config.uploadMaxSizeBytes) {
      return {
        base64Data: null,
        mimeType,
        error: 'File size too large. Maximum allowed size is 5MB.',
        statusCode: 413
      };
    }
    if (req.file.buffer.length < 50) {
      return {
        base64Data: null,
        mimeType,
        error: 'Uploaded image file is empty or corrupted (< 50 bytes).',
        statusCode: 400
      };
    }
    base64Data = req.file.buffer.toString('base64');
    mimeType = req.file.mimetype || 'image/jpeg';
  }
  // 3. Case: JSON payload with imageBase64
  else if (req.body?.imageBase64) {
    const { cleanedBase64, detectedMime } = parseBase64DataUri(String(req.body.imageBase64));

    if (cleanedBase64.length < 50) {
      return {
        base64Data: null,
        mimeType,
        error: 'imageBase64 payload is too short or invalid.',
        statusCode: 400
      };
    }

    const approximateByteLength = calculateBase64ByteLength(cleanedBase64);
    if (approximateByteLength > config.uploadMaxSizeBytes) {
      return {
        base64Data: null,
        mimeType,
        error: 'Image size exceeds the maximum allowed limit of 5MB.',
        statusCode: 413
      };
    }

    base64Data = cleanedBase64;
    mimeType = req.body.mimeType || detectedMime || mimeType;
  }

  return { base64Data, mimeType };
}
