import { GoogleGenAI } from '@google/genai';
import { config } from './env';

if (!config.geminiApiKey) {
  console.error('[GeminiConfig] FATAL: process.env.GEMINI_API_KEY is not set. Requests will fail authentication.');
}

/**
 * Centralized Google GenAI SDK instance.
 * Strictly reads from process.env.GEMINI_API_KEY on the server.
 * Never exposed to client-side bundles.
 */
export const geminiClient = new GoogleGenAI({
  apiKey: config.geminiApiKey || 'missing-key'
});

export const PRIMARY_VISION_MODEL = 'gemini-3.6-flash';
export const FALLBACK_VISION_MODEL = 'gemini-3.5-flash';
export const FAST_TEXT_MODEL = 'gemini-1.5-flash-8b';
