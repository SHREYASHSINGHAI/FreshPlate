import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

/**
 * Standard API rate limiter for general routes.
 */
export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too many requests. Please slow down and try again later.'
  }
});

/**
 * Strict rate limiter for AI / Vision endpoints to protect Gemini API quotas.
 */
export const visionRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: config.visionRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'AI analysis quota limit reached. Please wait a few moments before scanning another image.'
  }
});
