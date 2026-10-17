import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  corsOrigins: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : ['*'],
  uploadMaxSizeBytes: 5 * 1024 * 1024,  // 5MB max file size
  rateLimitWindowMs: 15 * 60 * 1000,    // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  visionRateLimitMaxRequests: parseInt(process.env.VISION_RATE_LIMIT_MAX || '30', 10),
  recipeRateLimitMaxRequests: parseInt(process.env.RECIPE_RATE_LIMIT_MAX || '30', 10),
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || process.env.GEMINI_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'freshplate-10d10.firebaseapp.com',
    projectId: process.env.FIREBASE_PROJECT_ID || 'freshplate-10d10',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'freshplate-10d10.firebasestorage.app',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '32026376878',
    appId: process.env.FIREBASE_APP_ID || '1:32026376878:web:bb27be1eee6f43a64f8b3f'
  }
};

// Validate critical configurations
if (!config.geminiApiKey) {
  console.warn('[SECURITY WARNING] GEMINI_API_KEY is not defined in process.env. AI endpoints will fail.');
}
