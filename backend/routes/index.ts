import { Router } from 'express';
import v1Router from './v1';
import { analyzeIngredientsController } from '../controllers/ingredients.controller';
import { generateRecipesController } from '../controllers/recipes.controller';
import { parseOrderTextController, fetchGmailReceiptsController } from '../controllers/receipts.controller';
import { visionRateLimiter, generalRateLimiter, aiRecipeRateLimiter, globalRateLimiter } from '../middleware/rateLimiter';
import { flexibleImageUpload } from '../middleware/upload';
import {
  validateImageInput,
  validateGenerateRecipesRequest,
  validateParseOrderTextRequest,
  validateGmailReceiptsRequest
} from '../middleware/validator';
import { getHealthStatus } from '../controllers/health.controller';

const rootRouter = Router();

/**
 * Root Health check endpoint for uptime probes & load balancers
 * GET /health and HEAD /health
 */
rootRouter.get('/health', getHealthStatus);
rootRouter.head('/health', getHealthStatus);

// Apply baseline global rate limiter to all API traffic
rootRouter.use('/api', globalRateLimiter);

// Primary API v1 Router: includes /api/v1/health, /api/v1/analyze-ingredients, etc.
rootRouter.use('/api/v1', v1Router);

// Backward-compatible legacy aliases (so existing web & mobile calls work seamlessly)
rootRouter.post(
  '/api/parse-image',
  visionRateLimiter,
  flexibleImageUpload,
  validateImageInput,
  analyzeIngredientsController
);

rootRouter.post(
  '/api/generate-recipes',
  aiRecipeRateLimiter,
  validateGenerateRecipesRequest,
  generateRecipesController
);

rootRouter.post(
  '/api/parse-order',
  aiRecipeRateLimiter,
  validateParseOrderTextRequest,
  parseOrderTextController
);

rootRouter.post(
  '/api/fetch-gmail-receipts',
  generalRateLimiter,
  validateGmailReceiptsRequest,
  fetchGmailReceiptsController
);

rootRouter.use('/api/scan-receipt', (req, res, next) => {
  req.url = '/scan-receipt' + req.url.replace(/^\//, '');
  v1Router(req, res, next);
});

rootRouter.use('/api/scan-fridge', (req, res, next) => {
  req.url = '/scan-fridge' + req.url.replace(/^\//, '');
  v1Router(req, res, next);
});

export default rootRouter;
