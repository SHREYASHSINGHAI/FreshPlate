import { createApp } from './app';
import { config } from './config/env';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[FreshPlate Backend] Server running on port ${config.port} in ${config.nodeEnv} mode`);
  console.log(`[FreshPlate Backend] API v1 base: http://localhost:${config.port}/api/v1`);
  console.log(`[FreshPlate Backend] Vision endpoint: POST http://localhost:${config.port}/api/v1/analyze-ingredients`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[FreshPlate Backend] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[FreshPlate Backend] HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('[FreshPlate Backend] SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('[FreshPlate Backend] HTTP server closed');
  });
});

export default server;
