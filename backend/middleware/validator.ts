import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]);

/**
 * Validates image upload requests (both multipart/form-data and JSON base64).
 * Enforces:
 * 1. Presence of either a valid file upload or JSON imageBase64
 * 2. Strict 5MB file-size limit on both multipart files and base64 strings
 * 3. Whitelisted image MIME types (JPEG, PNG, WebP, HEIC/HEIF)
 * 4. Protection against corrupt or oversized payloads hitting Gemini API
 */
export function validateImageInput(req: Request, res: Response, next: NextFunction) {
  // Case 1: Uploaded via Multer multipart
  if (req.file) {
    if (req.file.size > config.uploadMaxSizeBytes) {
      return res.status(413).json({
        success: false,
        statusCode: 413,
        error: 'File size too large. Maximum allowed size is 5MB.'
      });
    }

    if (req.file.size < 50) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'Uploaded image file is empty or corrupted (< 50 bytes).'
      });
    }

    const mime = (req.file.mimetype || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: `Invalid file type: ${mime}. Allowed types: JPEG, PNG, WebP, HEIC, HEIF.`
      });
    }

    return next();
  }

  // Case 2: JSON payload with imageBase64
  if (req.body && typeof req.body.imageBase64 === 'string') {
    let rawBase64 = req.body.imageBase64.trim();
    let detectedMime = (req.body.mimeType || 'image/jpeg').toLowerCase();

    // Check if format contains data URI header: "data:image/png;base64,..."
    if (rawBase64.startsWith('data:')) {
      const parts = rawBase64.split(';base64,');
      if (parts.length === 2) {
        detectedMime = parts[0].replace('data:', '').toLowerCase();
        rawBase64 = parts[1];
      }
    } else if (rawBase64.includes(',')) {
      rawBase64 = rawBase64.split(',')[1];
    }

    if (rawBase64.length < 50) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'imageBase64 payload is too short or invalid (< 50 characters).'
      });
    }

    // Calculate approximate binary size from Base64 string length
    const padding = rawBase64.endsWith('==') ? 2 : rawBase64.endsWith('=') ? 1 : 0;
    const approximateByteLength = Math.floor((rawBase64.length * 3) / 4) - padding;

    if (approximateByteLength > config.uploadMaxSizeBytes) {
      return res.status(413).json({
        success: false,
        statusCode: 413,
        error: 'Image size exceeds the maximum allowed limit of 5MB.'
      });
    }

    if (!ALLOWED_MIME_TYPES.has(detectedMime)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: `Invalid mimeType: ${detectedMime}. Allowed types: image/jpeg, image/png, image/webp, image/heic.`
      });
    }

    // Attach cleaned base64 and detected mime to request for controller consumption
    (req as any).cleanedBase64 = rawBase64;
    (req as any).validatedMimeType = detectedMime;

    return next();
  }

  // Neither file nor imageBase64 provided
  return res.status(400).json({
    success: false,
    statusCode: 400,
    error: 'No image provided. Please upload an image file (multipart/form-data) or supply imageBase64 in JSON.'
  });
}

/**
 * Validates request payload for /api/v1/generate-recipes to prevent
 * prompt injection, malformed arrays, and runaway token consumption.
 */
export function validateGenerateRecipesRequest(req: Request, res: Response, next: NextFunction) {
  const { ingredients, cuisine, language, adults, children } = req.body || {};

  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      error: 'Invalid request: "ingredients" must be a non-empty array of pantry items.'
    });
  }

  if (ingredients.length === 0) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      error: 'Invalid request: "ingredients" array cannot be empty.'
    });
  }

  if (ingredients.length > 50) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      error: 'Invalid request: Maximum 50 ingredients allowed per recipe generation request.'
    });
  }

  for (let i = 0; i < ingredients.length; i++) {
    const item = ingredients[i];
    if (!item || typeof item !== 'object') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: `Invalid ingredient at index ${i}: item must be an object.`
      });
    }

    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name || name.length > 100) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: `Invalid ingredient at index ${i}: "name" is required and must be between 1 and 100 characters.`
      });
    }
  }

  if (cuisine !== undefined && (typeof cuisine !== 'string' || cuisine.length > 50)) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      error: 'Invalid "cuisine": must be a string up to 50 characters.'
    });
  }

  if (language !== undefined && (typeof language !== 'string' || language.length > 50)) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      error: 'Invalid "language": must be a string up to 50 characters.'
    });
  }

  if (adults !== undefined) {
    const parsedAdults = parseInt(String(adults), 10);
    if (isNaN(parsedAdults) || parsedAdults < 1 || parsedAdults > 20) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'Invalid "adults": must be an integer between 1 and 20.'
      });
    }
  }

  if (children !== undefined) {
    const parsedChildren = parseInt(String(children), 10);
    if (isNaN(parsedChildren) || parsedChildren < 0 || parsedChildren > 20) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'Invalid "children": must be an integer between 0 and 20.'
      });
    }
  }

  next();
}

/**
 * Validates request payload for /api/v1/receipts/parse-text to prevent
 * prompt injection, huge text blobs, and runaway AI token costs.
 */
export function validateParseOrderTextRequest(req: Request, res: Response, next: NextFunction) {
  const { text, source } = req.body || {};

  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      error: 'Invalid request: "text" is required and must be a string.'
    });
  }

  const trimmed = text.trim();
  if (trimmed.length < 5) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      error: 'Order text is too short to parse (minimum 5 characters).'
    });
  }

  // Maximum 15,000 characters to prevent prompt abuse & runaway token costs
  if (trimmed.length > 15000) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      error: 'Order text exceeds maximum length of 15,000 characters.'
    });
  }

  if (source !== undefined && (typeof source !== 'string' || source.length > 100)) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      error: 'Invalid "source": must be a string up to 100 characters.'
    });
  }

  next();
}

/**
 * Validates authorization header for Gmail receipt fetch requests.
 */
export function validateGmailReceiptsRequest(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      error: 'Missing or invalid Bearer authorization token.'
    });
  }

  const token = authHeader.split(' ')[1]?.trim();
  if (!token || token.length < 10 || token.length > 2048) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      error: 'Invalid bearer token format.'
    });
  }

  next();
}
