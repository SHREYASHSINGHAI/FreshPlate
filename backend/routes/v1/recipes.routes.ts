import { Router } from 'express';
import { generateRecipesController } from '../../controllers/recipes.controller';
import { generalRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

/**
 * @route   POST /api/v1/recipes/generate
 * @desc    Generate recipes prioritizing expiring pantry ingredients
 * @access  Public / Mobile
 */
router.post('/generate', generalRateLimiter, generateRecipesController);
router.post('/', generalRateLimiter, generateRecipesController);

export default router;
