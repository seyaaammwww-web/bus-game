import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { gameManager } from "./gameManager";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Debug AI initialization
  console.log("=== AI INITIALIZATION DEBUG ===");
  console.log("GROQ API KEY exists:", !!process.env.GROQ_API_KEY);
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

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return httpServer;
}
