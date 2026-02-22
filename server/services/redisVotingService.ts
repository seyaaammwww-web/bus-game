import { Redis } from 'ioredis';
import { VotingService, Vote } from '../repositories/types';

const VOTES_KEY = (roomId: string, round: number) => `room:${roomId}:votes:${round}`;

export class RedisVotingService implements VotingService {
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  async castVote(
    roomId: string,
    round: number,
    voterId: string,
    targetPlayerId: string,
    targetWord: string,
    isApproved: boolean,
    eligibleCount: number
  ) {
    const key = VOTES_KEY(roomId, round);
    // Unique key per voter, target, and word
    const voteKey = `${voterId}:${targetPlayerId}:${targetWord}`;

    // Lua script to ensure atomicity
    const lua = `
      local key = KEYS[1]
      local voteKey = ARGV[1]
      local value = ARGV[2]  -- "1" or "0"
      local eligibleCount = tonumber(ARGV[3])
      
      redis.call('HSET', key, voteKey, value)
      
      local total = redis.call('HLEN', key)
      local yes = redis.call('HVALS', key)
      local yesCount = 0
      local noCount = 0
      
      for _, v in ipairs(yes) do 
        if v == "1" then 
          yesCount = yesCount + 1 
        else
          noCount = noCount + 1
        end 
      end
      
      local majority = (yesCount > eligibleCount / 2) or (noCount > eligibleCount / 2) or (total == eligibleCount)
      
      if majority then 
        redis.call('EXPIRE', key, 86400) -- expire after 1 day if reached, or we can just leave it to clean up later
      end
      
      return {majority and 1 or 0, yesCount, total}
    `;

    const [majorityFlag, yes, total] = await this.redis.eval(
      lua,
      1,
      key,
      voteKey,
      isApproved ? "1" : "0",
      eligibleCount.toString()
    ) as [number, number, number];

    return {
      majorityReached: !!majorityFlag,
      yesCount: yes,
      totalVotes: total
    };
  }

  async getCurrentVotes(roomId: string, round: number): Promise<Vote[]> {
    const raw = await this.redis.hgetall(VOTES_KEY(roomId, round));
    return Object.entries(raw).map(([k, v]) => ({
      voterId: k.split(':')[0],
      targetPlayerId: k.split(':')[1],
      targetWord: k.split(':')[2],
      isApproved: v === "1"
    }));
  }
}
