import cors from 'cors';
import { config } from '../config/env';

/**
 * Mobile-compatible CORS middleware.
 * Supports:
 * - capacitor://localhost (Capacitor iOS)
 * - http://localhost (Capacitor Android)
 * - ionic://localhost
 * - Web browsers on development and production origins
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile native apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (config.corsOrigins.includes('*')) {
      return callback(null, true);
    }

    const allowedOrigins = [
      'capacitor://localhost',
      'http://localhost',
      'http://localhost:3000',
      'http://localhost:5173',
      'ionic://localhost',
      ...config.corsOrigins
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
});
