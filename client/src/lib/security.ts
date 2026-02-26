/**
 * Rate limiting and security utilities
 * Provides protection against spam and abuse
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

class RateLimiter {
  private requestCounts: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxRequests: 10, windowMs: 1000 }) {
    this.config = config;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requestCounts.get(key) || [];

    // Filter out old requests outside the window
    const recentRequests = requests.filter((timestamp) => now - timestamp < this.config.windowMs);

    if (recentRequests.length >= this.config.maxRequests) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requestCounts.set(key, recentRequests);

    return true;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string): number {
    const now = Date.now();
    const requests = this.requestCounts.get(key) || [];
    const recentRequests = requests.filter((timestamp) => now - timestamp < this.config.windowMs);
    return Math.max(0, this.config.maxRequests - recentRequests.length);
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.requestCounts.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.requestCounts.clear();
  }
}

// Create rate limiters for different operations
export const votingRateLimiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 }); // 3 votes per second
export const messageRateLimiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 }); // 5 messages per second
export const powerUpRateLimiter = new RateLimiter({ maxRequests: 1, windowMs: 2000 }); // 1 power-up per 2 seconds
export const chatRateLimiter = new RateLimiter({ maxRequests: 10, windowMs: 5000 }); // 10 messages per 5 seconds

/**
 * Permission validator
 */
export function validatePlayerPermission(
  playerRole: 'host' | 'referee' | 'spectator' | 'participant',
  requiredRole: string | string[]
): boolean {
  const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  // Permission hierarchy
  const roleHierarchy: Record<string, number> = {
    host: 3,
    referee: 2,
    participant: 1,
    spectator: 0,
  };

  const playerLevel = roleHierarchy[playerRole] || 0;
  const requiredLevel = Math.max(...required.map((r) => roleHierarchy[r] || 0));

  return playerLevel >= requiredLevel;
}

/**
 * Check if action is allowed for player
 */
export function canPerformAction(
  playerRole: 'host' | 'referee' | 'spectator' | 'participant',
  action: string
): boolean {
  const allowedActions: Record<string, string[]> = {
    // Host can do everything
    host: ['vote', 'message', 'powerup', 'override', 'end_round', 'manage_players'],
    // Referee can vote and override
    referee: ['vote', 'message', 'override'],
    // Participants can vote
    participant: ['vote', 'message', 'powerup'],
    // Spectators can only message
    spectator: ['message'],
  };

  return (allowedActions[playerRole] || []).includes(action);
}

/**
 * Server-side rate limit check
 */
export function checkServerRateLimit(playerId: string, action: string): { allowed: boolean; remaining: number } {
  let limiter: RateLimiter;

  switch (action) {
    case 'vote':
      limiter = votingRateLimiter;
      break;
    case 'message':
      limiter = messageRateLimiter;
      break;
    case 'powerup':
      limiter = powerUpRateLimiter;
      break;
    default:
      limiter = messageRateLimiter;
  }

  const key = `${playerId}_${action}`;
  const allowed = limiter.isAllowed(key);
  const remaining = limiter.getRemaining(key);

  return { allowed, remaining };
}
