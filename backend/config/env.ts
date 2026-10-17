import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  corsOrigins: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : ['*'],
  uploadMaxSizeBytes: 15 * 1024 * 1024, // 15MB max file size
  rateLimitWindowMs: 15 * 60 * 1000,     // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  visionRateLimitMaxRequests: parseInt(process.env.VISION_RATE_LIMIT_MAX || '30', 10)
};

// Validate critical configurations
if (!config.geminiApiKey) {
  console.warn('[SECURITY WARNING] GEMINI_API_KEY is not defined in process.env. AI endpoints will fail.');
}
