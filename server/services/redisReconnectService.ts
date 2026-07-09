import { Redis } from 'ioredis';
import { ReconnectService } from '../repositories/types';

export class RedisReconnectService implements ReconnectService {
    constructor(private redis: Redis) { }

    async issueToken(playerId: string, roomId: string, playerName?: string): Promise<string> {
        const token = `rc_${playerId}_${Date.now()}`;
        // STABILITY: 30 min TTL (was 3 min) — tokens must outlive long phone
        // background periods, matching the client's 30 min session validity.
        await this.redis.setex(
            `reconnect:${token}`,
            1800,
            JSON.stringify({ playerId, roomId, playerName })
        );
        return token;
    }

    /**
     * Consumes the old token (GETDEL = one-shot, no replay attacks),
     * then immediately issues a FRESH token so the client can survive
     * back-to-back reconnects on flaky mobile networks.
     * Returns both the session info AND the new token.
     */
    async restore(token: string): Promise<{ roomId: string; playerId: string; newToken: string; playerName?: string } | null> {
        const data = await this.redis.getdel(`reconnect:${token}`);
        if (!data) return null;
        const session = JSON.parse(data);

        // Issue a fresh token immediately (rolling token pattern)
        const newToken = await this.issueToken(session.playerId, session.roomId, session.playerName);
        session.newToken = newToken;

        return session;
    }
}

export class InMemoryReconnectService implements ReconnectService {
    private tokens = new Map<string, { playerId: string; roomId: string; playerName?: string; expires: number }>();

    async issueToken(playerId: string, roomId: string, playerName?: string): Promise<string> {
        const token = `rc_${playerId}_${Date.now()}`;
        // STABILITY: 30 min TTL to match client session validity
        this.tokens.set(token, { playerId, roomId, playerName, expires: Date.now() + 1800 * 1000 });
        return token;
    }

    async restore(token: string): Promise<{ roomId: string; playerId: string; newToken: string; playerName?: string } | null> {
        this.purgeExpired();
        const data = this.tokens.get(token);
        if (!data) return null;
        if (Date.now() > data.expires) {
            this.tokens.delete(token);
            return null;
        }
        // Consume old token
        this.tokens.delete(token);

        // Issue fresh rolling token
        const newToken = await this.issueToken(data.playerId, data.roomId, data.playerName);
        return { playerId: data.playerId, roomId: data.roomId, newToken, playerName: data.playerName };
    }

    private purgeExpired() {
        const now = Date.now();
        for (const [token, data] of this.tokens.entries()) {
            if (now > data.expires) this.tokens.delete(token);
        }
    }
}
