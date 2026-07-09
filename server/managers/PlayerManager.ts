
import { WebSocket } from 'ws';
import { nanoid } from 'nanoid';

// FIX: Inline constants to avoid import path issues on HF deployment
// STABILITY: 120s pong timeout — mobile browsers throttle background tabs so
// pings/pongs stall for 60s+ when a player switches apps or locks the screen.
// A 35s timeout was kicking healthy players. Real disconnects are still caught
// instantly via the ws 'close' event; this timeout only guards half-open sockets.
const PONG_TIMEOUT_MS = 120000;
const CLEANUP_INTERVAL_MS = 15000;

export interface ConnectedPlayer {
    ws: WebSocket;
    playerId: string;
    roomId: string;
    lastPong: number;   // timestamp of last pong received
}

export class PlayerManager {
    private players: Map<WebSocket, ConnectedPlayer> = new Map();
    private cleanupInterval: NodeJS.Timeout;

    constructor(private onPlayerTimeout: (playerId: string, roomId: string) => void) {
        // Check every 15 seconds for dead connections
        this.cleanupInterval = setInterval(() => this.cleanupDeadConnections(), CLEANUP_INTERVAL_MS);
    }

    addPlayer(ws: WebSocket, roomId: string, playerId?: string): ConnectedPlayer {
        const id = playerId || nanoid(16);
        const playerInfo: ConnectedPlayer = { ws, playerId: id, roomId, lastPong: Date.now() };
        this.players.set(ws, playerInfo);
        return playerInfo;
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

    getRoomId(playerId: string): string | undefined {
        for (const info of this.players.values()) {
            if (info.playerId === playerId) return info.roomId;
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

                // V3-1 FIX: Call timeout handler BEFORE deleting socket from map
                // so handlePlayerTimeout can find it via getSocket() and remove it from roomSocketIndex
                this.onPlayerTimeout(info.playerId, info.roomId);

                this.players.delete(ws);
                if (ws.readyState === WebSocket.OPEN) {
                    try { ws.terminate(); } catch { }
                }
            }
        }
    }

    destroy() {
        clearInterval(this.cleanupInterval);
    }
}
