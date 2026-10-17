import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config/env';

/**
 * Global rate limiter protecting all API endpoints from abusive traffic / DDoS.
 * Automatically skips health check endpoints so status probes never trigger 429s.
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs, // 15 minutes
  max: config.rateLimitMaxRequests,    // default 100 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Whitelist health check endpoints from rate limiting
    const path = req.path || '';
    return path === '/health' || path === '/api/v1/health' || path.endsWith('/health');
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      error: 'Too many requests. Please slow down and try again later.',
      retryAfterSeconds: Math.ceil(config.rateLimitWindowMs / 1000)
    });
  }
});

/**
 * Standard API rate limiter for general routes.
 */
export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      error: 'Too many requests. Please slow down and try again later.',
      retryAfterSeconds: Math.ceil(config.rateLimitWindowMs / 1000)
    });
  }
});

/**
 * Strict rate limiter for AI / Vision endpoints (receipt and fridge photo scanning)
 * to protect Gemini API quotas and prevent runaway cloud billing.
 */
export const visionRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes window
  max: config.visionRateLimitMaxRequests, // default 30 requests per 5 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      error: 'AI vision quota limit reached. Please wait a few moments before scanning another image.',
      retryAfterSeconds: 300
    });
  }
});

/**
 * Strict rate limiter for AI Recipe Generation and Text Parsing
 * to protect against prompt spam and runaway token consumption.
 */
export const aiRecipeRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes window
  max: config.recipeRateLimitMaxRequests, // default 30 requests per 5 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      error: 'AI recipe generation quota reached. Please wait a few moments before generating more recipes.',
      retryAfterSeconds: 300
    });
  }
});
