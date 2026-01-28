import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { gameManager } from "./gameManager";
import { HybridValidator } from "./hybridValidator";
import { AIValidator } from "./aiValidator";
import { GroqService } from "./services/groqService";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Debug AI initialization
  console.log("=== AI INITIALIZATION DEBUG ===");
  console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
  console.log("GEMINIAPIKEY exists:", !!process.env.GEMINIAPIKEY);
  console.log("GEMINI_MODEL_NAME:", process.env.GEMINI_MODEL_NAME);
  console.log("GEMINIMODEL:", process.env.GEMINIMODEL);

  try {
    const hybridValidator = HybridValidator.getInstance();
    const aiValidator = AIValidator.getInstance();
    console.log("AI Validators initialized successfully");

    // Test AI connection (non-blocking)
    console.log("Testing AI connection...");
    aiValidator.validate("بلد", "أ", "أمريكا")
      .then(result => console.log("AI Test Result:", result))
      .catch(err => console.error("AI Test Error:", err));

  } catch (error) {
    console.error("AI Initialization Error:", error);
  }
  console.log("=== END DEBUG ===");
  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        gameManager.handleMessage(ws, message);
      } catch (error) {
        console.error('Failed to parse message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format' }
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      gameManager.handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      gameManager.handleDisconnect(ws);
    });
  });

  // AI Test endpoint
  app.get('/api/test-ai', async (_req, res) => {
    try {
      const hybridValidator = HybridValidator.getInstance();
      const aiValidator = AIValidator.getInstance();

      // Test single validation with strict prompt
      const testResult = await aiValidator.validate("بلد", "أ", "أمريكا");

      // Test batch validation with tricky/mixed cases
      const batchItems = [
        { playerId: "test1", category: "بلد", letter: "أ", answer: "أمريكا" }, // Correct
        { playerId: "test2", category: "بلد", letter: "أ", answer: "أوفخن" }, // Gibberish (should fail)
        { playerId: "test3", category: "حيوان", letter: "أ", answer: "أسد" }, // Correct
        { playerId: "test4", category: "بنت", letter: "أ", answer: "أحمد" }   // Wrong category (should fail)
      ];

      const batchResult = await aiValidator.validateAllRoundAnswers(batchItems);

      res.json({
        status: 'success',
        singleTest: testResult,
        batchTest: Array.from(batchResult.entries()),
        hybridMetrics: hybridValidator.getMetrics(),
        aiMetrics: aiValidator.getMetrics(),
        modelInfo: {
          name: 'gemini-3-flash-preview',
          status: 'active',
          config: 'Strict JSON + Timeout'
        }
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        model: 'gemini-3-flash-preview'
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // AI Test endpoint
  app.get('/api/test-ai', async (_req, res) => {
    // ... existing content (kept via context matching if I could, but replacer replaces block)
    // Actually I should Append the NEW endpoints, not replace existing test-ai unless I want to merge functionality
    // The user asked to ADD endpoints.
    // I will use replace to APPEND before the end of the registerRoutes function?
    // Or just insert them before 'return httpServer;'
    // I need to be careful with 'EndLine'.
    // I will replace the Health Check endpoint block to include the new ones below it, or use `replace_file_content` targeting a known block.
    // Let's replace the `app.get('/api/metrics' ...` to include the new ones after it.
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
    const metrics = HybridValidator.getInstance().getMetrics();
    res.json({
      validator: metrics,
      timestamp: new Date().toISOString()
    });
  });

  return httpServer;
}
