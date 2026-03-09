console.log(`[BOOT] Server script started at ${new Date().toISOString()}`);
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);


declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  log(`Starting server initialization...`);
  console.time('Startup');

  log(`Registering routes...`);
  await registerRoutes(httpServer, app);
  console.timeLog('Startup', 'Routes registered');

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    log(`Serving static files in production mode...`);
    serveStatic(app);
  } else {
    log(`Initializing Vite in development mode...`);
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }
  console.timeLog('Startup', 'Static/Vite setup complete');

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`Serving on port ${port}`);
      console.timeEnd('Startup');
    },
  );

  // Graceful shutdown — stop accepting connections and clean up timers
  const gracefulShutdown = (signal: string) => {
    log(`Received ${signal}, shutting down gracefully...`);
    httpServer.close(() => {
      log('All connections closed. Exiting.');
      process.exit(0);
    });
    // Force-exit fallback if connections don't drain within 10 s
    setTimeout(() => {
      log('Could not drain connections in time — forcing exit.');
      process.exit(1);
    }, 10000).unref(); // .unref() so this timer doesn't block the event loop itself
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();
