import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
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
export type Category = typeof categories[number] | string; // Allow custom categories

// Power-ups system
export type PowerUpType = 'hint' | 'steal' | 'wildcard' | 'banish';

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
  busStreak: number;
  avatar?: string;
  powerUps: PowerUps;
  usedPowerUps: UsedPowerUps; // Track one-time usage
  totalEarnedPoints: number;
  draftAnswers?: RoundAnswers; // Delta Sync support for live typing
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
  wildcardUsedByPlayerId?: string | null;
  wildcardAnswers?: Record<string, string>; // Generated answers for wildcard user
  banishedPlayerId?: string | null;
  banishedByPlayerId?: string | null;
  resultsCommitted?: boolean;
  busAnswer?: string;
  isComplete: boolean;
  busPlayerId?: string | null;
  voteEndTime?: number;
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
  eligibleVoterIds?: string[];
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
    enableVoting?: boolean; // New Toggle
  };
  auditLog?: AuditEntry[];
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
  | 'update_settings'
  | 'referee_toggle_unique'
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
  | 'patch_update'
  // FIX (#3): Phase 3 Player Appeal
  | 'player_appeal'
  | 'appeal_notification';

export interface WSMessage {
  type: WSMessageType;
  payload: any;
}

// Schemas for validation
export const createRoomSchema = z.object({
  playerName: z.string().min(2).max(20)
});

export const joinRoomSchema = z.object({
  roomCode: z.string().length(4),
  playerName: z.string().min(2).max(20)
});

export const submitAnswersSchema = z.object({
  answers: z.record(z.string())
});

export const voteSchema = z.object({
  playerId: z.string(),
  category: z.enum(categories),
  accepted: z.boolean()
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;
export type VoteInput = z.infer<typeof voteSchema>;

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
