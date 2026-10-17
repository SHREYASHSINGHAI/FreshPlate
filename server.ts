import path from "path";
import { createServer as createViteServer } from "vite";
import { createApp } from "./backend/app";
import { config } from "./backend/config/env";

async function startServer() {
  const app = createApp();
  const PORT = config.port;

  // Vite middleware for development / SPA serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(expressStaticFallback(distPath));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FreshPlate] Unified server running on http://localhost:${PORT}`);
    console.log(`[FreshPlate] Mobile API v1: http://localhost:${PORT}/api/v1`);
    console.log(`[FreshPlate] Vision Endpoint: POST http://localhost:${PORT}/api/v1/analyze-ingredients`);
  });
}

function expressStaticFallback(distPath: string) {
  const express = require('express');
  const router = express.Router();
  router.use(express.static(distPath));
  router.get("*", (req: any, res: any) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  return router;
}

startServer();
