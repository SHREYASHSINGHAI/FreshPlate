import { Request, Response } from 'express';
import { config } from '../config/env';
import { PRIMARY_VISION_MODEL, FALLBACK_VISION_MODEL } from '../config/gemini';

/**
 * Controller for GET and HEAD /api/v1/health (and /health)
 * Used for container orchestrator readiness/liveness probes (K8s, ECS, Cloud Run)
 * and external uptime monitoring (Pingdom, Datadog, BetterUptime).
 */
export function getHealthStatus(req: Request, res: Response) {
  const memoryUsage = process.memoryUsage();
  const formatMb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

  const isGeminiReady = Boolean(config.geminiApiKey && config.geminiApiKey !== 'missing-key');
  const isHealthy = isGeminiReady;

  const payload = {
    status: isHealthy ? 'ok' : 'degraded',
    service: 'FreshPlate Mobile Backend',
    version: '1.0.0',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      memory: {
        rss: formatMb(memoryUsage.rss),
        heapTotal: formatMb(memoryUsage.heapTotal),
        heapUsed: formatMb(memoryUsage.heapUsed),
        external: formatMb(memoryUsage.external)
      }
    },
    security: {
      rateLimiting: 'active',
      maxUploadSize: '5MB',
      maxBase64Size: '5MB',
      corsOrigins: config.corsOrigins
    },
    dependencies: {
      geminiVision: {
        configured: isGeminiReady,
        primaryModel: PRIMARY_VISION_MODEL,
        fallbackModel: FALLBACK_VISION_MODEL
      },
      firebase: {
        configured: Boolean(config.firebase.projectId)
      }
    }
  };

  // If HEAD request, respond with headers only (zero network body)
  if (req.method === 'HEAD') {
    return res.status(isHealthy ? 200 : 200).end();
  }

  return res.status(isHealthy ? 200 : 200).json(payload);
}
