import { Request, Response, NextFunction } from 'express';
import { analyzeIngredientsFromImage } from '../services/geminiVision.service';
import { extractImageData } from '../utils/imageUtils';

/**
 * Controller for POST /api/v1/analyze-ingredients
 * 
 * Supports both:
 * 1. Multipart form-data: file upload with field 'image' or 'file'
 * 2. JSON payload: { imageBase64: string, mimeType?: string }
 */
export async function analyzeIngredientsController(req: Request, res: Response, next: NextFunction) {
  try {
    const { base64Data, mimeType, error, statusCode } = extractImageData(req);

    if (error) {
      return res.status(statusCode || 400).json({ success: false, error });
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
