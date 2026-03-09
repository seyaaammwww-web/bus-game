
import { WebSocket } from 'ws';
import { z } from 'zod';
import type { WSMessage, RoundAnswers, Category, PowerUpType, ReactionType, GameRoom } from '../shared/schema';
import {
  createRoomSchema, joinRoomSchema, rejoinRoomSchema, submitAnswersSchema, draftUpdateSchema,
  castParallelVoteSchema, requestVoteSchema, kickPlayerSchema, hostAdjustScoreSchema,
  refereeToggleValiditySchema, refereeOverrideSchema, appealAnswerSchema,
  activatePowerUpSchema, sendReactionSchema, setRefereeSchema, updateSettingsSchema
} from '../shared/schema';
import { RoomManager } from './managers/RoomManager';
import { PlayerManager } from './managers/PlayerManager';
import { RoundManager } from './managers/RoundManager';
import { CorruptionProofBuffer } from './utils/reliability';
import { StateOrchestrator } from './persistence/StateOrchestrator';
import { WildcardService } from './services/wildcardService';
import { getRandomLetters } from '../shared/arabicWords';

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
  private readonly RATE_LIMIT_COUNT = 50;
  private readonly RATE_LIMIT_WINDOW_MS = 10000;

  private causalityLog: Map<string, Array<{ tick: number, event: string }>> = new Map();

  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastVoteTime: Map<string, number> = new Map();
  private VOTE_COOLDOWN_MS: number = 1000;

  // Per-IP room creation rate limiting (5 rooms per 10 min)
  private readonly roomCreationLimits = new Map<string, { count: number; resetTime: number }>();
  private readonly ROOM_CREATION_LIMIT = 5;
  private readonly ROOM_CREATION_WINDOW_MS = 10 * 60 * 1000;

  private getClientIp(ws: WebSocket): string {
    return (ws as any)._socket?.remoteAddress || 'unknown';
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

  private checkRateLimit(ws: WebSocket): boolean {
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
    this.roomManager = new RoomManager();

    // FIX: PlayerManager now takes a timeout callback to remove dead players from rooms
    this.playerManager = new PlayerManager((playerId, roomId) => {
      this.handlePlayerTimeout(playerId, roomId);
    });

    this.roundManager = new RoundManager();
    this.stateOrchestrator = new StateOrchestrator(this.roomManager);
    this.initializePersistence();
    this.startHeartbeat();
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const players = this.playerManager.getAllPlayers();
      for (const p of players) {
        if (p.ws.readyState === WebSocket.OPEN) {
          this.send(p.ws, { type: 'ping', payload: { timestamp: Date.now() } });
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
    this.roomManager.removePlayerFromRoom(roomId, playerId);

    const buffer = this.roomManager.getRoomBuffer(roomId);
    if (buffer) {
      // FIX: If the timed-out player was the host, reassign host to another player
      buffer.transact(draft => {
        if (draft.hostId === playerId && draft.players.length > 0) {
          const newHost = draft.players.find(p => p.id !== playerId);
          if (newHost) {
            draft.hostId = newHost.id;
            newHost.isHost = true;
            console.log(`[GameManager] Host reassigned to ${newHost.name} after timeout.`);
          }
        }
      }, 'host_reassign_on_timeout');

      const room = buffer.get();
      if (room.players.length > 0) {
        this.broadcastToRoom(room.code, { type: 'player_left', payload: { players: room.players } });
      }
    }
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
            // FIX (#13): Align timeout vote logic with live voting requirement (> 50%) -> strict majority
            // This treats Ties as Rejections.
            const { yes = 0 } = (item as any).votes || {};
            const totalEligible = item.eligibleVoterIds?.length || 0;
            const majorityNeeded = Math.floor(totalEligible / 2) + 1;
            ans.isValid = yes >= majorityNeeded;
            ans.isPendingVote = false;
            ans.reason = ans.isValid ? 'تم قبوله (انتهاء الوقت)' : 'تم رفضه (انتهاء الوقت - لم يحظ بأغلبية)';
            resolvedItems.push(item);
          }
        }

        // Remove resolved items safely
        draft.voteQueue = draft.voteQueue.filter((item: any) => !resolvedItems.includes(item));

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
    if (!this.checkRateLimit(ws)) {
      console.warn(`[GameManager] Rate limit exceeded by connection. Closing socket.`);
      try { ws.close(1008, 'Rate limit exceeded'); } catch { }
      return;
    }

    const invalid = () => this.send(ws, { type: 'error', payload: { message: 'بيانات غير صالحة' } });

    console.log(`[GameManager] Received: ${message.type}`);
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
          this.rejoinRoom(ws, p.roomCode, p.playerId);
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
        // Sequential voting removed — parallel only
        case 'cast_parallel_vote': {
          const p = this.validatePayload(castParallelVoteSchema, message.payload);
          if (!p) return invalid();
          this.castParallelVote(ws, p);
          break;
        }
        case 'player_appeal':
          this.handlePlayerAppeal(ws, message.payload);
          break;
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
          const room = this.getRoomByPlayerId(player?.playerId);
          if (!room || room.hostId !== player?.playerId) {
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
        case 'referee_deduct':
          this.refereeDeduct(ws, message.payload);
          break;
        case 'referee_override': {
          const p = this.validatePayload(refereeOverrideSchema, message.payload);
          if (!p) return invalid();
          this.refereeOverride(ws, p);
          break;
        }
        case 'appeal_answer': {
          const p = this.validatePayload(appealAnswerSchema, message.payload);
          if (!p) return invalid();
          this.appealAnswer(ws, p);
          break;
        }
      }
    } catch (e: any) {
      console.error(`[GameManager] Error handling ${message.type}:`, e);
      this.send(ws, { type: 'error', payload: { message: e.message || 'Error occurred' } });
    }
  }

  handleDisconnect(ws: WebSocket): void {
    // GM1: Explicit cleanup of WeakMap entry on disconnect
    this.rateLimits.delete(ws);

    const playerInfo = this.playerManager.removePlayer(ws);
    if (!playerInfo) return;

    // GM3: Clean up lastVoteTime entry when player leaves
    this.lastVoteTime.delete(playerInfo.playerId);

    this.roomManager.removePlayerFromRoom(playerInfo.roomId, playerInfo.playerId);

    const buffer = this.roomManager.getRoomBuffer(playerInfo.roomId);
    if (buffer) {
      // FIX (#12): Clean up eligibleVoterIds and orphaned vote requests when player leaves
      let shouldFinishVoting = false;
      buffer.transact(draft => {
        // FIX: If the disconnected player was the host, reassign to another player
        if (draft.hostId === playerInfo.playerId && draft.players.length > 0) {
          const newHost = draft.players.find(p => p.id !== playerInfo.playerId);
          if (newHost) {
            draft.hostId = newHost.id;
            newHost.isHost = true;
            console.log(`[GameManager] Host reassigned to ${newHost.name} after disconnect.`);
          }
        }

        if (draft.voteQueue) {
          // Remove any vote items that belong to this player (their answer was pending)
          draft.voteQueue = draft.voteQueue.filter((v: any) => v.requesterId !== playerInfo.playerId);

          draft.voteQueue.forEach((v: any) => {
            // Remove from eligible list
            if (v.eligibleVoterIds) {
              v.eligibleVoterIds = v.eligibleVoterIds.filter((id: string) => id !== playerInfo.playerId);
            }

            // Retract any vote they already cast — keeps yes+no <= eligibleVoterIds.length
            // so the "all voted" condition can still trigger correctly
            if (v.voterIds && v.voterIds.includes(playerInfo.playerId)) {
              v.voterIds = v.voterIds.filter((id: string) => id !== playerInfo.playerId);
              // Precise retraction using voteMap if available
              if (v.voteMap && v.voteMap[playerInfo.playerId]) {
                const direction = v.voteMap[playerInfo.playerId];
                if (direction === 'yes' && v.votes?.yes > 0) v.votes.yes--;
                else if (direction === 'no' && v.votes?.no > 0) v.votes.no--;
                delete v.voteMap[playerInfo.playerId];
              } else if (v.votes) {
                // Fallback heuristic: decrement minority side
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

        // FIX-AUTO-4: After cleanup, check if voting is now completable
        if (draft.phase === 'voting' && draft.voteQueue) {
          // Auto-resolve items that now have 0 eligible voters
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
      }, `player_left:${playerInfo.playerId}`);


      const room = buffer.get();
      if (room.players.length > 0) {
        this.broadcastToRoom(room.code, { type: 'player_left', payload: { players: room.players } });
      }

      // FIX-AUTO-4: If disconnect emptied the voteQueue, finish the round now
      if (shouldFinishVoting) {
        this.roundManager.clearTimer(room.code);
        this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
        this.finishRoundPhase(room.code);
      }
    }
  }

  // FIX (#5): Missing Session Reconnection Logic
  rejoinRoom(ws: WebSocket, roomCode: string, playerId: string): void {
    if (!roomCode || !playerId) return this.send(ws, { type: 'error', payload: { message: 'بيانات غير مكتملة' } });

    const buffer = this.roomManager.getRoomBuffer(roomCode);
    if (!buffer) return this.send(ws, { type: 'error', payload: { message: 'الغرفة غير موجودة' } });

    const room = buffer.getUnsafe();
    const player = room.players.find(p => p.id === playerId);
    if (!player) return this.send(ws, { type: 'error', payload: { message: 'اللاعب غير موجود في هذه الغرفة' } });

    // Remove old socket if exists
    const oldSocket = this.playerManager.getSocket(playerId);
    if (oldSocket) {
      this.playerManager.removePlayer(oldSocket);
      try { oldSocket.close(); } catch { }
    }

    // Assign new socket to this player id
    this.playerManager.addPlayer(ws, room.code, playerId);

    // Sync state
    this.send(ws, { type: 'room_joined', payload: { room: buffer.get(), playerId } });
    this.send(ws, { type: 'sync_state', payload: { room: buffer.get() } });
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

      this.send(ws, {
        type: 'room_created',
        payload: { room, playerId: hostId }
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

      this.send(ws, { type: 'room_joined', payload: { room, playerId } });
      this.broadcastToRoom(room.code, { type: 'player_joined', payload: { players: room.players } }, ws);
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

      this.send(ws, { type: 'room_joined', payload: { room, playerId } });
      this.broadcastToRoom(room.code, { type: 'player_joined', payload: { players: room.players } }, ws);
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
    if (!host?.isHost) return;

    // D4 FIX: Ensure all other players are ready
    const otherPlayers = room.players.filter(pl => pl.id !== p.playerId && pl.id !== room.refereeId);
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

    const { isComplete, round } = this.roundManager.handleSubmission(buffer, p.playerId, answers);

    const room = buffer.get();
    const activePlayers = room.refereeId
      ? room.players.filter(pl => pl.id !== room.refereeId && pl.id !== round.banishedPlayerId).length
      : room.players.filter(pl => pl.id !== round.banishedPlayerId).length;

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

    // قفل لمنع التكرار
    if (!this.busCompleteLocks) this.busCompleteLocks = new Map();
    const lockKey = p.roomId;
    if (this.busCompleteLocks.get(lockKey)) return;
    this.busCompleteLocks.set(lockKey, true);

    let startedRush = false;
    buffer.transact(draft => {
      const round = draft.rounds[draft.currentRound];
      if (!round || round.isRush) return;
      if (round.banishedPlayerId === p.playerId) return;

      const sub = round.submissions.find(s => s.playerId === p.playerId);
      if (!sub) return;

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
    this.roundManager.clearTimer(roomCode);
    const buffer = this.roomManager.getRoomBuffer(roomCode);
    if (!buffer) return;

    // Draft Rescue Logic
    buffer.transact(draft => {
      const round = draft.rounds[draft.currentRound];
      const active = draft.players.filter(pl => pl.id !== draft.refereeId && pl.id !== round?.banishedPlayerId);

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

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

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
      const buffer = this.roomManager.getRoomBuffer(roomCode);
      if (!buffer) return;

      let autoStart = false;
      buffer.transact(draft => {
        const round = draft.rounds[draft.currentRound];
        if (round) round.powerUpUsedInRound = false;

        // FIX-AUTO-1: Must check both 'playing' AND 'voting' phases for referee_review routing.
        // When voting+referee combo is used, phase='voting' after votes finish — not 'playing'.
        const canGoToRefereeReview = (draft.phase === 'playing' || draft.phase === 'voting') && !!draft.refereeId;
        if (canGoToRefereeReview) {
          draft.phase = 'referee_review';
        } else {
          if (round?.resultsCommitted) return;

          draft.phase = 'results';
          this.roundManager.commitRoundResults(draft);

          if (!draft.refereeId && !draft.settings?.enableVoting) {
            draft.nextRoundAt = Date.now() + 20000;
            autoStart = true;
          }
        }
      }, "finishRoundPhase");

      const room = buffer.get();
      this.broadcastToRoom(room.code, { type: 'round_results', payload: { room } });

      if (autoStart && room.currentRound < room.totalRounds - 1) {
        this.roundManager.setRoundTimer(room.code, () => {
          const check = this.roomManager.getRoomBuffer(room.code)?.get();
          if (check && check.phase === 'results' && check.currentRound === room.currentRound) {
            this.nextRoundByRoomCode(room.code);
          }
        }, 20000);
      } else if (room.currentRound >= room.totalRounds - 1) {
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

    this.nextRoundByRoomCode(p.roomId);
  }

  private nextRoundByRoomCode(roomCode: string) {
    // GM6: Always clear any pending timers before advancing to prevent double-fire
    this.roundManager.clearTimer(roomCode);

    const buffer = this.roomManager.getRoomBuffer(roomCode);
    if (!buffer) return;

    const room = buffer.get();
    if (room.currentRound >= room.totalRounds - 1) {
      this.handleGameEnd(roomCode);
      return;
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
  }

  // ==========================================
  // Misc / Setters / Powerups
  // ==========================================

  handleDraftUpdate(ws: WebSocket, answers: RoundAnswers) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer || buffer.get().phase !== 'playing') return;

    buffer.transact(draft => {
      const player = draft.players.find(pl => pl.id === p.playerId);
      if (player) {
        player.draftAnswers = answers;
      }
    }, 'draft_update', (patches) => {
      // Delta Sync: Send only the patches instead of the full room object
      if (patches.length > 0) {
        this.broadcastToRoom(p.roomId, { type: 'patch_update', payload: { patches } });
      }
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

      if (settings.enableVoting !== undefined) {
        if (!draft.settings) draft.settings = {};
        draft.settings.enableVoting = settings.enableVoting;

        if (settings.enableVoting && draft.refereeId) {
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
      draft.settings.enableVoting = false;
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

    buffer.transact(draft => {
      const round = draft.rounds[draft.currentRound];
      if (!round) return;
      // D1 FIX: Lift global powerUpUsedInRound restriction.
      // Players are only limited by their own usage flag.
      if (round.banishedPlayerId === p.playerId) return;

      const player = draft.players.find(pl => pl.id === p.playerId);
      if (!player) return;

      if (payload.type === 'wildcard') {
        if (!player.usedPowerUps.wildcard && player.powerUps.wildcard > 0) {
          player.powerUps.wildcard--;
          player.usedPowerUps.wildcard = true;
          // D2 FIX: Support multiple wildcard users
          if (!round.wildcardUsedByPlayerIds) round.wildcardUsedByPlayerIds = [];
          round.wildcardUsedByPlayerIds.push(p.playerId);
          round.powerUpUsedInRound = true;

          // FIX (#17): Pick a random unused word from DB for the player
          const letter = draft.letters[draft.currentRound];
          const category = payload.category as string;
          if (category) {
            const possibleWords = WildcardService.getInstance().getWords(letter, category);
            const usedAnswers = round.submissions.flatMap(sub =>
              sub.answers[category] ? [sub.answers[category]] : []
            );

            // Filter out already used words to ensure uniqueness
            const freshWords = possibleWords.filter(w => !usedAnswers.includes(w));
            const chosen = freshWords.length > 0 ? freshWords[Math.floor(Math.random() * freshWords.length)] : possibleWords[0];

            if (chosen) {
              const submission = round.submissions.find(s => s.playerId === p.playerId);
              if (submission) {
                submission.answers[category] = chosen;
              } else {
                round.submissions.push({
                  playerId: p.playerId,
                  playerName: player?.name || 'Unknown',
                  answers: { [category]: chosen },
                  submittedAt: Date.now(),
                  busComplete: false
                });
              }
            } else {
              // Fallback if no fresh words available
              const fallback = possibleWords.length > 0 ? possibleWords[Math.floor(Math.random() * possibleWords.length)] : 'جمل';
              const submission = round.submissions.find(s => s.playerId === p.playerId);
              if (submission) {
                submission.answers[category] = fallback;
              } else {
                round.submissions.push({
                  playerId: p.playerId,
                  playerName: player?.name || 'Unknown',
                  answers: { [category]: fallback },
                  submittedAt: Date.now(),
                  busComplete: false
                });
              }
            }
          }
        }
      } else if (payload.type === 'banish') {
        if (!player.usedPowerUps.banish && player.powerUps.banish > 0) {
          player.powerUps.banish--;
          player.usedPowerUps.banish = true;
          round.banishedPlayerId = payload.targetPlayerId;
          round.powerUpUsedInRound = true;
        }
      }
    }, "activatePowerUp");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  // ---------- Host Control Methods ----------

  /** Host can resolve all pending votes as accepted */
  hostResolveVotes(ws: WebSocket) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;
    const isHost = buffer.get().players.find(pl => pl.id === p.playerId)?.isHost;
    if (!isHost) return;

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

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    // BUG-8 FIX: Send confirmation toast to host
    const hostWs = this.playerManager.getSocket(room.hostId);
    if (hostWs) {
      this.send(hostWs, { type: 'toast', payload: { message: '✅ تم قبول جميع الإجابات المتنازع عليها', type: 'success' } });
    }

    // FIX: After force-resolving all votes, finish round phase
    this.roundManager.clearTimer(room.code);
    this.finishRoundPhase(room.code);
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
    this.roundManager.clearTimer(p.roomId);
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

  /** Host can override final ranking order */
  hostOverrideRanking(ws: WebSocket, payload: { orderedPlayerIds: string[] }) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;
    const isHost = buffer.get().players.find(pl => pl.id === p.playerId)?.isHost;
    if (!isHost) return;
    const { orderedPlayerIds } = payload;
    buffer.transact(draft => {
      const newOrder: typeof draft.players = [];
      for (const pid of orderedPlayerIds) {
        const player = draft.players.find(pl => pl.id === pid);
        if (player) newOrder.push(player);
      }
      // Append any missing players at the end
      for (const pl of draft.players) {
        if (!orderedPlayerIds.includes(pl.id)) newOrder.push(pl);
      }
      draft.players = newOrder;

      this.addAuditLogEntry(
        draft,
        p.playerId,
        undefined,
        'OVERRIDE_RANKING',
        `المضيف قام بتعديل ترتيب اللاعبين يدوياً`
      );

      // Run soft validation
      const warnings = this.validateGameState(draft);
      if (warnings.length > 0) {
        this.addAuditLogEntry(draft, 'SYSTEM', undefined, 'SYSTEM_WARNING', warnings.join(' | '));
      }
    }, 'host_override_ranking');
    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  /** Host can kick a player out of the room */

  vote(ws: WebSocket, targetId: string, category: string, accepted: boolean) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    this.castParallelVote(ws, { requesterId: targetId, category: category as any, vote: accepted ? 'yes' : 'no' });
  }

  requestVote(ws: WebSocket, payload: any) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
      if (!draft.settings?.enableVoting) return;

      const player = draft.players.find((pl: any) => pl.id === p.playerId);
      const round = draft.rounds[draft.currentRound];

      const playerAnswer = round?.submissions.find((s: any) => s.playerId === p.playerId)?.answers[payload.category];
      if (!playerAnswer || playerAnswer !== payload.word) {
        return;
      }

      // FIX-AUTO-3: Prevent duplicate vote items for the same player+category
      if (!draft.voteQueue) draft.voteQueue = [];
      const alreadyQueued = draft.voteQueue.some(
        (q: any) => q.requesterId === p.playerId && q.category === payload.category
      );
      if (alreadyQueued) return;

      const eligibleVoterIds = draft.players
        .filter(pl => pl.id !== p.playerId && pl.id !== draft.refereeId)
        .map(pl => pl.id);

      draft.voteQueue.push({
        requestId: crypto.randomUUID(),
        requesterId: p.playerId,
        requesterName: player?.name || 'Unknown',
        category: payload.category,
        word: payload.word,
        eligibleVoterIds,
        voterIds: [],
        votes: { yes: 0, no: 0 }
      });

      // Start/reset the parallel vote timer
      this.roundManager.setRoundTimer(p.roomId, () => this.handleVoteTimeout(p.roomId), 30000);
    }, "requestVote");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  castParallelVote(ws: WebSocket, votePayload: { requesterId: string, category: string, vote: 'yes' | 'no' }) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    // FIX (#7): Vote Spam Protection
    const now = Date.now();
    const last = this.lastVoteTime.get(p.playerId);
    if (last && now - last < this.VOTE_COOLDOWN_MS) {
      this.send(ws, { type: 'toast', payload: { message: 'الرجاء الانتظار قليلاً بين التصويتات', type: 'error' } });
      return;
    }
    this.lastVoteTime.set(p.playerId, now);

    if (votePayload.requesterId === p.playerId) {
      this.send(ws, { type: 'toast', payload: { message: 'لا يمكنك التصويت على إجابتك!', type: 'error' } });
      return;
    }

    // GM4: Capture the finish decision inside the transaction so it's based on committed state
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
      if (!item.voteMap) item.voteMap = {}; // { [playerId]: 'yes' | 'no' }
      item.voteMap[p.playerId] = votePayload.vote;
      if (votePayload.vote === 'yes') item.votes.yes++;
      else item.votes.no++;

      const total = eligibleVoterIds.length;
      const { yes, no } = item.votes;

      // FIX: Only resolve when strict majority OR all eligible voters voted.
      // With small groups (1-2 players), 'yes > total/2' fires on first vote
      // which is correct for 1 eligible voter. But we must ensure the queue
      // is truly empty (no pending answers remain) before finishing.
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

      // FIX: Only finish when the queue is empty AND no answer still marked isPendingVote.
      // Guards against finishing mid-session if new vote items are dynamically added.
      const stillPending = draft.rounds[draft.currentRound]?.validatedAnswers
        .some((a: any) => a.isPendingVote);
      if (draft.voteQueue.length === 0 && !stillPending && draft.phase === 'voting') {
        this.roundManager.calculateAnswerScores(draft);
        shouldFinish = true; // GM4: set flag inside transaction
      }
    }, "castParallelVote");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    if (shouldFinish) {
      this.roundManager.clearTimer(room.code);
      this.finishRoundPhase(room.code);
    }
  }

  castDemocraticVote(ws: WebSocket, vote: 'yes' | 'no') {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    let allVotesDone = false;

    buffer.transact(draft => {
      if (draft.phase !== 'voting' || !draft.currentVote) return;
      if (draft.currentVote.voterIds.includes(p.playerId)) return;

      const eligibleVoters = draft.players.filter(pl =>
        pl.id !== draft.currentVote!.requesterId &&
        pl.id !== draft.refereeId &&
        pl.id !== draft.rounds[draft.currentRound]?.banishedPlayerId
      );

      if (!eligibleVoters.some(ev => ev.id === p.playerId)) return;

      draft.currentVote.voterIds.push(p.playerId);
      if (vote === 'yes') draft.currentVote.votes.yes++;
      else draft.currentVote.votes.no++;

      const activeCount = eligibleVoters.length;
      const { yes, no } = draft.currentVote.votes;
      if (yes > activeCount / 2 || no > activeCount / 2 || yes + no === activeCount) {
        this.resolveCurrentVoteInDraft(draft);
      }
      if (!draft.currentVote) {
        allVotesDone = true;
      }
    }, "castVote");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    if (allVotesDone) {
      this.roundManager.clearTimer(room.code);
      this.finishRoundPhase(room.code);
    } else if (room.phase === 'voting' && room.currentVote) {
      const elapsed = Date.now() - room.currentVote.startTime;
      if (elapsed < 1000) {
        this.startVoteTimer(room.code);
      }
    }
  }

  refereeToggleValidity(ws: WebSocket, payload: any) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
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

    // إزالة اللاعب من الغرفة (يجب إعلام اللاعب المطروف قبل الحذف)
    const targetWsBeforeRemove = this.playerManager.getSocket(targetPlayerId);
    if (targetWsBeforeRemove) {
      this.sendError(targetWsBeforeRemove, 'تم طردك من الغرفة بواسطة المضيف');
    }
    
    this.roomManager.removePlayerFromRoom(p.roomId, targetPlayerId);

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
          this.roundManager.calculateAnswerScores(draft);
          shouldFinishVoting = true;
        }
      }
    }, "kickPlayerCleanup");

    if (shouldFinishVoting) {
      this.finishRoundPhase(p.roomId);
    }

    // إعلام جميع اللاعبين بالطرد
    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'player_kicked', payload: { playerId: targetPlayerId, room } });
  }
    if (targetWs) {
      // BUG FIX #2: Send 'kicked' (not just toast) so client redirects the kicked player to home
      this.send(targetWs, { type: 'kicked', payload: { reason: 'تم طردك من الغرفة من قبل المضيف' } });
      this.playerManager.removePlayer(targetWs);
      try { targetWs.close(); } catch { }
    }

    const updated = buffer.get();
    this.broadcastToRoom(updated.code, { type: 'sync_state', payload: { room: updated } });
    this.broadcastToRoom(updated.code, { type: 'player_kicked', payload: { playerId: targetPlayerId } });

    if (shouldFinishVoting) {
      this.roundManager.clearTimer(updated.code);
      this.finishRoundPhase(updated.code);
    }
  }

  private resolveCurrentVoteInDraft(draft: any) {
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

    let appealAdded = false;

    buffer.transact(draft => {
      const round = draft.rounds[draft.currentRound];
      if (!round) return;

      const ans = round.validatedAnswers.find(a => a.playerId === p.playerId && a.category === payload.category);
      // Can only appeal if invalid and not already pending
      if (!ans || ans.isValid || ans.isPendingVote) return;

      ans.isPendingVote = true;
      ans.reason = 'استئناف قيد المراجعة';

      if (!draft.voteQueue) draft.voteQueue = [];

      const eligibleVoterIds = draft.players
        .filter(pl => pl.id !== p.playerId && pl.id !== draft.refereeId)
        .map(pl => pl.id);

      draft.voteQueue.push({
        requestId: crypto.randomUUID(),
        requesterId: p.playerId,
        requesterName: ans.playerName || 'Unknown',
        category: payload.category,
        word: ans.answer,
        eligibleVoterIds,
        voterIds: [],
        votes: { yes: 0, no: 0 }
      });

      // If phase transitioned out of voting (e.g., results), push it back to voting so players can see it
      if (draft.phase !== 'voting') {
        draft.phase = 'voting';
      }

      appealAdded = true;
    }, "appeal_answer");

    const room = buffer.get();
    if (appealAdded) {
      this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

      // Start or reset vote timer for the newly added appeal (if it's the first one, or reset to give them time)
      this.roundManager.setRoundTimer(room.code, () => this.handleVoteTimeout(room.code), 30000);
    }
  }

  sendReaction(ws: WebSocket, type: ReactionType) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    this.broadcastToRoom(p.roomId, {
      type: 'reaction_received',
      payload: { reaction: { id: crypto.randomUUID(), type, playerId: p.playerId, playerName: '', timestamp: Date.now() } }
    });
  }

  playAgain(ws: WebSocket) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    // Only host can trigger play again
    const room = buffer.get();
    if (!room.players.find(pl => pl.id === p.playerId)?.isHost) return;

    this.roundManager.clearTimer(p.roomId);

    buffer.transact(draft => {
      draft.currentRound = 0;
      draft.phase = 'lobby';
      draft.rounds = [];
      draft.voteQueue = [];
      draft.currentVote = null;
      draft.nextRoundAt = undefined;
      draft.auditLog = [];
      // FIX: Clear referee state on play again — old referee would otherwise persist
      draft.refereeId = undefined;

      // BUG FIX #3: Use getRandomLetters to get truly fresh letters, not a shuffle of the same pool
      draft.letters = getRandomLetters(draft.totalRounds);

      draft.players.forEach(pl => {
        pl.score = 0;
        pl.isReady = false;
        pl.totalEarnedPoints = 0;
        pl.busStreak = 0;
        pl.powerUps = { hint: 0, steal: 0, wildcard: 0, banish: 0 };
        pl.usedPowerUps = { hint: false, steal: false, wildcard: false, banish: false };
        // FIX: Clear referee and draft state
        pl.isReferee = false;
        pl.draftAnswers = undefined;
        // BUG-1 FIX: Reset manual score adjustments for new game
        pl.manualScoreAdjustment = 0;
      });
    }, "playAgain");

    const updated = buffer.get();
    this.broadcastToRoom(updated.code, { type: 'sync_state', payload: { room: updated } });
  }

  // Helpers
  private send(ws: WebSocket, message: WSMessage) {
    if (message.type !== 'ping') console.log(`[GameManager] Sending: ${message.type}`);
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }

  private broadcastToRoom(roomCode: string, message: WSMessage, exclude?: WebSocket) {
    const players = this.playerManager.getAllPlayers();
    for (const p of players) {
      if (p.roomId === roomCode && p.ws !== exclude) {
        this.send(p.ws, message);
      }
    }
  }

  // FIX (#3): Phase 3 Score Utilities
  // BUG-1 FIX: After recalculating from rounds, add back any manual host adjustments
  private recalculatePlayerTotals(draft: GameRoom) {
    // Reset all player scores
    draft.players.forEach(p => {
      p.score = 0;
      p.totalEarnedPoints = 0;
    });

    // Sum all rounds structurally
    draft.rounds.forEach(round => {
      round.validatedAnswers.forEach(ans => {
        if (ans.isValid) {
          const player = draft.players.find(p => p.id === ans.playerId);
          if (player) {
            player.score += ans.score || 0;
            player.totalEarnedPoints += ans.score || 0;
          }
        }
      });
    });

    // Re-apply any manual host score adjustments on top of round-calculated scores
    draft.players.forEach(p => {
      if (p.manualScoreAdjustment) {
        p.score = Math.max(0, p.score + p.manualScoreAdjustment);
      }
    });
  }

  private handlePlayerAppeal(ws: WebSocket, payload: { targetPlayerId: string; category: string }) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
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
