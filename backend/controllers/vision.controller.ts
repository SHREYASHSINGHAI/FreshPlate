import { Request, Response, NextFunction } from 'express';
import {
  scanReceiptFromImage,
  scanFridgeFromImage,
  RECEIPT_RESPONSE_SCHEMA,
  FRIDGE_RESPONSE_SCHEMA
} from '../services/geminiVision.service';
import { config } from '../config/env';

/**
 * Extracts and validates base64 image data from either:
 * 1. Pre-validated request properties from validateImageInput middleware
 * 2. Multer multipart file upload (req.file)
 * 3. JSON request body ({ imageBase64, mimeType })
 */
function extractImageData(req: Request): { base64Data: string | null; mimeType: string; error?: string; statusCode?: number } {
  // Use pre-validated payload from middleware if available
  if ((req as any).cleanedBase64) {
    return {
      base64Data: (req as any).cleanedBase64,
      mimeType: (req as any).validatedMimeType || 'image/jpeg'
    };
  }

  let base64Data: string | null = null;
  let mimeType = 'image/jpeg';

  if (req.file) {
    if (req.file.size > config.uploadMaxSizeBytes) {
      return { base64Data: null, mimeType, error: 'File size too large. Maximum allowed size is 5MB.', statusCode: 413 };
    }
    if (req.file.buffer.length < 50) {
      return { base64Data: null, mimeType, error: 'Uploaded image file is empty or corrupted (< 50 bytes).', statusCode: 400 };
    }
    base64Data = req.file.buffer.toString('base64');
    mimeType = req.file.mimetype || 'image/jpeg';
  } else if (req.body?.imageBase64) {
    let rawBase64 = String(req.body.imageBase64).trim();
    if (rawBase64.startsWith('data:')) {
      const parts = rawBase64.split(';base64,');
      if (parts.length === 2) {
        mimeType = parts[0].replace('data:', '').toLowerCase();
        rawBase64 = parts[1];
      }
    } else if (rawBase64.includes(',')) {
      rawBase64 = rawBase64.split(',')[1];
    }

    if (rawBase64.length < 50) {
      return { base64Data: null, mimeType, error: 'imageBase64 payload is too short or invalid.', statusCode: 400 };
    }

    const padding = rawBase64.endsWith('==') ? 2 : rawBase64.endsWith('=') ? 1 : 0;
    const approximateByteLength = Math.floor((rawBase64.length * 3) / 4) - padding;
    if (approximateByteLength > config.uploadMaxSizeBytes) {
      return { base64Data: null, mimeType, error: 'Image size exceeds the maximum allowed limit of 5MB.', statusCode: 413 };
    }

    base64Data = rawBase64;
    mimeType = req.body.mimeType || mimeType;
  }

  return { base64Data, mimeType };
}

/**
 * GET /api/v1/scan-receipt
 * Endpoint discovery and schema documentation.
 */
export async function getScanReceiptDocs(req: Request, res: Response) {
  return res.status(200).json({
    status: 'ok',
    endpoint: '/api/v1/scan-receipt',
    description: 'Parses grocery bills and supermarket receipts using Gemini Vision, formatting raw items into normalized food names, categories, and estimated quantities.',
    supportedMethods: ['GET', 'POST'],
    supportedContentTypes: [
      'multipart/form-data (fields: "image", "file", "photo", "receipt")',
      'application/json (payload: { "imageBase64": "...", "mimeType": "image/jpeg" })'
    ],
    maxFileSize: '5MB',
    outputSchema: RECEIPT_RESPONSE_SCHEMA,
    usage: 'Send a POST request with an image file or JSON base64 string.'
  });
}

/**
 * POST /api/v1/scan-receipt
 * Uses Gemini Vision to parse grocery bills.
 */
export async function scanReceiptController(req: Request, res: Response, next: NextFunction) {
  try {
    const { base64Data, mimeType, error, statusCode } = extractImageData(req);

    if (error) {
      return res.status(statusCode || 400).json({ success: false, error });
    }

    if (!base64Data) {
      return res.status(400).json({
        success: false,
        error: 'No receipt image provided. Please upload a receipt file (multipart/form-data) or supply imageBase64 in JSON.'
      });
    }

    const result = await scanReceiptFromImage(base64Data, mimeType);

    // Blurry / unreadable image validation handling
    if (!result.quality.isUsable && result.count === 0) {
      return res.status(422).json({
        success: false,
        error: result.quality.warning || 'Receipt image is too blurry, dark, or illegible to parse.',
        quality: result.quality,
        advice: result.quality.advice || 'Please flatten the receipt under direct lighting and retake the photo.',
        items: []
      });
    }

    return res.status(200).json({
      success: true,
      storeName: result.storeName,
      transactionDate: result.transactionDate,
      currency: result.currency,
      totalAmount: result.totalAmount,
      quality: result.quality,
      count: result.count,
      items: result.items
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/scan-fridge
 * Endpoint discovery and schema documentation.
 */
export async function getScanFridgeDocs(req: Request, res: Response) {
  return res.status(200).json({
    status: 'ok',
    endpoint: '/api/v1/scan-fridge',
    description: 'Performs object recognition on refrigerator or pantry photos using Gemini Vision, returning identified items, spatial confidence levels, and likely storage locations.',
    supportedMethods: ['GET', 'POST'],
    supportedContentTypes: [
      'multipart/form-data (fields: "image", "file", "photo", "receipt")',
      'application/json (payload: { "imageBase64": "...", "mimeType": "image/jpeg" })'
    ],
    maxFileSize: '5MB',
    outputSchema: FRIDGE_RESPONSE_SCHEMA,
    usage: 'Send a POST request with a fridge photo or JSON base64 string.'
  });
}

/**
 * POST /api/v1/scan-fridge
 * Uses Gemini Vision to perform object recognition on fridge photos.
 */
export async function scanFridgeController(req: Request, res: Response, next: NextFunction) {
  try {
    const { base64Data, mimeType, error, statusCode } = extractImageData(req);

    if (error) {
      return res.status(statusCode || 400).json({ success: false, error });
    }

    if (!base64Data) {
      return res.status(400).json({
        success: false,
        error: 'No fridge photo provided. Please upload a fridge photo (multipart/form-data) or supply imageBase64 in JSON.'
      });
    }

    const result = await scanFridgeFromImage(base64Data, mimeType);

    // Low-light / blurry fridge image validation handling
    if (!result.quality.isUsable && result.count === 0) {
      return res.status(422).json({
        success: false,
        error: result.quality.warning || 'Fridge photo is too dark or blurry to identify food items.',
        quality: result.quality,
        advice: result.quality.advice || 'Please turn on the fridge interior light or room lights, and hold your device steady.',
        detectedItems: []
      });
    }

    return res.status(200).json({
      success: true,
      quality: result.quality,
      fridgeOverview: result.fridgeOverview,
      count: result.count,
      detectedItems: result.detectedItems
    });
  } catch (err) {
    next(err);
  }
}
