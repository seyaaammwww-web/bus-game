import { Redis } from 'ioredis';
import { ReconnectService } from '../repositories/types';

export class RedisReconnectService implements ReconnectService {
    constructor(private redis: Redis) { }

    async issueToken(playerId: string, roomId: string): Promise<string> {
        const token = `rc_${playerId}_${Date.now()}`;
        await this.redis.setex(
            `reconnect:${token}`,
            180,
            JSON.stringify({ playerId, roomId })
        );
        return token;
    }

    /**
     * Consumes the old token (GETDEL = one-shot, no replay attacks),
     * then immediately issues a FRESH token so the client can survive
     * back-to-back reconnects on flaky mobile networks.
     * Returns both the session info AND the new token.
     */
    async restore(token: string): Promise<{ roomId: string; playerId: string; newToken: string } | null> {
        const data = await this.redis.getdel(`reconnect:${token}`);
        if (!data) return null;
        const session = JSON.parse(data);

        // Issue a fresh token immediately (rolling token pattern)
        const newToken = await this.issueToken(session.playerId, session.roomId);
        session.newToken = newToken;

        return session;
    }
}

export class InMemoryReconnectService implements ReconnectService {
    private tokens = new Map<string, { playerId: string; roomId: string; expires: number }>();

    async issueToken(playerId: string, roomId: string): Promise<string> {
        const token = `rc_${playerId}_${Date.now()}`;
        this.tokens.set(token, { playerId, roomId, expires: Date.now() + 180 * 1000 });
        return token;
    }

    async restore(token: string): Promise<{ roomId: string; playerId: string; newToken: string } | null> {
        const data = this.tokens.get(token);
        if (!data) return null;
        if (Date.now() > data.expires) {
            this.tokens.delete(token);
            return null;
        }
        // Consume old token
        this.tokens.delete(token);

        // Issue fresh rolling token
        const newToken = await this.issueToken(data.playerId, data.roomId);
        return { playerId: data.playerId, roomId: data.roomId, newToken };
    }
}
