import { Router } from 'express';
import ingredientsRoutes from './ingredients.routes';
import recipesRoutes from './recipes.routes';
import receiptsRoutes from './receipts.routes';

const v1Router = Router();

// /api/v1/analyze-ingredients
v1Router.use('/', ingredientsRoutes);

// /api/v1/recipes
v1Router.use('/recipes', recipesRoutes);

// /api/v1/receipts
v1Router.use('/receipts', receiptsRoutes);

export default v1Router;
