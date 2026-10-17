import { Request, Response, NextFunction } from 'express';
import { analyzeIngredientsFromImage } from '../services/geminiVision.service';

/**
 * Controller for POST /api/v1/analyze-ingredients
 * 
 * Supports both:
 * 1. Multipart form-data: file upload with field 'image' or 'file'
 * 2. JSON payload: { imageBase64: string, mimeType?: string }
 */
export async function analyzeIngredientsController(req: Request, res: Response, next: NextFunction) {
  try {
    let base64Data: string | null = null;
    let mimeType: string = 'image/jpeg';

    // Case 1: Uploaded via Multer multipart form-data
    if (req.file) {
      base64Data = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype || 'image/jpeg';
    } 
    // Case 2: JSON payload with base64 string
    else if (req.body?.imageBase64) {
      base64Data = req.body.imageBase64;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }
      mimeType = req.body.mimeType || 'image/jpeg';
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
