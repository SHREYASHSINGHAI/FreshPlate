import { Request, Response, NextFunction } from 'express';
import {
  scanReceiptFromImage,
  scanFridgeFromImage,
  RECEIPT_RESPONSE_SCHEMA,
  FRIDGE_RESPONSE_SCHEMA
} from '../services/geminiVision.service';

/**
 * Extracts and validates base64 image data from either:
 * 1. Multer multipart file upload (req.file)
 * 2. JSON request body ({ imageBase64, mimeType })
 */
function extractImageData(req: Request): { base64Data: string | null; mimeType: string; error?: string } {
  let base64Data: string | null = null;
  let mimeType = 'image/jpeg';

  if (req.file) {
    if (req.file.buffer.length < 50) {
      return { base64Data: null, mimeType, error: 'Uploaded image file is empty or corrupted (< 50 bytes).' };
    }
    base64Data = req.file.buffer.toString('base64');
    mimeType = req.file.mimetype || 'image/jpeg';
  } else if (req.body?.imageBase64) {
    base64Data = req.body.imageBase64;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }
    if (base64Data.length < 50) {
      return { base64Data: null, mimeType, error: 'imageBase64 payload is too short or invalid.' };
    }
    mimeType = req.body.mimeType || 'image/jpeg';
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
    maxFileSize: '15MB',
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
    const { base64Data, mimeType, error } = extractImageData(req);

    if (error) {
      return res.status(400).json({ success: false, error });
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
    maxFileSize: '15MB',
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
    const { base64Data, mimeType, error } = extractImageData(req);

    if (error) {
      return res.status(400).json({ success: false, error });
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
