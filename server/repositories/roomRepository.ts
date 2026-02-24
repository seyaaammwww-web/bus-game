import { Redis } from 'ioredis';
import { GameRoom } from '../../shared/schema';

export interface IRoomRepository {
    get(roomCode: string): Promise<GameRoom | null>;
    set(roomCode: string, room: GameRoom): Promise<void>;
    delete(roomCode: string): Promise<void>;
    getAllCodes(): Promise<string[]>;
    exists(roomCode: string): Promise<boolean>;
    acquireLock(roomCode: string): Promise<boolean>;
    releaseLock(roomCode: string): Promise<void>;
}

export class RedisRoomRepository implements IRoomRepository {
    private readonly PREFIX = 'room:';
    private readonly TTL = 86400; // 24 hours

    constructor(private redis: Redis) { }

    async get(roomCode: string): Promise<GameRoom | null> {
        const data = await this.redis.get(`${this.PREFIX}${roomCode}`);
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error(`[RedisRoomRepository] Serialization error for room ${roomCode}:`, e);
            return null;
        }
    }

    async set(roomCode: string, room: GameRoom): Promise<void> {
        await this.redis.setex(
            `${this.PREFIX}${roomCode}`,
            this.TTL,
            JSON.stringify(room)
        );
    }

    async delete(roomCode: string): Promise<void> {
        await this.redis.del(`${this.PREFIX}${roomCode}`);
    }

    async getAllCodes(): Promise<string[]> {
        const keys = await this.redis.keys(`${this.PREFIX}*`);
        return keys.map((k: string) => k.replace(this.PREFIX, ''));
    }

    async exists(roomCode: string): Promise<boolean> {
        const count = await this.redis.exists(`${this.PREFIX}${roomCode}`);
        return count > 0;
    }

    async acquireLock(roomCode: string): Promise<boolean> {
        const lockKey = `lock:room:${roomCode}`;
        const timeout = 10000; // 10s retry window
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            // Set lock for 5s
            const res = await (this.redis as any).set(lockKey, 'locked', 'PX', 5000, 'NX');
            if (res === 'OK') return true;
            await new Promise(r => setTimeout(r, 50));
        }
        return false;
    }

    async releaseLock(roomCode: string): Promise<void> {
        const lockKey = `lock:room:${roomCode}`;
        await this.redis.del(lockKey);
    }
}

export class InMemoryRoomRepository implements IRoomRepository {
    private rooms = new Map<string, GameRoom>();
    private locks = new Map<string, boolean>();

    async get(roomCode: string): Promise<GameRoom | null> {
        return this.rooms.get(roomCode) || null;
    }

    async set(roomCode: string, room: GameRoom): Promise<void> {
        this.rooms.set(roomCode, room);
    }

    async delete(roomCode: string): Promise<void> {
        this.rooms.delete(roomCode);
    }

    async getAllCodes(): Promise<string[]> {
        return Array.from(this.rooms.keys());
    }

    async exists(roomCode: string): Promise<boolean> {
        return this.rooms.has(roomCode);
    }

    async acquireLock(roomCode: string): Promise<boolean> {
        const startTime = Date.now();
        while (this.locks.get(roomCode)) {
            if (Date.now() - startTime > 10000) return false;
            await new Promise(r => setTimeout(r, 10));
        }
        this.locks.set(roomCode, true);
        return true;
    }

    async releaseLock(roomCode: string): Promise<void> {
        this.locks.delete(roomCode);
    }
}
