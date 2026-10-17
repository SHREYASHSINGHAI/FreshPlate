import { Router } from 'express';
import { analyzeIngredientsController } from '../../controllers/ingredients.controller';
import { visionRateLimiter } from '../../middleware/rateLimiter';
import { flexibleImageUpload } from '../../middleware/upload';
import { validateImageInput } from '../../middleware/validator';

const router = Router();

/**
 * @route   POST /api/v1/analyze-ingredients
 * @desc    Analyze grocery receipt or fridge/pantry photo using Gemini Vision
 * @access  Public / Mobile
 * @content Multipart form-data ('image' / 'file' / 'photo') OR JSON ({ imageBase64, mimeType })
 */
router.post(
  '/analyze-ingredients',
  visionRateLimiter,
  flexibleImageUpload,
  validateImageInput,
  analyzeIngredientsController
);

export default router;
