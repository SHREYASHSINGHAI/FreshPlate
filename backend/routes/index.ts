import { Router } from 'express';
import v1Router from './v1';
import { analyzeIngredientsController } from '../controllers/ingredients.controller';
import { generateRecipesController } from '../controllers/recipes.controller';
import { parseOrderTextController, fetchGmailReceiptsController } from '../controllers/receipts.controller';
import { visionRateLimiter, generalRateLimiter } from '../middleware/rateLimiter';
import { uploadMiddleware, flexibleImageUpload } from '../middleware/upload';

const rootRouter = Router();

// Health check endpoint
rootRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'FreshPlate Mobile Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Primary API v1 Router
rootRouter.use('/api/v1', v1Router);

// Backward-compatible legacy aliases (so existing web & mobile calls work without breaking)
rootRouter.post('/api/parse-image', visionRateLimiter, flexibleImageUpload, analyzeIngredientsController);
rootRouter.post('/api/generate-recipes', generalRateLimiter, generateRecipesController);
rootRouter.post('/api/parse-order', generalRateLimiter, parseOrderTextController);
rootRouter.post('/api/fetch-gmail-receipts', generalRateLimiter, fetchGmailReceiptsController);
rootRouter.use('/api/scan-receipt', (req, res, next) => {
  req.url = '/scan-receipt' + req.url.replace(/^\//, '');
  v1Router(req, res, next);
});
rootRouter.use('/api/scan-fridge', (req, res, next) => {
  req.url = '/scan-fridge' + req.url.replace(/^\//, '');
  v1Router(req, res, next);
});

export default rootRouter;
