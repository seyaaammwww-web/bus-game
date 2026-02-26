/**
 * Server-side permission and security middleware
 */

import type { Player } from '@shared/schema';

// Rate limiters - define locally or import from shared location
class RateLimiter {
  private requestCounts: Map<string, number[]> = new Map();
  private config: { maxRequests: number; windowMs: number };

  constructor(config: { maxRequests: number; windowMs: number }) {
    this.config = config;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requestCounts.get(key) || [];
    const recentRequests = requests.filter((timestamp) => now - timestamp < this.config.windowMs);
    if (recentRequests.length >= this.config.maxRequests) return false;
    recentRequests.push(now);
    this.requestCounts.set(key, recentRequests);
    return true;
  }

  getRemaining(key: string): number {
    const now = Date.now();
    const requests = this.requestCounts.get(key) || [];
    const recentRequests = requests.filter((timestamp) => now - timestamp < this.config.windowMs);
    return Math.max(0, this.config.maxRequests - recentRequests.length);
  }
}

export const votingRateLimiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
export const messageRateLimiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
export const powerUpRateLimiter = new RateLimiter({ maxRequests: 1, windowMs: 2000 });

export interface AuthContext {
  playerId: string;
  playerRole: 'host' | 'referee' | 'spectator' | 'participant';
}

/**
 * Middleware to validate player permissions
 */
export function validatePermissionMiddleware(requiredRole: string | string[]) {
  return async (context: AuthContext, action: string) => {
    const { playerId, playerRole } = context;

    // Check if player has required role
    if (!validatePlayerPermission(playerRole, requiredRole)) {
      throw new Error(`Insufficient permissions. Required: ${requiredRole}`);
    }

    // Check if player can perform this action
    if (!canPerformAction(playerRole, action)) {
      throw new Error(`Player role '${playerRole}' cannot perform action '${action}'`);
    }

    return true;
  };
}

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
    host: ['vote', 'message', 'powerup', 'override', 'end_round', 'manage_players'],
    referee: ['vote', 'message', 'override'],
    participant: ['vote', 'message', 'powerup'],
    spectator: ['message'],
  };

  return (allowedActions[playerRole] || []).includes(action);
}

/**
 * Validate voting action
 */
export function validateVotingAction(
  playerId: string,
  playerRole: 'host' | 'referee' | 'spectator' | 'participant',
  voteData: {
    itemId: string;
    vote: 'yes' | 'no';
    voterId: string;
  }
): {
  allowed: boolean;
  reason?: string;
} {
  // Check rate limit
  const rateLimit = votingRateLimiter.isAllowed(`vote_${playerId}`);
  if (!rateLimit) {
    return { allowed: false, reason: 'Rate limit exceeded for voting' };
  }

  // Check permissions
  if (!canPerformAction(playerRole, 'vote')) {
    return { allowed: false, reason: `Player role '${playerRole}' cannot vote` };
  }

  // Validate vote data
  if (!voteData.itemId || !voteData.vote) {
    return { allowed: false, reason: 'Invalid vote data' };
  }

  if (!['yes', 'no'].includes(voteData.vote)) {
    return { allowed: false, reason: 'Invalid vote value' };
  }

  return { allowed: true };
}

/**
 * Validate message action
 */
export function validateMessageAction(
  playerId: string,
  playerRole: 'host' | 'referee' | 'spectator' | 'participant',
  message: string
): {
  allowed: boolean;
  reason?: string;
  sanitized?: string;
} {
  // Check rate limit
  const rateLimit = messageRateLimiter.isAllowed(`message_${playerId}`);
  if (!rateLimit) {
    return { allowed: false, reason: 'Rate limit exceeded for messages' };
  }

  // Check permissions
  if (!canPerformAction(playerRole, 'message')) {
    return { allowed: false, reason: `Player role '${playerRole}' cannot send messages` };
  }

  // Validate message
  if (!message || message.trim().length === 0) {
    return { allowed: false, reason: 'Message cannot be empty' };
  }

  if (message.length > 500) {
    return { allowed: false, reason: 'Message too long (max 500 characters)' };
  }

  // Sanitize message (basic XSS prevention)
  const sanitized = sanitizeMessage(message);

  return { allowed: true, sanitized };
}

/**
 * Validate power-up action
 */
export function validatePowerUpAction(
  playerId: string,
  playerRole: 'host' | 'referee' | 'spectator' | 'participant',
  powerUpType: string
): {
  allowed: boolean;
  reason?: string;
} {
  // Check rate limit
  const rateLimit = powerUpRateLimiter.isAllowed(`powerup_${playerId}`);
  if (!rateLimit) {
    return { allowed: false, reason: 'Rate limit exceeded for power-ups' };
  }

  // Check permissions
  if (!canPerformAction(playerRole, 'powerup')) {
    return { allowed: false, reason: `Player role '${playerRole}' cannot use power-ups` };
  }

  // Validate power-up type
  const validPowerUps = ['wildcard', 'freeze', 'banish'];
  if (!validPowerUps.includes(powerUpType)) {
    return { allowed: false, reason: `Invalid power-up type: ${powerUpType}` };
  }

  return { allowed: true };
}

/**
 * Validate referee override
 */
export function validateRefereOverride(
  playerId: string,
  playerRole: 'host' | 'referee' | 'spectator' | 'participant'
): {
  allowed: boolean;
  reason?: string;
} {
  // Only host and referee can override
  if (!['host', 'referee'].includes(playerRole)) {
    return { allowed: false, reason: 'Only host or referee can override votes' };
  }

  return { allowed: true };
}

/**
 * Sanitize user message to prevent XSS
 */
export function sanitizeMessage(message: string): string {
  return message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validate player exists and is eligible
 */
export function validatePlayerEligibility(player: Player | null, action: string): {
  eligible: boolean;
  reason?: string;
} {
  if (!player) {
    return { eligible: false, reason: 'Player not found' };
  }

  // Check if player has required properties
  const hasDisconnected = 'isDisconnected' in player && (player as any).isDisconnected;
  const hasBanished = 'isBanished' in player && (player as any).isBanished;

  if (hasDisconnected) {
    return { eligible: false, reason: 'Player is disconnected' };
  }

  if (hasBanished) {
    return { eligible: false, reason: 'Player is banished' };
  }

  return { eligible: true };
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  timestamp: number;
  playerId: string;
  playerRole: string;
  action: string;
  resourceId?: string;
  result: 'success' | 'failure';
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Audit logger
 */
export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 1000;

  log(entry: AuditLogEntry): void {
    this.logs.push({
      ...entry,
      timestamp: entry.timestamp || Date.now(),
    });

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUDIT] ${entry.action} by ${entry.playerId}: ${entry.result}`, entry);
    }
  }

  getLogs(filter?: { playerId?: string; action?: string }): AuditLogEntry[] {
    let result = [...this.logs];

    if (filter?.playerId) {
      result = result.filter((l) => l.playerId === filter.playerId);
    }

    if (filter?.action) {
      result = result.filter((l) => l.action === filter.action);
    }

    return result;
  }

  clear(): void {
    this.logs = [];
  }
}

export const auditLogger = new AuditLogger();
