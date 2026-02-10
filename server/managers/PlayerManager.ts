
import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';

export interface ConnectedPlayer {
    ws: WebSocket;
    playerId: string;
    roomId: string;
}

export class PlayerManager {
    private players: Map<WebSocket, ConnectedPlayer> = new Map();

    addPlayer(ws: WebSocket, roomId: string, playerId?: string): ConnectedPlayer {
        const id = playerId || randomUUID();
        const playerInfo = { ws, playerId: id, roomId };
        this.players.set(ws, playerInfo);
        return playerInfo;
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
}
