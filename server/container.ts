import { Redis } from 'ioredis';
import { VotingService, ReconnectService } from './repositories/types';
import { RedisVotingService } from './services/redisVotingService';
import { InMemoryVotingService } from './services/inMemoryVotingService';
import { RedisReconnectService, InMemoryReconnectService } from './services/redisReconnectService';
import { IRoomRepository, RedisRoomRepository, InMemoryRoomRepository } from './repositories/roomRepository';

export let redisClient: Redis | null = null;

if (process.env.REDIS_URL) {
    try {
        redisClient = new Redis(process.env.REDIS_URL);
        console.log('[Container] Redis Client initialized for Hybrid Storage.');
    } catch (e) {
        console.warn('[Container] Failed to initialize Redis Client, falling back to InMemory:', e);
    }
}

export const votingService: VotingService = redisClient && process.env.FEATURE_REDIS_VOTING === 'true'
    ? new RedisVotingService(redisClient)
    : new InMemoryVotingService();

export const reconnectService: ReconnectService = redisClient
    ? new RedisReconnectService(redisClient)
    : new InMemoryReconnectService();

export const roomRepository: IRoomRepository = redisClient && process.env.FEATURE_REDIS_ROOMS === 'true'
    ? new RedisRoomRepository(redisClient)
    : new InMemoryRoomRepository();
