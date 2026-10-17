import express, { Application } from 'express';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import rootRouter from './routes';

export function createApp(): Application {
  const app = express();

  // 1. Security hardening: hide server fingerprint
  app.disable('x-powered-by');

  // 2. Trust proxy headers (e.g. AWS ALB, Cloudflare, Google Cloud Run, Nginx)
  // Ensures accurate client IP detection for express-rate-limit
  app.set('trust proxy', 1);

  // 3. Cross-Origin Resource Sharing (CORS)
  app.use(corsMiddleware);

  // 4. Body parsers with 7MB limit (sufficient for 5MB binary image encoded in Base64)
  // Strictly prevents runaway multi-megabyte payloads from consuming backend memory
  app.use(express.json({ limit: '7mb' }));
  app.use(express.urlencoded({ extended: true, limit: '7mb' }));

  // 5. Mount API Routes (includes health checks, rate limiters, validation pipelines)
  app.use(rootRouter);

  // 6. Global Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
