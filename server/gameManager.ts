
import { WebSocket } from 'ws';
import { z } from 'zod';
import type { WSMessage, RoundAnswers, Category, PowerUpType, ReactionType, GameRoom, GamePhase } from '../shared/schema';
import {
  createRoomSchema, joinRoomSchema, rejoinRoomSchema, submitAnswersSchema, draftUpdateSchema,
  castParallelVoteSchema, requestVoteSchema, kickPlayerSchema, hostAdjustScoreSchema,
  refereeToggleValiditySchema, refereeOverrideSchema, appealAnswerSchema,
  activatePowerUpSchema, sendReactionSchema, setRefereeSchema, updateSettingsSchema,
  playerAppealPayloadSchema, refereeDeductPayloadSchema
} from '../shared/schema';
import { RoomManager } from './managers/RoomManager';
import { PlayerManager } from './managers/PlayerManager';
import { RoundManager } from './managers/RoundManager';
import { CorruptionProofBuffer } from './utils/reliability';
import { StateOrchestrator } from './persistence/StateOrchestrator';
import { WildcardService } from './services/wildcardService';
import { getRandomLetters } from '../shared/arabicWords';
import { randomUUID } from 'crypto';
import { reconnectService } from './container';

// V3 State Machine: Guard against invalid phase transitions
function canTransition(from: GamePhase, to: GamePhase): boolean {
  if (from === to) return true;
  const transitions: Record<GamePhase, GamePhase[]> = {
    lobby: ['playing'],
    playing: ['ai_processing', 'voting', 'results', 'referee_review', 'final'],
    ai_processing: ['voting', 'results', 'referee_review', 'final'],
    voting: ['results', 'referee_review', 'final'],
    results: ['referee_review', 'playing', 'final', 'lobby'],
    referee_review: ['results', 'playing', 'final', 'lobby'],
    final: ['lobby']
  };
  return transitions[from]?.includes(to) ?? false;
}

// FIX: Inline constants to avoid import path issues on HF deployment
const RUSH_MODE_DURATION_MS = 10000;
const HEARTBEAT_INTERVAL_MS = 30000;
const PONG_TIMEOUT_MS = 35000;

export class GameManager {
  private roomManager: RoomManager;
  private playerManager: PlayerManager;
  private roundManager: RoundManager;
  private stateOrchestrator: StateOrchestrator;

  // FIX (#13): Rate limiting to prevent WS flood attacks (50 msgs / 10s per socket)
  private readonly rateLimits = new WeakMap<WebSocket, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_COUNT = 100;
  private readonly RATE_LIMIT_WINDOW_MS = 10000;

  // P2-10 FIX: Room→Socket index for O(1) broadcasts
  private roomSocketIndex: Map<string, Set<WebSocket>> = new Map();

  // P2-11 FIX: Idempotency key to prevent double finishRoundPhase
  private finishedRounds: Set<string> = new Set();

  // V3-4 FIX: Idempotency key to prevent double endRound processing race
  private endedRounds: Set<string> = new Set();

  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastVoteTime: Map<string, number> = new Map();
  private VOTE_COOLDOWN_MS: number = 500;
  private busCompleteLocks: Map<string, string> = new Map();
  private lastTypingBroadcast: Map<string, { isTyping: boolean; at: number }> = new Map();
  private kickedPlayers: Map<string, Set<string>> = new Map();

  // Per-IP room creation rate limiting (5 rooms per 10 min)
  private readonly roomCreationLimits = new Map<string, { count: number; resetTime: number }>();
  private readonly ROOM_CREATION_LIMIT = 5;
  private readonly ROOM_CREATION_WINDOW_MS = 10 * 60 * 1000;

  private getClientIp(ws: WebSocket): string {
    const forwarded = (ws as any).forwardedFor || (ws as any)['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    const socket = (ws as any)._socket;
    if (socket?.remoteAddress) {
      return socket.remoteAddress;
    }
    const connId = (ws as any).id;
    if (connId) {
      return `conn:${connId}`;
    }
    const newId = randomUUID();
    (ws as any).id = newId;
    return `conn:${newId}`;
  }

  private checkRoomCreationLimit(ws: WebSocket): boolean {
    const ip = this.getClientIp(ws);
    const now = Date.now();
    const record = this.roomCreationLimits.get(ip);
    if (!record || now > record.resetTime) {
      this.roomCreationLimits.set(ip, { count: 1, resetTime: now + this.ROOM_CREATION_WINDOW_MS });
      return true;
    }
    if (record.count >= this.ROOM_CREATION_LIMIT) return false;
    record.count++;
    return true;
  }

  private validatePayload<T>(schema: z.ZodSchema<T>, payload: unknown): T | null {
    const result = schema.safeParse(payload);
    if (!result.success) {
      console.warn('[Validation] Invalid payload:', result.error.flatten());
      return null;
    }
    return result.data;
  }

  private checkRateLimit(ws: WebSocket, messageType?: string): boolean {
    // Draft updates are high-frequency but low-impact — don't count toward flood limit
    if (messageType === 'draft_update') return true;

    const now = Date.now();
    const record = this.rateLimits.get(ws);
    if (!record || now > record.resetTime) {
      this.rateLimits.set(ws, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW_MS });
      return true;
    }
    if (record.count >= this.RATE_LIMIT_COUNT) return false;
    record.count++;
    return true;
  }

  constructor() {
    // V3-14 & P1-1 FIX: Extended callback for deep room cleanup
    this.roomManager = new RoomManager((code) => {
      const prefix = code + ':';
      this.endedRounds.forEach(key => {
        if (key.startsWith(prefix)) this.endedRounds.delete(key);
      });
      this.finishedRounds.forEach(key => {
        if (key.startsWith(prefix)) this.finishedRounds.delete(key);
      });
      this.kickedPlayers.delete(code);
      this.roomSocketIndex.delete(code);
      this.roundManager.clearTimer(code);
      console.log(`[GameManager] Cleaned up all tracking for room ${code}`);
    });

    // FIX: PlayerManager now takes a timeout callback to remove dead players from rooms
    this.playerManager = new PlayerManager((playerId, roomId) => {
      this.handlePlayerTimeout(playerId, roomId);
    });

    this.roundManager = new RoundManager();
    this.stateOrchestrator = new StateOrchestrator(this.roomManager);
    this.initializePersistence();
    this.startHeartbeat();
    setInterval(() => this.runGhostCleanup(), 45000);
  }

  /** Remove players marked online but with no active socket (edge-case ghosts). */
  private runGhostCleanup() {
    for (const code of this.getAllRooms()) {
      const room = this.getRoom(code);
      if (!room) continue;
      for (const player of room.players) {
        if (!player.isOffline && !this.getPlayerSocket(player.id)) {
          console.log(`[GhostCleanup] Marking ghost offline: ${player.id} in ${code}`);
          this.roomManager.removePlayerFromRoom(code, player.id);
          const buffer = this.roomManager.getRoomBuffer(code);
          if (buffer && buffer.get().players.length > 0) {
            this.broadcastToRoom(code, { type: 'player_left', payload: { players: buffer.get().players } });
          }
        }
      }
    }
  }

  private async issueReconnectToken(playerId: string, roomCode: string): Promise<string> {
    try {
      return await reconnectService.issueToken(playerId, roomCode);
    } catch (e) {
      console.warn('[GameManager] Failed to issue reconnect token:', e);
      return `local_${playerId}_${Date.now()}`;
    }
  }

  private async validateReconnectToken(
    token: string,
    playerId: string,
    roomCode: string
  ): Promise<{ valid: boolean; newToken?: string }> {
    if (token.startsWith('local_')) {
      return token.includes(playerId) ? { valid: true, newToken: token } : { valid: false };
    }
    try {
      const session = await reconnectService.restore(token);
      if (!session) return { valid: false };
      const normCode = roomCode.toUpperCase();
      if (session.playerId !== playerId || session.roomId.toUpperCase() !== normCode) {
        return { valid: false };
      }
      return { valid: true, newToken: session.newToken };
    } catch (e) {
      console.warn('[GameManager] Reconnect token validation failed:', e);
      return { valid: false };
    }
  }

  public getAllRooms(): string[] {
    return this.roomManager.getAllRoomCodes();
  }

  public getRoomByPlayerId(playerId: string): string | undefined {
    return this.playerManager.getRoomId(playerId);
  }

  public getRoom(code: string): GameRoom | undefined {
    return this.roomManager.getRoom(code);
  }

  public getPlayerSocket(playerId: string): WebSocket | undefined {
    return this.playerManager.getSocket(playerId);
  }

  public removePlayerFromRoom(roomCode: string, playerId: string, hardDelete = false) {
    this.roomManager.removePlayerFromRoom(roomCode, playerId, hardDelete);
  }

  private sendError(ws: WebSocket, message: string) {
    this.send(ws, { type: 'error', payload: { message } });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const players = this.playerManager.getAllPlayers();
      for (const p of players) {
        if (p.ws.readyState === WebSocket.OPEN) {
          this.send(p.ws, { type: 'ping', payload: { timestamp: Date.now() } });
        }
      }

      // Garbage collect expired IP room creation limits
      const now = Date.now();
      for (const [ip, record] of this.roomCreationLimits.entries()) {
        if (now > record.resetTime) {
          this.roomCreationLimits.delete(ip);
        }
      }
    }, 10000);
  }

  private async initializePersistence() {
    await this.stateOrchestrator.loadState();
    this.stateOrchestrator.startAutoSave();
  }

  // ==========================================
  // Heartbeat / Timeout
  // ==========================================

  /**
   * Called by PlayerManager when a player's pong times out.
   * Treat it like a normal disconnect.
   */
  private handlePlayerTimeout(playerId: string, roomId: string) {
    console.log(`[GameManager] Player ${playerId} timed out (no pong).`);

    // GAP-1 FIX: Remove dead socket from index BEFORE removing from PlayerManager
    const ws = this.playerManager.getSocket(playerId);
    if (ws) this.removeSocketFromRoomIndex(roomId, ws);

    let oldHostId = '';
    const buffer = this.roomManager.getRoomBuffer(roomId);
    if (buffer) oldHostId = buffer.get().hostId;

    this.roomManager.removePlayerFromRoom(roomId, playerId);

    if (buffer) {
      const room = buffer.get();
      if (room.players.length > 0) {
        this.broadcastToRoom(room.code, { type: 'player_left', payload: { players: room.players } });

        // Host migration notification
        if (oldHostId !== room.hostId && room.hostId) {
          const newHostWs = this.playerManager.getSocket(room.hostId);
          if (newHostWs) {
            this.send(newHostWs, { type: 'toast', payload: { message: 'صرت مدير الغرفة عشان المدير القديم خرج!', type: 'success' } });
          }
        }
      }
    }

    this.cleanupPlayerVotes(roomId, playerId);
  }

  // ==========================================
  // Vote Timer (for backwards-compat if sequential mode used)
  // ==========================================

  private startVoteTimer(roomCode: string) {
    this.roundManager.setRoundTimer(roomCode, () => {
      this.handleVoteTimeout(roomCode);
    }, 15000); // 15 seconds per sequential vote (legacy)
  }

  private handleVoteTimeout(roomCode: string) {
    const buffer = this.roomManager.getRoomBuffer(roomCode);
    if (!buffer) return;

    let allVotesDone = false;

    buffer.transact(draft => {
      if (draft.phase !== 'voting') return;

      // FIX: Resolve any remaining parallel vote items
      if (draft.currentVote) {
        this.resolveCurrentVoteInDraft(draft);
        if (!draft.currentVote) allVotesDone = true;
      } else if (draft.voteQueue && draft.voteQueue.length > 0) {
        // Parallel mode: resolve all remaining votes in queue with timeout logic
        const resolvedItems: any[] = [];
        for (const item of draft.voteQueue) {
          const ans = draft.rounds[draft.currentRound]?.validatedAnswers.find(
            (a: any) => a.playerId === item.requesterId && a.category === item.category
          );
          if (ans && ans.isPendingVote) {
            const { yes = 0, no = 0 } = (item as any).votes || {};
            ans.isValid = yes > no;
            ans.isPendingVote = false;
            ans.reason = ans.isValid ? 'تم قبوله (انتهاء الوقت)' : 'تم رفضه (انتهاء الوقت - تعادل أو أغلبية رفض)';
            resolvedItems.push(item);
          }
        }

        // Remove resolved items safely
        draft.voteQueue = draft.voteQueue.filter((item: any) =>
          !resolvedItems.some(r => r.requesterId === item.requesterId && r.category === item.category)
        );

        if (draft.voteQueue.length === 0) {
          this.roundManager.calculateAnswerScores(draft);
          allVotesDone = true;
        }
      } else {
        allVotesDone = true;
      }
    }, "handleVoteTimeout");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    if (allVotesDone) {
      this.roundManager.clearTimer(room.code);
      this.finishRoundPhase(room.code);
    } else {
      this.startVoteTimer(roomCode);
    }
  }

  handleMessage(ws: WebSocket, message: WSMessage): void {
    if (!this.checkRateLimit(ws, message.type)) {
      console.warn(`[GameManager] Rate limit exceeded by connection. Closing socket.`);
      try { ws.close(1008, 'Rate limit exceeded'); } catch { }
      return;
    }

    const invalid = () => this.send(ws, { type: 'error', payload: { code: 'INVALID_PAYLOAD', message: 'بيانات غير صالحة' } });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[GameManager] Received: ${message.type}`);
    }
    try {
      switch (message.type) {
        case 'create_room': {
          const p = this.validatePayload(createRoomSchema, message.payload);
          if (!p) return invalid();
          this.createRoom(ws, p.playerName);
          break;
        }
        case 'join_room': {
          const p = this.validatePayload(joinRoomSchema, message.payload);
          if (!p) return invalid();
          this.joinRoom(ws, p.roomCode, p.playerName);
          break;
        }
        case 'rejoin_room': {
          const p = this.validatePayload(rejoinRoomSchema, message.payload);
          if (!p) return invalid();
          void this.rejoinRoom(ws, p.roomCode, p.playerId, p.reconnectToken);
          break;
        }
        case 'join_public_room': {
          const p = this.validatePayload(createRoomSchema, message.payload); // same shape
          if (!p) return invalid();
          this.joinPublicRoom(ws, p.playerName);
          break;
        }
        case 'player_ready': this.setReady(ws); break;
        case 'start_game': this.startGame(ws); break;
        case 'submit_answers': {
          const p = this.validatePayload(submitAnswersSchema, message.payload);
          if (!p) return invalid();
          this.submitAnswers(ws, p.answers);
          break;
        }
        case 'bus_complete': this.triggerBusComplete(ws); break;
        case 'next_round': this.nextRound(ws); break;
        case 'play_again': this.playAgain(ws); break;
        case 'set_referee': {
          const p = this.validatePayload(setRefereeSchema, message.payload);
          if (!p) return invalid();
          this.setReferee(ws, p.playerId);
          break;
        }
        case 'remove_referee': this.removeReferee(ws); break;
        case 'referee_approve': this.refereeApprove(ws); break;
        case 'update_settings': {
          const p = this.validatePayload(updateSettingsSchema, message.payload);
          if (!p) return invalid();
          this.updateSettings(ws, p);
          break;
        }
        case 'draft_update': {
          const p = this.validatePayload(draftUpdateSchema, message.payload);
          if (!p) return invalid();
          this.handleDraftUpdate(ws, p.answers);
          break;
        }
        case 'activate_powerup': {
          const p = this.validatePayload(activatePowerUpSchema, message.payload);
          if (!p) return invalid();
          this.activatePowerUp(ws, p);
          break;
        }
        case 'send_reaction': {
          const p = this.validatePayload(sendReactionSchema, message.payload);
          if (!p) return invalid();
          this.sendReaction(ws, p.reactionType as ReactionType);
          break;
        }
        case 'request_vote': {
          const p = this.validatePayload(requestVoteSchema, message.payload);
          if (!p) return invalid();
          this.requestVote(ws, p);
          break;
        }
        case 'cast_parallel_vote': {
          const p = this.validatePayload(castParallelVoteSchema, message.payload);
          if (!p) return invalid();
          this.castParallelVote(ws, p);
          break;
        }
        case 'player_appeal': {
          // P1-4 FIX: Validate payload with Zod schema
          const appealP = this.validatePayload(playerAppealPayloadSchema, message.payload);
          if (!appealP) return invalid();
          this.handlePlayerAppeal(ws, appealP);
          break;
        }
        case 'referee_toggle_validity': {
          const p = this.validatePayload(refereeToggleValiditySchema, message.payload);
          if (!p) return invalid();
          this.refereeToggleValidity(ws, p);
          break;
        }
        case 'pong':
          this.playerManager.recordPong(ws);
          break;
        case 'host_end_round': {
          const hostP = this.playerManager.getPlayer(ws);
          if (hostP) {
            const buffer = this.roomManager.getRoomBuffer(hostP.roomId);
            if (buffer && buffer.get().players.find(pl => pl.id === hostP.playerId)?.isHost) {
              this.endRound(hostP.roomId);
            }
          }
          break;
        }
        case 'host_resolve_votes':
          this.hostResolveVotes(ws);
          break;
        case 'kick_player': {
          const p = this.validatePayload(kickPlayerSchema, message.payload);
          if (!p) return invalid();
          const player = this.playerManager.getPlayer(ws);
          if (!player) break;
          const roomCode = this.playerManager.getRoomId(player.playerId);
          if (!roomCode) {
            this.sendError(ws, 'أنت لست في غرفة');
            break;
          }
          const buffer = this.roomManager.getRoomBuffer(roomCode);
          if (!buffer || buffer.get().hostId !== player.playerId) {
            this.sendError(ws, 'فقط المضيف يمكنه طرد اللاعبين');
            break;
          }
          this.kickPlayer(ws, p.playerId);
          break;
        }
        case 'host_adjust_score': {
          const p = this.validatePayload(hostAdjustScoreSchema, message.payload);
          if (!p) return invalid();
          this.hostAdjustScore(ws, p);
          break;
        }
        case 'referee_deduct': {
          // P1-4 FIX: Validate payload with Zod schema
          const deductP = this.validatePayload(refereeDeductPayloadSchema, message.payload);
          if (!deductP) return invalid();
          this.refereeDeduct(ws, deductP);
          break;
        }
        case 'referee_override': {
          const p = this.validatePayload(refereeOverrideSchema, message.payload);
          if (!p) return invalid();
          this.refereeOverride(ws, p);
          break;
        }
        case 'appeal_answer': {
          const p = this.validatePayload(appealAnswerSchema, message.payload);
          if (!p) return invalid();
          this.appealAnswer(ws, { category: p.category as Category });
          break;
        }
        default: {
          const unknownType = (message as any).type;
          console.warn(`[GameManager] Unknown message type: ${unknownType}`);
          this.send(ws, { type: 'error', payload: { code: 'UNKNOWN_TYPE', message: `نوع رسالة غير معروف: ${unknownType}` } });
          break;
        }
      }
    } catch (e: any) {
      console.error(`[GameManager] Error handling ${message.type}:`, e);
      this.send(ws, { type: 'error', payload: { message: e.message || 'Error occurred' } });
    }
  }

  private cleanupPlayerVotes(roomId: string, playerId: string) {
    const buffer = this.roomManager.getRoomBuffer(roomId);
    if (!buffer) return;

    let shouldFinishVoting = false;
    buffer.transact(draft => {
      if (draft.voteQueue) {
        // Remove any vote items that belong to this player (their answer was pending)
        draft.voteQueue = draft.voteQueue.filter((v: any) => v.requesterId !== playerId);

        draft.voteQueue.forEach((v: any) => {
          // Remove from eligible list
          if (v.eligibleVoterIds) {
            v.eligibleVoterIds = v.eligibleVoterIds.filter((id: string) => id !== playerId);
          }

          if (v.voterIds && v.voterIds.includes(playerId)) {
            v.voterIds = v.voterIds.filter((id: string) => id !== playerId);
            if (v.voteMap && v.voteMap[playerId]) {
              const direction = v.voteMap[playerId];
              if (direction === 'yes' && v.votes?.yes > 0) v.votes.yes--;
              else if (direction === 'no' && v.votes?.no > 0) v.votes.no--;
              delete v.voteMap[playerId];
            } else if (v.votes) {
              const newTotal = v.eligibleVoterIds?.length ?? 0;
              const currentTotal = (v.votes.yes ?? 0) + (v.votes.no ?? 0);
              if (currentTotal > newTotal) {
                if ((v.votes.no ?? 0) > 0) v.votes.no = Math.max(0, (v.votes.no ?? 0) - 1);
                else v.votes.yes = Math.max(0, (v.votes.yes ?? 0) - 1);
              }
            }
          }
        });
      }

      if (draft.phase === 'voting' && draft.voteQueue) {
        draft.voteQueue = draft.voteQueue.filter((v: any) => {
          if ((v.eligibleVoterIds?.length || 0) === 0) {
            const ans = draft.rounds[draft.currentRound]?.validatedAnswers.find(
              (a: any) => a.playerId === v.requesterId && a.category === v.category
            );
            if (ans) {
              ans.isValid = false;
              ans.isPendingVote = false;
              ans.reason = 'رفض تلقائي — لا ناخبين متبقين';
            }
            return false;
          }
          return true;
        });

        const stillPending = draft.rounds[draft.currentRound]?.validatedAnswers
          .some((a: any) => a.isPendingVote);
        if (draft.voteQueue.length === 0 && !stillPending) {
          this.roundManager.calculateAnswerScores(draft);
          shouldFinishVoting = true;
        }
      }
    }, `cleanupPlayerVotes:${playerId}`);

    if (shouldFinishVoting) {
      const room = buffer.get();
      this.roundManager.clearTimer(room.code);
      this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
      this.finishRoundPhase(room.code);
    }
  }

  handleDisconnect(ws: WebSocket): void {
    if ((ws as any)._disconnected) return;
    (ws as any)._disconnected = true;

    // GM1: Explicit cleanup of WeakMap entry on disconnect
    this.rateLimits.delete(ws);

    // Robust cleanup: ensure ws is removed from all room indices regardless of player state 
    // to prevent memory leaks if socket was added without full registration.
    for (const [code, sockets] of this.roomSocketIndex.entries()) {
      if (sockets.has(ws)) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          this.roomSocketIndex.delete(code);
        }
      }
    }

    const playerInfo = this.playerManager.removePlayer(ws);
    if (!playerInfo) return;

    // GM3: Clean up lastVoteTime entry when player leaves
    this.lastVoteTime.delete(playerInfo.playerId);

    let oldHostId = '';
    const buffer = this.roomManager.getRoomBuffer(playerInfo.roomId);
    if (buffer) oldHostId = buffer.get().hostId;

    this.roomManager.removePlayerFromRoom(playerInfo.roomId, playerInfo.playerId);

    if (buffer) {
      const room = buffer.get();
      if (room.players.length > 0) {
        this.broadcastToRoom(room.code, { type: 'player_left', payload: { players: room.players } });

        // Host migration notification
        if (oldHostId !== room.hostId && room.hostId) {
          const newHostWs = this.playerManager.getSocket(room.hostId);
          if (newHostWs) {
            this.send(newHostWs, { type: 'toast', payload: { message: 'صرت مدير الغرفة عشان المدير القديم خرج!', type: 'success' } });
          }
        }
      }
    }

    this.cleanupPlayerVotes(playerInfo.roomId, playerInfo.playerId);
  }

  // FIX (#5): Missing Session Reconnection Logic
  async rejoinRoom(ws: WebSocket, roomCode: string, playerId: string, reconnectToken: string): Promise<void> {
    if (!roomCode || !playerId || !reconnectToken) {
      return this.send(ws, { type: 'error', payload: { message: 'بيانات غير مكتملة' } });
    }

    const normCode = roomCode.toUpperCase();
    const kicked = this.kickedPlayers.get(normCode) ?? this.kickedPlayers.get(roomCode);
    if (kicked?.has(playerId)) {
      return this.send(ws, { type: 'error', payload: { message: 'تم طردك من هذه الغرفة ولا يمكنك العودة' } });
    }

    const tokenResult = await this.validateReconnectToken(reconnectToken, playerId, normCode);
    if (!tokenResult.valid) {
      return this.send(ws, { type: 'error', payload: { message: 'انتهت صلاحية الجلسة — انضم من جديد' } });
    }

    const buffer = this.roomManager.getRoomBuffer(normCode);
    if (!buffer) return this.send(ws, { type: 'error', payload: { message: 'الغرفة غير موجودة' } });

    const room = buffer.getUnsafe();
    const player = room.players.find(p => p.id === playerId);
    if (!player) return this.send(ws, { type: 'error', payload: { message: 'اللاعب غير موجود في هذه الغرفة' } });

    buffer.transact(draft => {
      const p = draft.players.find(pl => pl.id === playerId);
      if (p) {
        p.isOffline = false;
        p.isReady = false;
      }
    }, "rejoinRoom Offline Clear");

    const oldSocket = this.playerManager.getSocket(playerId);
    if (oldSocket) {
      this.removeSocketFromRoomIndex(room.code, oldSocket);
      this.playerManager.removePlayer(oldSocket);
      try { oldSocket.close(); } catch { }
    }

    this.playerManager.addPlayer(ws, room.code, playerId);
    this.addSocketToRoomIndex(room.code, ws);

    const freshToken = tokenResult.newToken ?? await this.issueReconnectToken(playerId, room.code);
    this.send(ws, { type: 'room_joined', payload: { room: buffer.get(), playerId, reconnectToken: freshToken } });
    this.broadcastToRoom(room.code, { type: 'player_joined', payload: { players: buffer.get().players } });
  }

  // ==========================================
  // Room Logic
  // ==========================================

  createRoom(ws: WebSocket, playerName: string): void {
    // Per-IP rate limit: max 5 rooms per 10 minutes
    if (!this.checkRoomCreationLimit(ws)) {
      this.send(ws, { type: 'error', payload: { message: 'لقد أنشأت عدداً كبيراً من الغرف مؤخراً، انتظر قليلاً' } });
      return;
    }

    // FIX: Validate player name before doing anything
    const name = (playerName || '').trim();
    if (!name || name.length < 1) {
      this.send(ws, { type: 'error', payload: { message: 'الاسم مطلوب' } });
      return;
    }

    // FIX: Generate one ID, create room, register player ONCE — no double-registration
    const hostId = crypto.randomUUID();

    try {
      const { room } = this.roomManager.createRoom(hostId, name);
      this.playerManager.addPlayer(ws, room.code, hostId);
      this.addSocketToRoomIndex(room.code, ws);

      void this.issueReconnectToken(hostId, room.code).then(token => {
        this.send(ws, {
          type: 'room_created',
          payload: { room, playerId: hostId, reconnectToken: token }
        });
      });
    } catch (e: any) {
      this.send(ws, { type: 'error', payload: { message: e.message } });
    }
  }

  joinRoom(ws: WebSocket, roomCode: string, playerName: string): void {
    const code = (roomCode || '').trim().toUpperCase();
    const name = (playerName || '').trim();

    // FIX (#7): Simple Input Validation
    if (!code || code.length !== 4) return this.send(ws, { type: 'error', payload: { message: 'كود الغرفة غير صحيح' } });
    if (!name || name.length < 1 || name.length > 20) return this.send(ws, { type: 'error', payload: { message: 'الاسم غير صالح' } });

    const buffer = this.roomManager.getRoomBuffer(code);
    if (!buffer) {
      this.send(ws, { type: 'error', payload: { message: 'الغرفة غير موجودة' } });
      return;
    }

    const normCode = roomCode.toUpperCase();
    const playerId = crypto.randomUUID();

    try {
      const room = this.roomManager.joinRoom(normCode, playerId, name);
      this.playerManager.addPlayer(ws, room.code, playerId);
      this.addSocketToRoomIndex(room.code, ws);

      void this.issueReconnectToken(playerId, room.code).then(token => {
        this.send(ws, { type: 'room_joined', payload: { room, playerId, reconnectToken: token } });
        this.broadcastToRoom(room.code, { type: 'player_joined', payload: { players: room.players } }, ws);
      });
    } catch (e: any) {
      this.send(ws, { type: 'error', payload: { message: e.message } });
    }
  }

  joinPublicRoom(ws: WebSocket, playerName: string): void {
    const name = (playerName || '').trim();
    if (!name || name.length < 1) {
      this.send(ws, { type: 'error', payload: { message: 'الاسم مطلوب' } });
      return;
    }

    const playerId = crypto.randomUUID();
    try {
      const room = this.roomManager.joinPublicRoom(playerId, name);
      this.playerManager.addPlayer(ws, room.code, playerId);
      this.addSocketToRoomIndex(room.code, ws);

      void this.issueReconnectToken(playerId, room.code).then(token => {
        this.send(ws, { type: 'room_joined', payload: { room, playerId, reconnectToken: token } });
        this.broadcastToRoom(room.code, { type: 'player_joined', payload: { players: room.players } }, ws);
      });
    } catch (e: any) {
      this.send(ws, { type: 'error', payload: { message: e.message } });
    }
  }

  // ==========================================
  // Game Flow
  // ==========================================

  setReady(ws: WebSocket): void {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
      const player = draft.players.find(pl => pl.id === p.playerId);
      if (player) player.isReady = true;
    }, "setReady");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'player_ready', payload: { players: room.players } });
  }

  startGame(ws: WebSocket): void {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    const room = buffer.get();
    // FIX: Phase guard — can only start from lobby, prevents re-starting mid-game
    if (room.phase !== 'lobby') {
      this.send(ws, { type: 'error', payload: { message: 'اللعبة جارية بالفعل' } });
      return;
    }
    const host = room.players.find(pl => pl.id === p.playerId);
    if (!host?.isHost) {
      this.send(ws, { type: 'error', payload: { message: 'فقط المدير يقدر يبدأ اللعبة' } });
      return;
    }

    // D4 FIX: Ensure all other online players are ready
    const otherPlayers = room.players.filter(
      pl => !pl.isOffline && pl.id !== p.playerId && pl.id !== room.refereeId
    );
    if (otherPlayers.length > 0 && !otherPlayers.every(pl => pl.isReady)) {
      this.send(ws, { type: 'error', payload: { message: 'مش كل اللاعبين جاهزين' } });
      return;
    }

    const round = this.roundManager.startRound(buffer);

    const updated = buffer.get();
    this.broadcastToRoom(updated.code, { type: 'round_start', payload: { room: updated } });

    this.roundManager.setRoundTimer(updated.code, () => {
      this.endRound(updated.code);
    });
  }

  submitAnswers(ws: WebSocket, answers: RoundAnswers): void {
    // FIX (#7): Validation
    if (!answers || typeof answers !== 'object' || Object.keys(answers).length > 10) {
      this.send(ws, { type: 'error', payload: { message: 'رد غير صالح' } });
      return;
    }

    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    const roomBefore = buffer.get();
    if (roomBefore.phase !== 'playing') {
      this.send(ws, { type: 'error', payload: { message: 'انتهى وقت الإجابة' } });
      return;
    }
    const roundBefore = roomBefore.rounds[roomBefore.currentRound];
    if (roundBefore?.endRoundInProgress) {
      this.send(ws, { type: 'error', payload: { message: 'جاري معالجة الجولة' } });
      return;
    }
    if (roundBefore?.banishedPlayerId === p.playerId) {
      this.send(ws, { type: 'error', payload: { message: 'لا يمكنك الإرسال — تم طردك من الجولة' } });
      return;
    }

    const { isComplete, round } = this.roundManager.handleSubmission(buffer, p.playerId, answers);

    const room = buffer.get();
    const activePlayers = room.refereeId
      ? room.players.filter(pl => !pl.isOffline && pl.id !== room.refereeId && pl.id !== round.banishedPlayerId).length
      : room.players.filter(pl => !pl.isOffline && pl.id !== round.banishedPlayerId).length;

    this.broadcastToRoom(room.code, {
      type: 'player_submitted',
      payload: {
        playerId: p.playerId,
        submissionsCount: round.submissions.length,
        totalPlayers: activePlayers
      }
    });

    if (isComplete) {
      this.endRound(room.code);
    }
  }

  triggerBusComplete(ws: WebSocket): void {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    const roomSnapshot = buffer.get();
    const lockKey = `${p.roomId}:${roomSnapshot.currentRound}`;
    if (this.busCompleteLocks.get(lockKey)) return;
    this.busCompleteLocks.set(lockKey, p.playerId);

    let startedRush = false;
    buffer.transact(draft => {
      // BUG-4 FIX: Crucial guard! If we are no longer playing (e.g. they submitted at the very last
      // millisecond and phase shifted to voting/results), DO NOT start rush mode and overwrite timers
      if (draft.phase !== 'playing') return;

      const round = draft.rounds[draft.currentRound];
      if (!round || round.isRush || round.endRoundInProgress) return;
      if (round.banishedPlayerId === p.playerId) return;

      const sub = round.submissions.find(s => s.playerId === p.playerId);
      if (!sub || sub.busComplete) return; // FIX: Prevent double-fire if already bus-completed

      sub.busComplete = true;
      round.isRush = true;
      round.endTime = Date.now() + RUSH_MODE_DURATION_MS;
      startedRush = true;
    }, "triggerBusComplete");

    if (startedRush) {
      const room = buffer.get();
      this.broadcastToRoom(room.code, { type: 'rush_mode', payload: { room } });

      this.roundManager.setRoundTimer(room.code, () => {
        this.endRound(room.code);
        this.busCompleteLocks.delete(lockKey);
      }, RUSH_MODE_DURATION_MS);
    } else {
      this.busCompleteLocks.delete(lockKey);
    }
  }

  private endRound(roomCode: string) {
    const buffer = this.roomManager.getRoomBuffer(roomCode);
    if (!buffer) return;

    // V3-4 CRITICAL GUARD: Prevent double-processing via race conditions
    const room = buffer.get();
    // P2-16 FIX: Reject stale timer that fires after phase already advanced
    if (room.phase !== 'playing') {
      console.log(`[endRound] Room ${roomCode} phase='${room.phase}', skipping stale timer`);
      return;
    }
    const roundKey = `${roomCode}:${room.currentRound}`;
    if (this.endedRounds.has(roundKey)) {
      console.log(`[endRound] Round ${roundKey} already ended, skipping`);
      return;
    }
    this.endedRounds.add(roundKey);
    if (this.endedRounds.size > 50) {
      const first = this.endedRounds.values().next().value;
      if (first) this.endedRounds.delete(first);
    }

    this.roundManager.clearTimer(roomCode);
    this.busCompleteLocks.delete(`${roomCode}:${room.currentRound}`);

    // Draft Rescue Logic
    buffer.transact(draft => {
      draft.phase = 'ai_processing';
      const round = draft.rounds[draft.currentRound];
      if (!round) return;

      if (round.endRoundInProgress) return;
      round.endRoundInProgress = true;

      const active = draft.players.filter(
        pl => !pl.isOffline && pl.id !== draft.refereeId && pl.id !== round?.banishedPlayerId
      );

      for (const player of active) {
        if (!round.submissions.some(s => s.playerId === player.id)) {
          let answers: RoundAnswers = {};
          if (player.draftAnswers && Object.keys(player.draftAnswers).length > 0) {
            answers = player.draftAnswers;
          } else {
            (draft.settings?.customCategories || ['ولد', 'بنت', 'بلد', 'حيوان', 'جماد']).forEach(c => answers[c] = '');
          }

          round.submissions.push({
            playerId: player.id,
            playerName: player.name,
            answers,
            submittedAt: Date.now(),
            busComplete: false
          });
        }

        // Clean up drafts for all players after round ends
        player.draftAnswers = undefined;
      }
    }, "endRound_rescue");

    const updatedRoom = buffer.get();
    this.broadcastToRoom(updatedRoom.code, { type: 'sync_state', payload: { room: updatedRoom } });

    this.roundManager.processRoundWithAI(buffer, () => {
      // On Voting Start (parallel mode)
      const r = buffer.get();

      // FIX (#6): Push voteEndTime down to the round state to reliably sync the client 30 second timer
      buffer.transact((d) => {
        const currentRoundData = d.rounds[d.currentRound];
        if (currentRoundData) {
          currentRoundData.voteEndTime = Date.now() + 30000;
        }
      }, "sync_voteEndTime");

      // FIX (#15): Add server-side logging for the broadcasted vote queue
      const syncedRoom = buffer.get();
      console.log(`[VoteQueue] Broadcasted for room ${syncedRoom.code}: ${syncedRoom.voteQueue?.length || 0} items`);
      if (syncedRoom.voteQueue) syncedRoom.voteQueue.forEach((item, i) => console.log(`  ${i}: [${item.category}] - ${item.word}`));

      this.broadcastToRoom(syncedRoom.code, {
        type: 'voting_start',
        payload: { room: syncedRoom, validatedAnswers: syncedRoom.rounds[syncedRoom.currentRound].validatedAnswers }
      });

      // Start a single timer for the entire parallel vote session (30 seconds for all)
      this.roundManager.setRoundTimer(syncedRoom.code, () => {
        this.handleVoteTimeout(syncedRoom.code);
      }, 30000);
    }, () => {
      const r = buffer.get();
      this.finishRoundPhase(r.code);
    });
  }

  private finishRoundPhase(roomCode: string) {
    try {
      this.roundManager.clearTimer(roomCode);

      const buffer = this.roomManager.getRoomBuffer(roomCode);
      if (!buffer) return;

      const roomBefore = buffer.get();
      const canGoToRefereeReview =
        (roomBefore.phase === 'playing' || roomBefore.phase === 'voting' || roomBefore.phase === 'ai_processing') && !!roomBefore.refereeId;
      const idempotencyKey = canGoToRefereeReview
        ? `${roomCode}:${roomBefore.currentRound}:referee_review`
        : `${roomCode}:${roomBefore.currentRound}:results`;

      if (this.finishedRounds.has(idempotencyKey)) {
        console.log(`[FinishRoundPhase] Already processed ${idempotencyKey}, skipping.`);
        return;
      }

      let autoStart = false;
      let currentRound = 0;
      let totalRounds = 0;
      let transitionSucceeded = false;

      buffer.transact(draft => {
        const round = draft.rounds[draft.currentRound];
        if (round) {
          round.powerUpUsedInRound = false;
          const frozenId = (round as any).frozenPlayerId;
          if (frozenId) {
            const frozenPlayer = draft.players.find(pl => pl.id === frozenId);
            if (frozenPlayer) (frozenPlayer as any).isFrozen = false;
            (round as any).frozenPlayerId = null;
          }
        }

        const canGoToReferee = (draft.phase === 'playing' || draft.phase === 'voting' || draft.phase === 'ai_processing') && !!draft.refereeId;
        const targetPhase = canGoToReferee ? 'referee_review' : 'results';

        if (!canTransition(draft.phase, targetPhase)) {
          console.error(`[finishRoundPhase] Invalid transition: ${draft.phase} → ${targetPhase}`);
          return;
        }

        if (canGoToReferee) {
          draft.phase = 'referee_review';
          transitionSucceeded = true;
        } else {
          if (round?.resultsCommitted) return;

          draft.phase = 'results';
          this.roundManager.commitRoundResults(draft);
          transitionSucceeded = true;

          if (!draft.refereeId && !draft.settings?.votingEnabled) {
            draft.nextRoundAt = Date.now() + 20000;
            autoStart = true;
          }
        }

        currentRound = draft.currentRound;
        totalRounds = draft.totalRounds;
      }, "finishRoundPhase");

      if (!transitionSucceeded) return;

      this.finishedRounds.add(idempotencyKey);
      if (this.finishedRounds.size > 200) {
        const first = this.finishedRounds.values().next().value;
        if (first) this.finishedRounds.delete(first);
      }

      const room = buffer.get();
      this.broadcastToRoom(room.code, { type: 'round_results', payload: { room } });

      if (autoStart && currentRound < totalRounds - 1) {
        this.roundManager.setRoundTimer(room.code, () => {
          const check = this.roomManager.getRoomBuffer(room.code)?.get();
          if (check && check.phase === 'results' && check.currentRound === currentRound) {
            this.nextRoundByRoomCode(room.code);
          }
        }, 20000);
      } else if (currentRound >= totalRounds - 1) {
        this.roundManager.setRoundTimer(room.code, () => {
          const check = this.roomManager.getRoomBuffer(room.code)?.get();
          if (check && check.phase === 'results') {
            this.handleGameEnd(check.code);
          }
        }, 20000);
      }
    } catch (e: any) {
      console.error(`[FinishRoundPhase] Error in room ${roomCode}:`, e);
    }
  }

  nextRound(ws: WebSocket) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    // FIX: Only host can trigger next round
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;
    const room = buffer.get();
    if (!room.players.find(pl => pl.id === p.playerId)?.isHost) return;

    // V3-2 CRITICAL GUARD: Only allow next round from results or referee_review phase
    if (room.phase !== 'results' && room.phase !== 'referee_review') {
      this.send(ws, {
        type: 'error',
        payload: { message: 'يمكنك الانتقال للجولة التالية فقط بعد عرض النتائج' }
      });
      return;
    }

    this.nextRoundByRoomCode(p.roomId);
  }

  private nextRoundByRoomCode(roomCode: string) {
    // GM6: Always clear any pending timers before advancing to prevent double-fire
    this.roundManager.clearTimer(roomCode);

    const buffer = this.roomManager.getRoomBuffer(roomCode);
    if (!buffer) return;

    const room = buffer.get();
    if (room.currentRound >= room.totalRounds - 1) {
      if (room.phase === 'referee_review') {
        this.finishRoundPhase(roomCode);
      }
      this.handleGameEnd(roomCode);
      return;
    }

    // Must commit referee review before advancing rounds
    if (room.phase === 'referee_review') {
      this.finishRoundPhase(roomCode);
      const afterReview = buffer.get();
      if (afterReview.phase !== 'results') return;
    } else if (room.phase === 'results') {
      const round = room.rounds[room.currentRound];
      if (round && !round.resultsCommitted) {
        buffer.transact(draft => {
          this.roundManager.commitRoundResults(draft);
        }, 'nextRoundCommit');
      }
    }

    buffer.transact(draft => {
      draft.currentRound++;
    }, "nextRoundInc");

    // startRound now clears voteQueue/currentVote internally
    this.roundManager.startRound(buffer);
    const updated = buffer.get();

    this.broadcastToRoom(updated.code, { type: 'round_start', payload: { room: updated } });
    this.roundManager.setRoundTimer(updated.code, () => this.endRound(updated.code));
  }

  private handleGameEnd(roomCode: string) {
    const buffer = this.roomManager.getRoomBuffer(roomCode);
    if (!buffer) return;

    buffer.transact(draft => {
      draft.phase = 'final';
    }, "gameEnd");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'game_end', payload: { room } });

    // FIX: Auto-restart public rooms after 15 seconds
    if (room.isPublicRoom) {
      this.roundManager.setRoundTimer(roomCode, () => {
        const check = this.roomManager.getRoomBuffer(roomCode)?.get();
        if (check && check.phase === 'final') {
          this.forcePlayAgain(roomCode);
        }
      }, 15000);
    }
  }

  // ==========================================
  // Misc / Setters / Powerups
  // ==========================================

  handleDraftUpdate(ws: WebSocket, answers: RoundAnswers) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer || buffer.get().phase !== 'playing') return;

    const room = buffer.get();
    const round = room.rounds[room.currentRound];
    if (round?.banishedPlayerId === p.playerId || round?.endRoundInProgress) return;

    const isTyping = Object.values(answers).some(v => v.trim() !== '');
    const typingKey = `${p.roomId}:${p.playerId}`;
    const prev = this.lastTypingBroadcast.get(typingKey);
    const now = Date.now();
    if (prev && prev.isTyping === isTyping && now - prev.at < 1500) return;

    buffer.transact(draft => {
      const player = draft.players.find(pl => pl.id === p.playerId);
      if (player) {
        player.draftAnswers = answers;
      }
    }, 'draft_update');

    this.lastTypingBroadcast.set(typingKey, { isTyping, at: now });
    this.broadcastToRoom(p.roomId, {
      type: 'typing_status',
      payload: { playerId: p.playerId, isTyping }
    });
  }

  updateSettings(ws: WebSocket, settings: any) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
      const isHost = draft.players.find(pl => pl.id === p.playerId)?.isHost;
      if (!isHost) return;

      if (draft.phase === 'lobby') {
        if (settings.customCategories) draft.settings = { ...draft.settings, customCategories: settings.customCategories };

        if (settings.totalRounds !== undefined) {
          const val = Math.max(3, Math.min(20, Number(settings.totalRounds)));
          if (!isNaN(val)) {
            draft.totalRounds = val;
            // FIX-AUTO-2: Fill new slots with proper random letters, not the literal character 'س'
            const freshLetters = getRandomLetters(val);
            draft.letters = Array.from({ length: val }, (_, i) => draft.letters[i] || freshLetters[i]);
          }
        }
      }

      if (settings.votingEnabled !== undefined) {
        if (!draft.settings) draft.settings = {};
        draft.settings.votingEnabled = settings.votingEnabled;

        if (settings.votingEnabled && draft.refereeId) {
          draft.refereeId = undefined;
          draft.players.forEach(pl => pl.isReferee = false);
          if (draft.phase === 'referee_review') {
            draft.phase = 'results';
          }
        }
      }
    }, "settings");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  setReferee(ws: WebSocket, targetId: string) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
      if (!draft.players.find(pl => pl.id === p.playerId)?.isHost) return;
      const target = draft.players.find(pl => pl.id === targetId);
      if (!target) return;

      draft.players.forEach(pl => pl.isReferee = false);
      target.isReferee = true;
      draft.refereeId = targetId;

      draft.voteQueue = [];
      draft.currentVote = null;
      if (!draft.settings) draft.settings = {};
      draft.settings.votingEnabled = false;
    }, "setReferee");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  removeReferee(ws: WebSocket) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
      if (!draft.players.find(pl => pl.id === p.playerId)?.isHost) return;
      draft.refereeId = undefined;
      draft.players.forEach(pl => pl.isReferee = false);
    }, "removeReferee");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  refereeApprove(ws: WebSocket) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    const room = buffer.get();
    // FLOW-1 FIX: Only allow approval during referee_review phase
    if (room.phase !== 'referee_review') {
      this.send(ws, { type: 'error', payload: { message: 'لا يمكن الموافقة إلا أثناء مراجعة الحكم' } });
      return;
    }
    // FIX: Only the referee or the host can approve results
    const isRef = room.refereeId === p.playerId;
    const isHost = room.players.find(pl => pl.id === p.playerId)?.isHost;
    if (!isRef && !isHost) {
      this.send(ws, { type: 'error', payload: { message: 'فقط الحكم أو المضيف يمكنه اعتماد النتائج' } });
      return;
    }
    this.finishRoundPhase(p.roomId);
  }

  activatePowerUp(ws: WebSocket, payload: any) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    let banishTargetId: string | null = null;

    buffer.transact(draft => {
      const round = draft.rounds[draft.currentRound];
      if (!round || round.banishedPlayerId === p.playerId) return;
      if (draft.phase !== 'playing') return;
      if (round.powerUpUsedInRound) return;

      if (payload.type === 'wildcard') {
        this.applyWildcard(draft, p.playerId, payload.category);
      } else if (payload.type === 'banish') {
        if (!payload.targetPlayerId || payload.targetPlayerId === p.playerId) return;
        this.applyBanish(draft, p.playerId, payload.targetPlayerId);
        banishTargetId = payload.targetPlayerId;
        round.banishedByPlayerId = p.playerId;
      }
    }, "activatePowerUp");

    const room = buffer.get();
    const actor = room.players.find(pl => pl.id === p.playerId);

    if (banishTargetId) {
      const targetWs = this.playerManager.getSocket(banishTargetId);
      if (targetWs) {
        this.send(targetWs, {
          type: 'player_banished',
          payload: { playerId: banishTargetId, banishedBy: actor?.name || 'لاعب' }
        });
      }
      this.broadcastToRoom(room.code, {
        type: 'powerup_activated',
        payload: { type: 'banish', playerName: actor?.name || 'لاعب' }
      });
    }

    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  private applyWildcard(draft: any, playerId: string, category: string) {
    const round = draft.rounds[draft.currentRound];
    const player = draft.players.find((pl: any) => pl.id === playerId);
    if (!player || player.usedPowerUps.wildcard || player.powerUps.wildcard <= 0) return;

    player.powerUps.wildcard--;
    player.usedPowerUps.wildcard = true;
    if (!round.wildcardUsedByPlayerIds) round.wildcardUsedByPlayerIds = [];
    round.wildcardUsedByPlayerIds.push(playerId);
    round.powerUpUsedInRound = true;

    if (!category) return;
    const letter = draft.letters[draft.currentRound];
    const possibleWords = WildcardService.getInstance().getWords(letter, category);
    const usedAnswers = round.submissions.flatMap((sub: any) => sub.answers[category] ? [sub.answers[category]] : []);
    const freshWords = possibleWords.filter(w => !usedAnswers.includes(w));
    const pool = freshWords.length > 0 ? freshWords : possibleWords;
    const chosen = pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)]
      : null;
    if (!chosen) return;

    const submission = round.submissions.find((s: any) => s.playerId === playerId);
    if (submission) {
      submission.answers[category] = chosen;
    } else {
      round.submissions.push({
        playerId,
        playerName: player.name,
        answers: { [category]: chosen },
        submittedAt: Date.now(),
        busComplete: false
      });
    }
  }

  private applyBanish(draft: any, playerId: string, targetPlayerId: string) {
    const round = draft.rounds[draft.currentRound];
    const player = draft.players.find((pl: any) => pl.id === playerId);
    if (!player || player.usedPowerUps.banish || player.powerUps.banish <= 0) return;

    player.powerUps.banish--;
    player.usedPowerUps.banish = true;
    round.banishedPlayerId = targetPlayerId;
    round.powerUpUsedInRound = true;
  }

  castParallelVote(ws: WebSocket, votePayload: { requesterId: string, category: string, vote: 'yes' | 'no' }) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    const voteKey = `${p.playerId}:${votePayload.requesterId}:${votePayload.category}`;
    const now = Date.now();
    const lastVote = this.lastVoteTime.get(voteKey) || 0;
    if (now - lastVote < this.VOTE_COOLDOWN_MS) return;
    this.lastVoteTime.set(voteKey, now);

    let shouldFinish = false;
    buffer.transact(draft => {
      if (draft.phase !== 'voting') return;
      if (!draft.voteQueue) return;

      const item = draft.voteQueue.find(
        (q: any) => q.requesterId === votePayload.requesterId && q.category === votePayload.category
      ) as any;
      if (!item) return;

      const eligibleVoterIds: string[] = item.eligibleVoterIds || [];
      if (!eligibleVoterIds.includes(p.playerId)) return;

      if (!item.voterIds) item.voterIds = [];
      if (item.voterIds.includes(p.playerId)) return;

      item.voterIds.push(p.playerId);
      if (!item.votes) item.votes = { yes: 0, no: 0 };
      if (!item.voteMap) item.voteMap = {};
      item.voteMap[p.playerId] = votePayload.vote;
      if (votePayload.vote === 'yes') item.votes.yes++;
      else item.votes.no++;

      const total = eligibleVoterIds.length;
      const { yes, no } = item.votes;

      const strictMajority = Math.floor(total / 2) + 1;
      if (yes >= strictMajority || no >= strictMajority || yes + no === total) {
        const ans = draft.rounds[draft.currentRound]?.validatedAnswers.find(
          (a: any) => a.playerId === item.requesterId && a.category === item.category
        );
        if (ans) {
          ans.isValid = yes > no;
          ans.isPendingVote = false;
          ans.reason = ans.isValid ? 'تم قبوله (أغلبية)' : 'تم رفضه (تعادل أو أغلبية رفض)';
        }
        draft.voteQueue = draft.voteQueue.filter((q: any) =>
          !(q.requesterId === item.requesterId && q.category === item.category)
        );
      }

      const stillPending = draft.rounds[draft.currentRound]?.validatedAnswers
        .some((a: any) => a.isPendingVote);
      if (draft.voteQueue.length === 0 && !stillPending && draft.phase === 'voting') {
        this.roundManager.calculateAnswerScores(draft);
        shouldFinish = true;
      }
    }, "castParallelVote");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    if (shouldFinish) {
      this.roundManager.clearTimer(room.code);
      this.finishRoundPhase(room.code);
    }
  }

  requestVote(ws: WebSocket, payload: any) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    let startedVoting = false;
    buffer.transact(draft => {
      if (draft.phase !== 'results' && draft.phase !== 'referee_review') return;
      const round = draft.rounds[draft.currentRound];
      const ans = round?.validatedAnswers.find(a => a.playerId === p.playerId && a.category === payload.category);
      if (!ans || !ans.isValid || ans.isPendingVote) return;

      ans.isPendingVote = true;
      ans.reason = 'قيد التصويت';

      if (!draft.voteQueue) draft.voteQueue = [];
      const eligibleVoterIds = draft.players
        .filter(pl => !pl.isOffline && pl.id !== p.playerId && pl.id !== draft.refereeId && pl.id !== round.banishedPlayerId)
        .map(pl => pl.id);

      draft.voteQueue.push({
        requestId: randomUUID(),
        requesterId: p.playerId,
        requesterName: ans.playerName,
        category: payload.category,
        word: ans.answer,
        eligibleVoterIds,
        voterIds: [],
        votes: { yes: 0, no: 0 }
      });

      if (eligibleVoterIds.length > 0) {
        draft.phase = 'voting';
        round.voteEndTime = Date.now() + 30000;
        startedVoting = true;
      }
    }, "requestVote");

    const room = buffer.get();
    if (startedVoting) {
      this.broadcastToRoom(room.code, {
        type: 'voting_start',
        payload: { room, validatedAnswers: room.rounds[room.currentRound]?.validatedAnswers }
      });
      this.roundManager.setRoundTimer(room.code, () => this.handleVoteTimeout(room.code), 30000);
    } else {
      this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
    }
  }

  // ---------- Host Control Methods ----------

  /** Host can resolve all pending votes as accepted */
  hostResolveVotes(ws: WebSocket) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;
    const room = buffer.get();
    const isHost = room.players.find(pl => pl.id === p.playerId)?.isHost;
    if (!isHost) return;
    if (room.phase !== 'voting') return;

    buffer.transact(draft => {
      // Mark all pending answers as valid (force-accept)
      const round = draft.rounds[draft.currentRound];
      if (round?.validatedAnswers) {
        round.validatedAnswers.forEach((ans: any) => {
          if (ans.isPendingVote) {
            ans.isValid = true;
            ans.isPendingVote = false;
            ans.reason = 'تم القبول بقرار المضيف';
          }
        });
      }
      draft.voteQueue = [];
      draft.currentVote = null;

      // FIX (#11): Host Force-Resolve Should Recalculate Scores
      this.roundManager.calculateAnswerScores(draft);
    }, 'host_resolve_votes');

    const updatedRoom = buffer.get();
    this.broadcastToRoom(updatedRoom.code, { type: 'sync_state', payload: { room: updatedRoom } });

    // BUG-8 FIX: Send confirmation toast to host
    const hostWs = this.playerManager.getSocket(updatedRoom.hostId);
    if (hostWs) {
      this.send(hostWs, { type: 'toast', payload: { message: '✅ تم قبول جميع الإجابات المتنازع عليها', type: 'success' } });
    }

    // FIX: After force-resolving all votes, finish round phase
    this.roundManager.clearTimer(updatedRoom.code);
    this.finishRoundPhase(updatedRoom.code);
  }

  /** Host can adjust a player's score by delta */
  hostAdjustScore(ws: WebSocket, payload: { targetPlayerId: string, delta: number }) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;
    const isHost = buffer.get().players.find(pl => pl.id === p.playerId)?.isHost;
    if (!isHost) return;
    const { targetPlayerId, delta } = payload;
    buffer.transact(draft => {
      const player = draft.players.find(pl => pl.id === targetPlayerId);
      if (player) {
        const oldScore = player.score ?? 0;
        const newScore = Math.max(0, oldScore + delta);
        player.score = newScore;

        // BUG-1 FIX: Persist manual adjustment so recalculatePlayerTotals doesn't erase it.
        // We accumulate all host adjustments in a separate field.
        player.manualScoreAdjustment = (player.manualScoreAdjustment || 0) + (newScore - oldScore);

        this.addAuditLogEntry(
          draft,
          p.playerId,
          targetPlayerId,
          'ADJUST_SCORE',
          `تعديل النقاط: ${oldScore} -> ${newScore} (الفرق: ${delta > 0 ? '+' : ''}${delta})`
        );

        draft.nextRoundAt = undefined;

        // Run soft validation
        const warnings = this.validateGameState(draft);
        if (warnings.length > 0) {
          this.addAuditLogEntry(draft, 'SYSTEM', undefined, 'SYSTEM_WARNING', warnings.join(' | '));
        }
      }
    }, 'host_adjust_score');
    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  refereeDeduct(ws: WebSocket, payload: { playerId: string, category: string, reason: string }) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
      const isHost = draft.players.find(pl => pl.id === p.playerId)?.isHost;
      const isRef = draft.refereeId === p.playerId;
      if (!isHost && !isRef) return;



      const round = draft.rounds[draft.currentRound];
      if (!round) return;
      const ans = round.validatedAnswers.find(a => a.playerId === payload.playerId && a.category === payload.category);
      if (ans) {
        ans.isValid = false;
        ans.reason = payload.reason || 'تم الرفض بواسطة الحكم/المضيف';
        this.roundManager.calculateAnswerScores(draft);
        this.recalculatePlayerTotals(draft);
        draft.nextRoundAt = undefined;

        this.addAuditLogEntry(
          draft,
          p.playerId,
          payload.playerId,
          'OVERRIDE_VALIDITY',
          `رفض إجابة (${payload.category}): ${ans.answer} (بواسطة ${isHost ? 'المضيف' : 'الحكم'})`
        );
      }
    }, "refereeDeduct");

    this.roundManager.clearTimer(p.roomId);
    this.broadcastToRoom(p.roomId, { type: 'sync_state', payload: { room: buffer.get() } });
  }

  /**
   * validateGameState - SCOP-v3.5 Soft Invariant Check
   * Monitors state for unusual patterns after host/referee mutations.
   * Does not block execution but logs warnings to the audit log if detected.
   */
  private validateGameState(draft: any): string[] {
    const warnings: string[] = [];

    // Check 1: Score Outliers
    const highScores = draft.players.filter((p: any) => p.score > 2000);
    if (highScores.length > 0) {
      warnings.push(`تنبيه: يوجد لاعبين بنقاط عالية جداً (>2000)`);
    }

    // Check 2: Wallet Discrepancy
    for (const p of draft.players) {
      const maxWildcards = Math.floor((p.totalEarnedPoints || 0) / 200);
      if (p.powerUps?.wildcard > maxWildcards + 1) {
        warnings.push(`تنبيه: اللاعب ${p.name} يمتلك جوكرز أكثر من المسموح به برمجياً`);
      }
    }

    // Check 3: Phase Inconsistency
    if (draft.phase === 'playing' && draft.rounds[draft.currentRound]?.resultsCommitted) {
      warnings.push(`خطأ منطقي: نتائج الجولة الحالية معتمدة رغم أن الجولة لا تزال جارية`);
    }

    return warnings;
  }

  /**
   * Appends an entry to the room's audit log
   */
  private addAuditLogEntry(draft: any, hostId: string, targetId: string | undefined, type: string, details: string) {
    if (!draft.auditLog) {
      draft.auditLog = [];
    }
    draft.auditLog.push({
      type,
      hostId,
      targetId,
      details,
      timestamp: Date.now(),
      round: draft.currentRound
    });
  }


  // DEAD-1: Removed hostOverrideRanking (no message type routes here)
  // DEAD-1: Removed vote wrapper (no message type routes here)

  // Removed duplicate requestVote and castParallelVote implementations to resolve TS2393.


  // DEAD-1: Removed castDemocraticVote (sequential voting removed, no message type routes here)

  refereeToggleValidity(ws: WebSocket, payload: any) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
      // V3-11 FIX: Only allow validity toggles during voting, results, or referee_review
      if (draft.phase !== 'voting' && draft.phase !== 'results' && draft.phase !== 'referee_review') return;

      const isHost = draft.players.find(pl => pl.id === p.playerId)?.isHost;
      if (draft.refereeId !== p.playerId && !isHost) return;

      const round = draft.rounds[draft.currentRound];
      const ans = round.validatedAnswers.find((a: any) => a.playerId === payload.playerId && a.category === payload.category);

      if (ans) {
        ans.isValid = !ans.isValid;
        ans.reason = ans.isValid ? 'تم القبول من الحكم' : 'تم الرفض من الحكم';
        ans.isPendingVote = false;

        if (draft.voteQueue) {
          draft.voteQueue = draft.voteQueue.filter((item: any) =>
            !(item.requesterId === ans.playerId && item.category === ans.category)
          );
        }

        this.roundManager.calculateAnswerScores(draft);

        const roles = [];
        if (draft.refereeId === p.playerId) roles.push('REF');
        if (isHost) roles.push('HOST');
        const actorRole = roles.join('/') || 'USER';

        this.addAuditLogEntry(
          draft,
          p.playerId,
          ans.playerId,
          'OVERRIDE_VALIDITY',
          `تعديل صحة الإجابة (${ans.category}): ${ans.isValid ? 'مقبولة' : 'مرفوضة'} (بواسطة ${actorRole})`
        );

        // FIX (#3): Phase 3 Real-time Totals Recalculation
        this.recalculatePlayerTotals(draft);

        // Cancel auto-next round progression
        if (draft.nextRoundAt) {
          draft.nextRoundAt = undefined;
        }
      }
    }, "refereeToggleValidity");

    // Clear UI timer immediately
    this.roundManager.clearTimer(p.roomId);

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    // BUG-2 FIX: Only finish if we were actually in voting phase and queue is now empty.
    // This prevents accidental finishRoundPhase when toggling validity in 'results' or 'referee_review' phase.
    if (room.phase === 'voting' && (!room.voteQueue || room.voteQueue.length === 0)) {
      this.finishRoundPhase(room.code);
    }
  }

  kickPlayer(ws: WebSocket, targetPlayerId: string) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    const isHost = buffer.get().players.find(pl => pl.id === p.playerId)?.isHost;
    if (!isHost) return;
    if (targetPlayerId === p.playerId) return;

    // إزالة اللاعب نهائياً — الطرد ليس انقطاع اتصال
    const targetWsBeforeRemove = this.playerManager.getSocket(targetPlayerId);

    if (!this.kickedPlayers.has(p.roomId)) {
      this.kickedPlayers.set(p.roomId, new Set());
    }
    this.kickedPlayers.get(p.roomId)!.add(targetPlayerId);

    this.roomManager.removePlayerFromRoom(p.roomId, targetPlayerId, true);

    // نفس المنطق المستخدم في handleDisconnect - تنظيف الأصوات والتصويتات
    let shouldFinishVoting = false;
    buffer.transact(draft => {
      // تنظيف الأصوات والتصويتات (نفس logic handleDisconnect)
      if (draft.voteQueue) {
        draft.voteQueue = draft.voteQueue.filter((v: any) => v.requesterId !== targetPlayerId);
        draft.voteQueue.forEach((v: any) => {
          if (v.eligibleVoterIds) {
            v.eligibleVoterIds = v.eligibleVoterIds.filter((id: string) => id !== targetPlayerId);
          }
          if (v.voterIds?.includes(targetPlayerId)) {
            v.voterIds = v.voterIds.filter((id: string) => id !== targetPlayerId);
            if (v.voteMap?.[targetPlayerId]) {
              if (v.voteMap[targetPlayerId] === 'yes' && v.votes?.yes > 0) v.votes.yes--;
              else if (v.voteMap[targetPlayerId] === 'no' && v.votes?.no > 0) v.votes.no--;
              delete v.voteMap[targetPlayerId];
            }
          }
        });

        if (draft.phase === 'voting' && draft.voteQueue.length > 0) {
          draft.voteQueue = draft.voteQueue.filter((v: any) => {
            const eligible = v.eligibleVoterIds?.length || 0;
            if (eligible === 0) {
              const ans = draft.rounds[draft.currentRound]?.validatedAnswers.find(
                (a: any) => a.playerId === v.requesterId && a.category === v.category
              );
              if (ans) { ans.isValid = false; ans.isPendingVote = false; ans.reason = 'لا يوجد ناخبون (تم طرد الجميع)'; }
              return false;
            }
            return true;
          });
        }

        if (draft.phase === 'voting' && draft.voteQueue.length === 0) {
          const stillPending = draft.rounds[draft.currentRound]?.validatedAnswers
            .some((a: any) => a.isPendingVote);
          if (!stillPending) {
            this.roundManager.calculateAnswerScores(draft);
            shouldFinishVoting = true;
          }
        }
      }
    }, "kickPlayerCleanup");

    if (targetWsBeforeRemove) {
      // BUG FIX #2: Send 'kicked' (not just toast) so client redirects the kicked player to home
      this.send(targetWsBeforeRemove, { type: 'kicked', payload: { reason: 'تم طردك من الغرفة من قبل المضيف' } });
      // GAP-2 FIX: Remove kicked player's socket from index BEFORE closing
      this.removeSocketFromRoomIndex(p.roomId, targetWsBeforeRemove);
      this.playerManager.removePlayer(targetWsBeforeRemove);
      try { targetWsBeforeRemove.close(); } catch { }
    }

    const updated = buffer.get();
    this.broadcastToRoom(updated.code, { type: 'sync_state', payload: { room: updated } });
    this.broadcastToRoom(updated.code, { type: 'player_left', payload: { players: updated.players } });
    this.broadcastToRoom(updated.code, { type: 'player_kicked', payload: { playerId: targetPlayerId } });

    if (shouldFinishVoting) {
      this.roundManager.clearTimer(updated.code);
      this.finishRoundPhase(updated.code);
    }
  }

  private resolveCurrentVoteInDraft(draft: any) {
    // Legacy sequential helper - keeping for compatibility with existing calls but logic updated for parallel
    if (!draft.currentVote) return;
    const accepted = draft.currentVote.votes.yes > draft.currentVote.votes.no;
    const round = draft.rounds[draft.currentRound];
    const ans = round.validatedAnswers.find((a: any) => a.playerId === draft.currentVote.requesterId && a.category === draft.currentVote.category);
    if (ans) {
      ans.isValid = accepted;
      ans.isPendingVote = false;
      ans.reason = accepted ? 'تم قبوله بالتصويت' : 'تم رفضه (أغلبية أو تعادل)';
    }
    draft.currentVote = null;
    if (draft.voteQueue && draft.voteQueue.length > 0) {
      const next = draft.voteQueue.shift();
      draft.currentVote = { ...next, votes: { yes: 0, no: 0 }, voterIds: [], votesDetails: {}, startTime: Date.now() };
    } else {
      this.roundManager.calculateAnswerScores(draft);
    }
  }

  refereeOverride(ws: WebSocket, payload: { requestId: string; category: string; accepted: boolean }) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    let allVotesDone = false;

    buffer.transact(draft => {
      const actingPlayer = draft.players.find(pl => pl.id === p.playerId);
      if (!actingPlayer || (!actingPlayer.isReferee && !actingPlayer.isHost)) return;

      if (!draft.voteQueue) return;

      const voteItemIndex = draft.voteQueue.findIndex(v => v.requestId === payload.requestId && v.category === payload.category);
      if (voteItemIndex >= 0) {
        const item = draft.voteQueue[voteItemIndex] as any;
        const ans = draft.rounds[draft.currentRound]?.validatedAnswers.find(
          (a: any) => a.playerId === item.requesterId && a.category === item.category
        );

        if (ans) {
          ans.isValid = payload.accepted;
          ans.isPendingVote = false;
          ans.reason = payload.accepted ? 'قبول (قرار الحكم)' : 'رفض (قرار الحكم)';

          const roles = [];
          if (draft.refereeId === p.playerId) roles.push('REF');
          if (actingPlayer.isHost) roles.push('HOST');
          const actorRole = roles.join('/') || 'USER';

          this.addAuditLogEntry(
            draft,
            p.playerId,
            ans.playerId,
            'REFEREE_OVERRIDE',
            `قرار الحكم على (${ans.category}): ${ans.isValid ? 'قبول' : 'رفض'} (بواسطة ${actorRole})`
          );

          // FIX (#3): Phase 3 Real-time Score Re-calculations
          // Calculate round scores FIRST
          this.roundManager.calculateAnswerScores(draft);
          // Then recalculate total player scores
          this.recalculatePlayerTotals(draft);

          if (draft.nextRoundAt) {
            draft.nextRoundAt = undefined;
          }
        }
        draft.voteQueue.splice(voteItemIndex, 1);
      }

      // BUG FIX #8: Only finish round if we're still in voting phase to prevent double-commit
      if (draft.voteQueue.length === 0 && draft.phase === 'voting') {
        allVotesDone = true;
      }
    }, "referee_override");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    if (allVotesDone) {
      this.roundManager.clearTimer(room.code);
      this.finishRoundPhase(room.code);
    }
  }

  // FIX: Phase 4 — Vote Appeal System
  appealAnswer(ws: WebSocket, payload: { category: Category }) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    // P1-2 FIX: Never allow appeals during final phase — prevents phase regression
    if (buffer.get().phase === 'final') {
      this.send(ws, { type: 'error', payload: { message: 'لا يمكن الاستئناف بعد انتهاء اللعبة' } });
      return;
    }

    let appealAdded = false;

    buffer.transact(draft => {
      const round = draft.rounds[draft.currentRound];
      if (!round) return;

      // P1-2 FIX: Only allow appeals during voting, results, or referee_review
      if (draft.phase !== 'voting' && draft.phase !== 'results' && draft.phase !== 'referee_review') return;

      const ans = round.validatedAnswers.find(a => a.playerId === p.playerId && a.category === payload.category);
      // Can only appeal if invalid and not already pending
      if (!ans || ans.isValid || ans.isPendingVote) return;

      ans.isPendingVote = true;
      ans.reason = 'استئناف قيد المراجعة';

      if (!draft.voteQueue) draft.voteQueue = [];

      // VOTE-ELIGIBILITY-FIX: Exclude both referee and banished player
      const eligibleVoterIds = draft.players
        .filter(pl =>
          !pl.isOffline &&
          pl.id !== p.playerId &&
          pl.id !== draft.refereeId &&
          pl.id !== round.banishedPlayerId
        )
        .map(pl => pl.id);

      draft.voteQueue.push({
        requestId: randomUUID(),
        requesterId: p.playerId,
        requesterName: ans.playerName || 'Unknown',
        category: payload.category,
        word: ans.answer,
        eligibleVoterIds,
        voterIds: [],
        votes: { yes: 0, no: 0 }
      });

      // Re-vote from results or referee review moves back to voting
      if (draft.phase === 'results' || draft.phase === 'referee_review') {
        draft.phase = 'voting';
      }

      appealAdded = true;
    }, "appeal_answer");

    const room = buffer.get();
    if (appealAdded) {
      this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
      this.roundManager.setRoundTimer(room.code, () => this.handleVoteTimeout(room.code), 30000);
    }
  }

  sendReaction(ws: WebSocket, type: ReactionType) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const room = this.roomManager.getRoomBuffer(p.roomId)?.get();
    const playerName = room?.players.find(pl => pl.id === p.playerId)?.name || '';
    this.broadcastToRoom(p.roomId, {
      type: 'reaction_received',
      payload: { reaction: { id: crypto.randomUUID(), type, playerId: p.playerId, playerName, timestamp: Date.now() } }
    });
  }

  forcePlayAgain(roomCode: string) {
    const buffer = this.roomManager.getRoomBuffer(roomCode);
    if (!buffer) return;

    this.roundManager.clearTimer(roomCode);
    this.kickedPlayers.delete(roomCode);

    // V3-6 FIX: Clean roomSocketIndex for offline players before removing them
    const roomBefore = buffer.get();
    roomBefore.players.forEach(pl => {
      if (pl.isOffline) {
        const ws = this.playerManager.getSocket(pl.id);
        if (ws) this.removeSocketFromRoomIndex(roomCode, ws);
      }
    });

    buffer.transact(draft => {
      draft.currentRound = 0;
      draft.phase = 'lobby';
      draft.rounds = [];
      draft.voteQueue = [];
      draft.currentVote = null;
      draft.nextRoundAt = undefined;
      draft.auditLog = [];
      draft.refereeId = undefined;
      draft.letters = getRandomLetters(draft.totalRounds);

      // FIX: Filter out offline players during restart
      draft.players = draft.players.filter(pl => !pl.isOffline);

      draft.players.forEach(pl => {
        pl.score = 0;
        pl.isReady = false;
        pl.totalEarnedPoints = 0;
        pl.busStreak = 0;
        pl.powerUps = { hint: 0, steal: 0, wildcard: 0, banish: 0 };
        pl.usedPowerUps = { hint: false, steal: false, wildcard: false, banish: false };
        pl.isReferee = false;
        pl.draftAnswers = undefined;
        pl.manualScoreAdjustment = 0;
      });

      // Fix host migration in case original host offline
      if (draft.players.length > 0) {
        if (!draft.players.find(p => p.isHost)) {
          draft.hostId = draft.players[0].id;
          draft.players[0].isHost = true;
        }
      }
    }, "forcePlayAgain");

    const updated = buffer.get();
    this.broadcastToRoom(updated.code, { type: 'sync_state', payload: { room: updated } });
  }

  playAgain(ws: WebSocket) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    const room = buffer.get();
    // Allow anyone to click play again in a public room
    // V3-5 CRITICAL GUARD: Private rooms can only be restarted from the final phase
    if (!room.isPublicRoom && room.phase !== 'final') return;
    if (!room.isPublicRoom && !room.players.find(pl => pl.id === p.playerId)?.isHost) return;

    this.forcePlayAgain(p.roomId);
  }

  // Helpers
  private send(ws: WebSocket, message: WSMessage) {
    if (process.env.NODE_ENV !== 'production' && message.type !== 'ping') {
      console.log(`[GameManager] Sending: ${message.type}`);
    }
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }

  // P2-10 FIX: O(1) broadcast using room→socket index instead of scanning all players
  private broadcastToRoom(roomCode: string, message: WSMessage, exclude?: WebSocket) {
    const roomSockets = this.roomSocketIndex.get(roomCode);
    if (!roomSockets) return;
    const messageStr = JSON.stringify(message);
    for (const ws of roomSockets) {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    }
  }

  private addSocketToRoomIndex(roomCode: string, ws: WebSocket) {
    if (!this.roomSocketIndex.has(roomCode)) {
      this.roomSocketIndex.set(roomCode, new Set());
    }
    this.roomSocketIndex.get(roomCode)!.add(ws);
  }

  private removeSocketFromRoomIndex(roomCode: string, ws: WebSocket) {
    const roomSockets = this.roomSocketIndex.get(roomCode);
    if (roomSockets) {
      roomSockets.delete(ws);
      if (roomSockets.size === 0) {
        this.roomSocketIndex.delete(roomCode);
      }
    }
  }

  // FIX (#3): Phase 3 Score Utilities
  private recalculatePlayerTotals(draft: GameRoom) {
    this.roundManager.recalculatePlayerTotals(draft);
  }

  private handlePlayerAppeal(ws: WebSocket, payload: { targetPlayerId: string; category: string }) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    if (payload.targetPlayerId === p.playerId) {
      this.appealAnswer(ws, { category: payload.category as Category });
      return;
    }

    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
      if (!draft.rounds[draft.currentRound]) return;

      const round = draft.rounds[draft.currentRound];
      const answer = round.validatedAnswers.find(
        a => a.playerId === payload.targetPlayerId && a.category === payload.category
      );
      if (!answer) return;

      if (!answer.appealedBy) answer.appealedBy = [];
      if (!answer.appealedBy.includes(p.playerId)) {
        answer.appealedBy.push(p.playerId);
      }
    }, "player_appeal");

    const room = buffer.get();
    const hostSocket = this.playerManager.getSocket(room.hostId);

    // Extract actual player name from room data since ConnectedPlayer lacks it
    const appealingPlayer = room.players.find(pl => pl.id === p.playerId);

    if (hostSocket && room.hostId !== p.playerId) {
      this.send(hostSocket, {
        type: 'toast',
        payload: {
          message: `🔔 استئناف من ${appealingPlayer?.name || 'لاعب'} على إجابة ${payload.category}`,
          type: 'info'
        }
      });
    }
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }
}

// Export singleton
export const gameManager = new GameManager();
