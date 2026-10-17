import { Request, Response, NextFunction } from 'express';
import { generateRecipesService } from '../services/recipe.service';

export async function generateRecipesController(req: Request, res: Response, next: NextFunction) {
  try {
    const { ingredients, cuisine, language, adults, children } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a non-empty array of pantry ingredients.'
      });
    }

    const result = await generateRecipesService({
      ingredients,
      cuisine,
      language,
      adults: adults ? parseInt(adults, 10) : 2,
      children: children ? parseInt(children, 10) : 0
    });

    return res.status(200).json({
      success: true,
      cached: result.cached,
      recipes: result.recipes
    });
  } catch (error) {
    next(error);
  }
}
