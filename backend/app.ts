import express, { Application } from 'express';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import rootRouter from './routes';

export function createApp(): Application {
  const app = express();

  // 1. Cross-Origin Resource Sharing (CORS)
  app.use(corsMiddleware);

  // 2. Body parsers (JSON & URL-encoded)
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // 3. Mount all API Routes
  app.use(rootRouter);

  // 4. Global Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
