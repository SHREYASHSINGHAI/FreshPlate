import { Router } from 'express';
import { generateRecipesController } from '../../controllers/recipes.controller';
import { aiRecipeRateLimiter } from '../../middleware/rateLimiter';
import { validateGenerateRecipesRequest } from '../../middleware/validator';

const router = Router();

/**
 * @route   POST /api/v1/recipes/generate
 * @route   POST /api/v1/recipes
 * @route   POST /api/v1/generate-recipes
 * @desc    Generate recipes prioritizing expiring pantry ingredients with AI rate limiting & request validation
 * @access  Public / Mobile
 */
router.post('/generate', aiRecipeRateLimiter, validateGenerateRecipesRequest, generateRecipesController);
router.post('/', aiRecipeRateLimiter, validateGenerateRecipesRequest, generateRecipesController);

export default router;
