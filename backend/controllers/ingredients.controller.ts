import { Request, Response, NextFunction } from 'express';
import { analyzeIngredientsFromImage } from '../services/geminiVision.service';
import { config } from '../config/env';

/**
 * Controller for POST /api/v1/analyze-ingredients
 * 
 * Supports both:
 * 1. Multipart form-data: file upload with field 'image' or 'file'
 * 2. JSON payload: { imageBase64: string, mimeType?: string }
 */
export async function analyzeIngredientsController(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Check if already pre-validated by validateImageInput middleware
    if ((req as any).cleanedBase64) {
      const base64Data = (req as any).cleanedBase64;
      const mimeType = (req as any).validatedMimeType || 'image/jpeg';
      const ingredients = await analyzeIngredientsFromImage(base64Data, mimeType);
      return res.status(200).json({
        success: true,
        count: ingredients.length,
        ingredients
      });
    }

    let base64Data: string | null = null;
    let mimeType: string = 'image/jpeg';

    // Case 1: Uploaded via Multer multipart form-data
    if (req.file) {
      if (req.file.size > config.uploadMaxSizeBytes) {
        return res.status(413).json({
          success: false,
          error: 'File size too large. Maximum allowed size is 5MB.'
        });
      }
      base64Data = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype || 'image/jpeg';
    } 
    // Case 2: JSON payload with base64 string
    else if (req.body?.imageBase64) {
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

      const padding = rawBase64.endsWith('==') ? 2 : rawBase64.endsWith('=') ? 1 : 0;
      const approximateByteLength = Math.floor((rawBase64.length * 3) / 4) - padding;
      if (approximateByteLength > config.uploadMaxSizeBytes) {
        return res.status(413).json({
          success: false,
          error: 'Image size exceeds the maximum allowed limit of 5MB.'
        });
      }

      base64Data = rawBase64;
      mimeType = req.body.mimeType || mimeType;
    }

    if (!base64Data) {
      return res.status(400).json({
        success: false,
        error: 'No image provided. Please upload an image file (multipart/form-data) or supply imageBase64 in JSON.'
      });
    }

    const ingredients = await analyzeIngredientsFromImage(base64Data, mimeType);

    return res.status(200).json({
      success: true,
      count: ingredients.length,
      ingredients
    });
  } catch (error) {
    next(error);
  }
}
