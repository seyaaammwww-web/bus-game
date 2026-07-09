import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sqliteTable, text as sqliteText, integer as sqliteInteger } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  username: sqliteText("username").notNull().unique(),
  password: sqliteText("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createInsertSchema(users);


// Game Types
export const categories = ['ولد', 'بنت', 'بلد', 'حيوان', 'جماد'] as const;
export type Category = typeof categories[number];
export type CustomCategory = string & { readonly __brand: 'CustomCategory' };
export type GameCategory = Category | CustomCategory;

export type PowerUpType = 'hint' | 'steal' | 'wildcard' | 'banish';

export const POWER_UP_COSTS = {
  hint: 50,
  steal: 100,
  wildcard: 200,
  banish: 400,
} as const;

export interface PowerUps {
  hint: number;
  steal: number;
  wildcard: number;
  banish: number;
}

export interface ActivePowerUp {
  type: PowerUpType;
  playerId: string;
  playerName: string;
  activatedAt: number;
}

// Track which power-ups have been used (one-time per game)
export interface UsedPowerUps {
  hint: boolean;
  steal: boolean;
  wildcard: boolean;
  banish: boolean;
}

// Player
export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  isReady: boolean;
  isReferee?: boolean;
  isOffline?: boolean; // Support player reconnects
  busStreak: number;
  avatar?: string;
  powerUps: PowerUps;
  usedPowerUps: UsedPowerUps; // Track one-time usage
  totalEarnedPoints: number;
  draftAnswers?: RoundAnswers; // Delta Sync support for live typing
  // BUG-1 FIX: Accumulates host manual +/- adjustments so they survive recalculatePlayerTotals
  manualScoreAdjustment?: number;
  isTyping?: boolean;
}

// Answers for a round
// Answers for a round
export type RoundAnswers = Record<string, string>;

// Player's submission for a round
export interface PlayerSubmission {
  playerId: string;
  playerName: string;
  answers: RoundAnswers;
  submittedAt: number;
  busComplete: boolean;
}

// Vote on an answer
export interface AnswerVote {
  playerId: string;
  voterId: string;
  category: Category;
  accepted: boolean;
}

// Validated answer with score
export interface ValidatedAnswer {
  playerId: string;
  playerName: string;
  category: Category;
  answer: string;
  isValid: boolean;
  isUnique: boolean;
  score: number;
  points?: number; // Alias for score to support legacy components
  votes: { accepted: number; rejected: number };
  reason?: string;
  isFabricated?: boolean;
  isPendingVote?: boolean;
  voterIds?: string[]; // Track who voted to prevent double voting
  aiSuggestion?: boolean; // TBD by AI Assistant
  appealedBy?: string[]; // FIX (#3): Phase 3 - Player Appeal System Flags
}

// Round state
export interface Round {
  number: number;
  letter: string;
  startTime: number;
  endTime: number;
  isRush: boolean;
  submissions: PlayerSubmission[];
  validatedAnswers: ValidatedAnswer[];
  votingComplete: boolean;
  activePowerUp?: ActivePowerUp | null;
  powerUpUsedInRound?: boolean;
  wildcardUsedByPlayerIds?: string[]; // Multiple players can use wildcard in one round
  wildcardAnswers?: Record<string, string>; // Legacy field (shared generation if needed) or per-player generated elsewhere
  banishedPlayerId?: string | null;
  banishedByPlayerId?: string | null;
  resultsCommitted?: boolean;
  busAnswer?: string;
  isComplete: boolean;
  busPlayerId?: string | null;
  voteEndTime?: number;
  endRoundInProgress?: boolean;
}

// Referee deduction
export interface RefereeDeduction {
  playerId: string;
  playerName: string;
  category: Category;
  answer: string;
  reason: string;
  pointsDeducted: number;
}

// Game state
export type GamePhase = 'lobby' | 'playing' | 'voting' | 'ai_processing' | 'referee_review' | 'results' | 'final';

// Voting System Types
export interface VoteRequest {
  requestId: string;
  requesterId: string;
  requesterName: string;
  category: Category;
  word: string;
  // FIX: Parallel vote tracking — snapshotted at vote creation time
  eligibleVoterIds: string[]; // Made strictly required
  voterIds?: string[];
  votes?: { yes: number; no: number };
  aiSuggestion?: boolean;
}

export interface AuditEntry {
  type: string;
  hostId: string;
  targetId?: string;
  details: string;
  timestamp: number;
  round: number;
}

export interface ActiveVote extends VoteRequest {
  votes: { yes: number; no: number };
  voterIds: string[]; // Who voted in this session
  startTime: number;
}

export interface GameRoom {
  id: string;
  code: string;
  hostId: string;
  players: Player[];
  rounds: Round[];
  currentRound: number;
  totalRounds: number;
  phase: GamePhase;
  letters: string[];
  createdAt: number;
  isPublicRoom?: boolean;
  refereeId?: string;
  refereeDeductions?: RefereeDeduction[];
  nextRoundAt?: number;

  // Voting State
  voteQueue?: VoteRequest[];
  currentVote?: ActiveVote | null;

  settings?: {
    customCategories?: string[];
    votingEnabled?: boolean; // Renamed to match the schema
  };
  auditLog?: AuditEntry[];
  lastActivityAt?: number;
}

export enum WSErrorCode {
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  ROOM_FULL = 'ROOM_FULL',
  GAME_IN_PROGRESS = 'GAME_IN_PROGRESS',
  INVALID_PHASE = 'INVALID_PHASE',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN_TYPE = 'UNKNOWN_TYPE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// Reaction types
export const reactionTypes = ['thumbsUp', 'clap', 'laugh', 'fire', 'heart'] as const;
export type ReactionType = typeof reactionTypes[number];

export interface Reaction {
  id: string;
  playerId: string;
  playerName: string;
  type: ReactionType;
  timestamp: number;
}

// WebSocket message types
export type WSMessageType =
  | 'create_room'
  | 'join_room'
  | 'rejoin_room'
  | 'join_public_room'
  | 'room_created'
  | 'room_joined'
  | 'player_joined'
  | 'player_left'
  | 'player_ready'
  | 'player_submitted'
  | 'set_referee'
  | 'remove_referee'
  | 'start_game'
  | 'round_start'
  | 'submit_answers'
  | 'bus_complete'
  | 'rush_mode'
  | 'round_end'
  | 'voting_start'
  | 'vote'
  | 'voting_complete'
  | 'referee_review_start'
  | 'referee_deduct'
  | 'referee_approve'
  | 'round_results'
  | 'next_round'
  | 'game_end'
  | 'error'
  | 'sync_state'
  | 'play_again'
  | 'send_reaction'
  | 'reaction_received'
  | 'draft_update'
  | 'typing_status'
  | 'update_settings'
  | 'activate_powerup'
  | 'powerup_activated'
  | 'wildcard_activated'
  | 'player_banished'
  | 'vote_update'
  | 'waiting_for_freeze_player'
  | 'appeal_answer'
  | 'appeal_result'
  | 'toast'
  // Voting System Specific
  | 'request_vote'
  | 'vote_cast'
  | 'cast_democratic_vote'
  | 'vote_session_start' // Individual word vote start
  | 'vote_session_result'
  | 'referee_toggle_validity'
  | 'referee_override' // Referee Quick-Action override
  | 'ping'
  // FIX: New message types for parallel voting and host controls
  | 'pong'
  | 'cast_parallel_vote'
  | 'host_adjust_score'
  | 'host_resolve_votes'
  | 'host_end_round'
  | 'kick_player'
  | 'kicked'
  | 'player_kicked'
  // FIX (#3): Phase 3 Player Appeal
  | 'player_appeal'
  | 'appeal_notification';

// Request Envelope for correlation
export interface WSMessageEnvelope<T = unknown> {
  id: string;          // UUID for correlation
  type: WSMessageType;
  payload: T;
  timestamp: number;
  ackRequired?: boolean;
}

export type WSMessage =
  | { type: 'create_room'; payload: CreateRoomInput }
  | { type: 'join_room'; payload: JoinRoomInput }
  | { type: 'rejoin_room'; payload: { roomCode: string; playerId: string; reconnectToken: string } }
  | { type: 'join_public_room'; payload: CreateRoomInput }
  | { type: 'room_created'; payload: { room: any; playerId: string; reconnectToken: string } }
  | { type: 'room_joined'; payload: { room: any; playerId: string; reconnectToken: string } }
  | { type: 'player_joined'; payload: { players: any[] } } // Refine later
  | { type: 'player_left'; payload: { players: any[] } } // Refine later
  | { type: 'player_ready'; payload: undefined | null | any }
  | { type: 'player_submitted'; payload: { playerId: string; submissionsCount: number; totalPlayers: number } }
  | { type: 'set_referee'; payload: { playerId: string } }
  | { type: 'remove_referee'; payload: undefined | null | any }
  | { type: 'start_game'; payload: undefined | null | any }
  | { type: 'round_start'; payload: { room: any } } // Refine later
  | { type: 'submit_answers'; payload: SubmitAnswersInput }
  | { type: 'bus_complete'; payload: { playerId?: string } | undefined | null | any }
  | { type: 'rush_mode'; payload: { room: any } } // Refine later
  | { type: 'round_end'; payload: { room: any } } // Refine later
  | { type: 'voting_start'; payload: { room: any; validatedAnswers: any[] } } // Refine later

  | { type: 'voting_complete'; payload: { room: any } } // Refine later
  | { type: 'referee_review_start'; payload: { room: any } } // Refine later
  | { type: 'referee_deduct'; payload: { playerId: string; category: string; reason: string } }
  | { type: 'referee_approve'; payload: undefined | null | any }
  | { type: 'round_results'; payload: { room: any } } // Refine later
  | { type: 'next_round'; payload: undefined | null | any }
  | { type: 'game_end'; payload: { room: any } } // Refine later
  | { type: 'error'; payload: { message: string; code?: string } }
  | { type: 'sync_state'; payload: { room: any } } // Refine later
  | { type: 'play_again'; payload: undefined | null | any }
  | { type: 'send_reaction'; payload: { reactionType: string } }
  | { type: 'reaction_received'; payload: { reaction: any } } // Refine later
  | { type: 'draft_update'; payload: { answers: Record<string, string> } }
  | { type: 'typing_status'; payload: { playerId: string; isTyping: boolean } }
  | { type: 'update_settings'; payload: UpdateSettingsInput }
  | { type: 'activate_powerup'; payload: { type: string; targetPlayerId?: string; category?: string } }
  | { type: 'powerup_activated'; payload: { type: PowerUpType; playerName: string } }
  | { type: 'wildcard_activated'; payload: { playerId: string; category: string } }
  | { type: 'player_banished'; payload: { playerId: string; banishedBy: string } }
  | { type: 'vote_update'; payload: { request: any } } // Refine later
  | { type: 'waiting_for_freeze_player'; payload: { targetPlayerId: string } }
  | { type: 'appeal_answer'; payload: { playerId: string; category: string; word: string } }
  | { type: 'appeal_result'; payload: { result: any } } // Refine later
  | { type: 'toast'; payload: { message: string; type?: string } }
  | { type: 'request_vote'; payload: { playerId: string; category: string; word: string } }
  | { type: 'vote_cast'; payload: { vote: any } } // Refine later
  | { type: 'cast_democratic_vote'; payload: { vote: any } } // Refine later
  | { type: 'vote_session_start'; payload: { session: any } } // Refine later
  | { type: 'vote_session_result'; payload: { result: any } } // Refine later
  | { type: 'referee_toggle_validity'; payload: { playerId: string; category: string } }
  | { type: 'referee_override'; payload: { requestId: string; category: string; accepted: boolean } }
  | { type: 'ping'; payload: { timestamp: number } }
  | { type: 'pong'; payload: undefined | null | any }
  | { type: 'cast_parallel_vote'; payload: { requesterId: string; category: string; vote: 'yes' | 'no' } }
  | { type: 'host_adjust_score'; payload: { targetPlayerId: string; delta: number } }
  | { type: 'host_resolve_votes'; payload: undefined | null | any }
  | { type: 'host_end_round'; payload: undefined | null | any }
  | { type: 'kick_player'; payload: { playerId: string } }
  | { type: 'kicked'; payload: { reason: string } }
  | { type: 'player_kicked'; payload: { playerId: string } }
  | { type: 'player_appeal'; payload: { targetPlayerId: string; category: string } }
  | { type: 'appeal_notification'; payload: { appeal: any } };

// Schemas for validation
export const createRoomSchema = z.object({
  playerName: z.string().min(1).max(20).trim()
});

export const joinRoomSchema = z.object({
  roomCode: z.string().length(4),
  playerName: z.string().min(1).max(20).trim()
});

export const rejoinRoomSchema = z.object({
  roomCode: z.string().length(4),
  playerId: z.string().uuid(),
  reconnectToken: z.string().min(1),
});

export const submitAnswersSchema = z.object({
  answers: z.record(z.string().max(100))
});

export const draftUpdateSchema = z.object({
  answers: z.record(z.string().max(100))
});


export const castParallelVoteSchema = z.object({
  requesterId: z.string(),
  category: z.string().min(1).max(30),
  vote: z.enum(['yes', 'no'])
});

export const requestVoteSchema = z.object({
  playerId: z.string(),
  category: z.string().min(1),
  word: z.string().min(1).max(100)
});

export const kickPlayerSchema = z.object({
  playerId: z.string()
});

export const hostAdjustScoreSchema = z.object({
  targetPlayerId: z.string(),
  delta: z.number().int().min(-1000).max(1000)
});

export const refereeToggleValiditySchema = z.object({
  playerId: z.string(),
  category: z.string().min(1)
});

export const refereeOverrideSchema = z.object({
  requestId: z.string(),
  category: z.string().min(1),
  accepted: z.boolean()
});

export const appealAnswerSchema = z.object({
  category: z.string().min(1).max(50),
  word: z.string().min(1).max(100).optional(),
});

export const activatePowerUpSchema = z.object({
  type: z.enum(['hint', 'steal', 'wildcard', 'banish']),
  targetPlayerId: z.string().optional(),
  category: z.string().max(30).optional(),
});

export const sendReactionSchema = z.object({
  reactionType: z.string().min(1).max(20)
});

export const setRefereeSchema = z.object({
  playerId: z.string()
});

// P1-4 FIX: Schemas for previously unvalidated payloads
export const playerAppealPayloadSchema = z.object({
  targetPlayerId: z.string(),
  category: z.string().min(1).max(50)
});

export const refereeDeductPayloadSchema = z.object({
  playerId: z.string(),
  category: z.string().min(1).max(50),
  reason: z.string().max(200)
});

export const updateSettingsSchema = z.object({
  totalRounds: z.number().int().min(1).max(20).optional(),
  roundDuration: z.number().int().min(30).max(300).optional(),
  customCategories: z.array(
    z.string().min(1).max(20).regex(/^[\p{L}\p{N}\s\-_]+$/u, 'الاسم يحتوي على رموز غير صالحة')
  ).max(10).optional(),
  votingEnabled: z.boolean().optional(),
  refereeEnabled: z.boolean().optional(),
}).passthrough(); // allow extra settings fields

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;

export type RequestVoteInput = z.infer<typeof requestVoteSchema>;
export type CastParallelVoteInput = z.infer<typeof castParallelVoteSchema>;
export type RefereeDeductInput = z.infer<typeof refereeDeductPayloadSchema>;
export type RefereeOverrideInput = z.infer<typeof refereeOverrideSchema>;
export type RefereeToggleValidityInput = z.infer<typeof refereeToggleValiditySchema>;
export type PlayerAppealInput = z.infer<typeof playerAppealPayloadSchema>;
export type AppealAnswerInput = z.infer<typeof appealAnswerSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type RejoinRoomInput = z.infer<typeof rejoinRoomSchema>;

// Legacy user types (keeping for compatibility)
export interface User {
  id: number;
  username: string;
  password: string;
}

export interface InsertUser {
  username: string;
  password: string;
}
