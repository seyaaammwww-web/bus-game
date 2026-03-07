import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { gameManager } from "./gameManager";
import { HybridValidator } from "./hybridValidator";
import { GroqService } from "./services/groqService";
import { WildcardService } from "./services/wildcardService";
import { WSErrorCode } from "../shared/schema";

// Connection tracking for metrics
const connectionMetrics = {
  totalConnections: 0,
  activeConnections: 0,
  messagesProcessed: 0,
  errorsLogged: 0,
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Debug AI initialization
  console.log("=== AI INITIALIZATION DEBUG ===");
  console.log("GROQ API KEY exists:", !!process.env.GROQ_API_KEY);
  console.log("=== END DEBUG ===");

  // Create WebSocket server
  // P1-3 FIX: Limit payload size to 64KB and disable compression to prevent abuse
  const wss = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: 64 * 1024, perMessageDeflate: false });

  wss.on('connection', (ws: WebSocket, req) => {
    connectionMetrics.totalConnections++;
    connectionMetrics.activeConnections++;

    // Attach connection metadata
    (ws as any).id = require('crypto').randomUUID();
    (ws as any).connectedAt = Date.now();

    // Extract and attach client IP (for proxy support)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      (ws as any).forwardedFor = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    }

    console.log(`[WS] New connection: ${(ws as any).id} from ${(ws as any).forwardedFor || 'direct'}`);

    ws.on('message', (data: Buffer) => {
      connectionMetrics.messagesProcessed++;

      try {
        let message;
        try {
          message = JSON.parse(data.toString());
        } catch (parseError) {
          ws.send(JSON.stringify({
            type: 'error',
            payload: { code: WSErrorCode.INVALID_PAYLOAD, message: 'Invalid JSON format' }
          }));
          return;
        }

        if (!message.type || typeof message.type !== 'string') {
          ws.send(JSON.stringify({
            type: 'error',
            payload: { code: WSErrorCode.INVALID_PAYLOAD, message: 'Message must have a "type" field' }
          }));
          return;
        }

        gameManager.handleMessage(ws, message);

      } catch (error: any) {
        connectionMetrics.errorsLogged++;
        console.error('[WS] Message handling error:', error);

        ws.send(JSON.stringify({
          type: 'error',
          payload: { code: WSErrorCode.INTERNAL_ERROR, message: error.message || 'Internal server error' }
        }));
      }
    });

    ws.on('close', (code, reason) => {
      connectionMetrics.activeConnections--;
      console.log(`[WS] Connection closed: ${(ws as any).id} (code: ${code}, reason: ${reason || 'none'})`);
      gameManager.handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      connectionMetrics.errorsLogged++;
      console.error(`[WS] Connection error: ${(ws as any).id}`, error);
      gameManager.handleDisconnect(ws);
    });
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      connections: {
        active: connectionMetrics.activeConnections,
        total: connectionMetrics.totalConnections,
      },
      messages: connectionMetrics.messagesProcessed,
    });
  });

  // Groq Health Endpoint
  app.get('/api/groq/health', (_req, res) => {
    try {
      const groq = GroqService.getInstance();
      const stats = groq.getStats();

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        stats,
        limits: {
          requests_per_minute: 30,
          model: 'llama-3.3-70b-versatile',
          cost: 'FREE',
          cache_hits: stats.cacheSize
        }
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        fix: 'تحقق من GROQ_API_KEY في ملف .env'
      });
    }
  });

  app.post('/api/groq/validate', async (req, res) => {
    // V3-12 FIX: Secure debug endpoint
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Forbidden' });
    try {
      const { letter, category, word } = req.body;
      const groq = GroqService.getInstance();

      const result = await groq.validateWord(letter, category, word);

      res.json({
        success: true,
        result,
        cached: groq.getStats().cacheSize
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Validator metrics endpoint
  app.get('/api/metrics', (_req, res) => {
    res.json({
      websocket: connectionMetrics,
      validator: WildcardService.getInstance().getStats(),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  });

  // Database Debug Endpoint
  app.get('/api/debug/db', (_req, res) => {
    // V3-12 FIX: Secure debug endpoint
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Forbidden' });
    try {
      const { WildcardService } = require("./services/wildcardService");
      const stats = WildcardService.getInstance().getStats();
      res.json({
        status: 'ok',
        location: 'deployment',
        stats
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return httpServer;
}
