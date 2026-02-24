
import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';

export interface ConnectedPlayer {
    ws: WebSocket;
    playerId: string;
    roomId: string;
    lastPong: number;   // timestamp of last pong received
}

const PONG_TIMEOUT_MS = 60000; // 60 seconds — lenient for mobile/slow networks

export class PlayerManager {
    private players: Map<WebSocket, ConnectedPlayer> = new Map();
    private cleanupInterval: NodeJS.Timeout;

    constructor(private onPlayerTimeout: (playerId: string, roomId: string) => void) {
        // Check every 15 seconds for dead connections
        this.cleanupInterval = setInterval(() => this.cleanupDeadConnections(), 15000);
    }

    addPlayer(ws: WebSocket, roomId: string, playerId?: string): ConnectedPlayer {
        const id = playerId || randomUUID();
        const playerInfo: ConnectedPlayer = { ws, playerId: id, roomId, lastPong: Date.now() };
        this.players.set(ws, playerInfo);
        return playerInfo;
    }

    updateRoomId(ws: WebSocket, roomId: string) {
        const player = this.players.get(ws);
        if (player) player.roomId = roomId;
    }

    recordPong(ws: WebSocket) {
        const player = this.players.get(ws);
        if (player) player.lastPong = Date.now();
    }

    removePlayer(ws: WebSocket): ConnectedPlayer | undefined {
        const player = this.players.get(ws);
        if (player) {
            this.players.delete(ws);
        }
        return player;
    }

    getPlayer(ws: WebSocket): ConnectedPlayer | undefined {
        return this.players.get(ws);
    }

    getSocket(playerId: string): WebSocket | undefined {
        for (const [ws, info] of this.players.entries()) {
            if (info.playerId === playerId) return ws;
        }
        return undefined;
    }

    getAllPlayers(): ConnectedPlayer[] {
        return Array.from(this.players.values());
    }

    private cleanupDeadConnections() {
        const now = Date.now();
        for (const [ws, info] of this.players.entries()) {
            const isWebSocketDead = ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING;
            const isPongTimedOut = now - info.lastPong > PONG_TIMEOUT_MS;

            if (isWebSocketDead || isPongTimedOut) {
                console.log(`[PlayerManager] Removing dead player ${info.playerId} (ws=${ws.readyState}, pong=${isPongTimedOut})`);
                this.players.delete(ws);
                if (ws.readyState === WebSocket.OPEN) {
                    try { ws.terminate(); } catch { }
                }
                this.onPlayerTimeout(info.playerId, info.roomId);
            }
        }
    }

    destroy() {
        clearInterval(this.cleanupInterval);
    }
}
