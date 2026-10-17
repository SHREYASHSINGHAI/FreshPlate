import { Router } from 'express';
import ingredientsRoutes from './ingredients.routes';
import visionRoutes from './vision.routes';
import recipesRoutes from './recipes.routes';
import receiptsRoutes from './receipts.routes';
import { getHealthStatus } from '../../controllers/health.controller';

const v1Router = Router();

/**
 * Health check status monitoring endpoints
 * GET /api/v1/health  -> JSON status, uptime, system metrics, dependencies
 * HEAD /api/v1/health -> Lightweight HTTP 200 ping for container probes
 */
v1Router.get('/health', getHealthStatus);
v1Router.head('/health', getHealthStatus);

// /api/v1/analyze-ingredients
v1Router.use('/', ingredientsRoutes);

// /api/v1/scan-receipt & /api/v1/scan-fridge
v1Router.use('/', visionRoutes);

// /api/v1/recipes & /api/v1/generate-recipes
v1Router.use('/recipes', recipesRoutes);
v1Router.use('/generate-recipes', recipesRoutes);

// /api/v1/receipts
v1Router.use('/receipts', receiptsRoutes);

export default v1Router;
