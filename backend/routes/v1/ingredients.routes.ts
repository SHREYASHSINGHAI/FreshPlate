import { Router } from 'express';
import { analyzeIngredientsController } from '../../controllers/ingredients.controller';
import { visionRateLimiter } from '../../middleware/rateLimiter';
import { uploadMiddleware } from '../../middleware/upload';

const router = Router();

/**
 * @route   POST /api/v1/analyze-ingredients
 * @desc    Analyze grocery receipt or fridge/pantry photo using Gemini Vision
 * @access  Public / Mobile
 * @content Multipart form-data ('image') OR JSON ({ imageBase64, mimeType })
 */
router.post(
  '/analyze-ingredients',
  visionRateLimiter,
  uploadMiddleware.single('image'),
  analyzeIngredientsController
);

export default router;
