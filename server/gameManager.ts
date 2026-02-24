
import { WebSocket } from 'ws';
import type { WSMessage, RoundAnswers, Category, PowerUpType, ReactionType } from '../shared/schema';
import { RoomManager } from './managers/RoomManager';
import { PlayerManager } from './managers/PlayerManager';
import { RoundManager } from './managers/RoundManager';
import { CorruptionProofBuffer } from './utils/reliability';
import { StateOrchestrator } from './persistence/StateOrchestrator';
import { WildcardService } from './services/wildcardService';

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
        for (const item of draft.voteQueue) {
          const ans = draft.rounds[draft.currentRound]?.validatedAnswers.find(
            (a: any) => a.playerId === item.requesterId && a.category === item.category
          );
          if (ans && ans.isPendingVote) {
            // FIX: on timeout, ties/zero votes → ACCEPTED (benefit of the doubt)
            const { yes = 0, no = 0 } = (item as any).votes || {};
            ans.isValid = yes >= no; // tie or yes-majority → accept
            ans.isPendingVote = false;
            ans.reason = ans.isValid ? 'تم قبوله (انتهاء الوقت)' : 'تم رفضه (انتهاء الوقت)';
          }
        }
        draft.voteQueue = [];
        allVotesDone = true;
        this.roundManager.calculateAnswerScores(draft);
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

    console.log(`[GameManager] Received: ${message.type}`);
    try {
      switch (message.type) {
        case 'create_room': this.createRoom(ws, message.payload.playerName); break;
        case 'join_room': this.joinRoom(ws, message.payload.roomCode, message.payload.playerName); break;
        case 'rejoin_room': this.rejoinRoom(ws, message.payload.roomCode, message.payload.playerId); break;
        case 'join_public_room': this.joinPublicRoom(ws, message.payload.playerName); break;
        case 'player_ready': this.setReady(ws); break;
        case 'start_game': this.startGame(ws); break;
        case 'submit_answers': this.submitAnswers(ws, message.payload.answers); break;
        case 'bus_complete': this.triggerBusComplete(ws); break;
        case 'vote': this.vote(ws, message.payload.playerId, message.payload.category, message.payload.accepted); break;
        case 'next_round': this.nextRound(ws); break;
        case 'play_again': this.playAgain(ws); break;
        case 'set_referee': this.setReferee(ws, message.payload.playerId); break;
        case 'remove_referee': this.removeReferee(ws); break;
        case 'referee_approve': this.refereeApprove(ws); break;
        case 'update_settings': this.updateSettings(ws, message.payload); break;
        case 'draft_update': this.handleDraftUpdate(ws, message.payload.answers); break;
        case 'activate_powerup': this.activatePowerUp(ws, message.payload); break;
        case 'send_reaction': this.sendReaction(ws, message.payload.reactionType); break;
        case 'request_vote': this.requestVote(ws, message.payload); break;
        case 'vote_cast':
        case 'cast_democratic_vote':
          this.castDemocraticVote(ws, message.payload.vote || message.payload);
          break;
        // FIX: Handle parallel vote cast (per-answer voting)
        case 'cast_parallel_vote':
          if (!message.payload || typeof message.payload.requesterId !== 'string' ||
            typeof message.payload.category !== 'string' ||
            !['yes', 'no'].includes(message.payload.vote)) {
            this.send(ws, { type: 'error', payload: { message: 'بيانات التصويت غير صالحة' } });
            return;
          }
          this.castParallelVote(ws, message.payload);
          break;
        case 'referee_toggle_validity': this.refereeToggleValidity(ws, message.payload); break;
        // FIX: Handle pong responses to update lastPong timestamp
        case 'pong':
          this.playerManager.recordPong(ws);
          break;
        // FIX: Host can force-resolve all pending votes
        case 'host_resolve_votes':
          this.hostResolveVotes(ws);
          break;
        case 'kick_player':
          this.kickPlayer(ws, message.payload.playerId);
          break;
        case 'host_adjust_score':
          this.hostAdjustScore(ws, message.payload);
          break;
        case 'referee_deduct':
          this.refereeDeduct(ws, message.payload);
          break;
        // FIX: Phase 4 Referee Override and Appeal
        case 'referee_override':
          this.refereeOverride(ws, message.payload);
          break;
        case 'appeal_answer':
          this.appealAnswer(ws, message.payload);
          break;
      }
    } catch (e: any) {
      console.error(`[GameManager] Error handling ${message.type}:`, e);
      this.send(ws, { type: 'error', payload: { message: e.message || 'Error occurred' } });
    }
  }

  handleDisconnect(ws: WebSocket): void {
    const playerInfo = this.playerManager.removePlayer(ws);
    if (!playerInfo) return;

    this.roomManager.removePlayerFromRoom(playerInfo.roomId, playerInfo.playerId);

    const buffer = this.roomManager.getRoomBuffer(playerInfo.roomId);
    if (buffer) {
      // FIX (#12): Clean up eligibleVoterIds and logic when player leaves
      buffer.transact(draft => {
        if (draft.voteQueue) {
          draft.voteQueue.forEach((v: any) => {
            if (v.eligibleVoterIds) {
              v.eligibleVoterIds = v.eligibleVoterIds.filter((id: string) => id !== playerInfo.playerId);
            }
          });
        }
      }, `player_left:${playerInfo.playerId}`);

      const room = buffer.get();
      if (room.players.length > 0) {
        this.broadcastToRoom(room.code, { type: 'player_left', payload: { players: room.players } });
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
    if (!room.players.find(pl => pl.id === p.playerId)?.isHost) return;

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

    let startedRush = false;
    buffer.transact(draft => {
      const round = draft.rounds[draft.currentRound];
      if (!round || round.isRush) return;
      if (round.banishedPlayerId === p.playerId) return;

      const sub = round.submissions.find(s => s.playerId === p.playerId);
      if (!sub) return;

      sub.busComplete = true;
      round.isRush = true;
      round.endTime = Date.now() + 10000;
      startedRush = true;
    }, "triggerBusComplete");

    if (startedRush) {
      const room = buffer.get();
      this.broadcastToRoom(room.code, { type: 'rush_mode', payload: { room } });

      this.roundManager.setRoundTimer(room.code, () => {
        this.endRound(room.code);
      }, 10000);
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
      this.broadcastToRoom(r.code, {
        type: 'voting_start',
        payload: { room: r, validatedAnswers: r.rounds[r.currentRound].validatedAnswers }
      });

      // Start a single timer for the entire parallel vote session (30 seconds for all)
      this.roundManager.setRoundTimer(r.code, () => {
        this.handleVoteTimeout(r.code);
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

        if (draft.phase === 'playing' && draft.refereeId) {
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
    const buffer = this.roomManager.getRoomBuffer(roomCode);
    if (!buffer) return;

    const room = buffer.get();
    if (room.currentRound >= room.totalRounds - 1) {
      this.handleGameEnd(roomCode);
      return;
    }

    // FIX: Increment currentRound in the SAME transact as startRound processes it
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
            draft.letters = Array.from({ length: val }, (_, i) => draft.letters[i] || 'س');
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
    this.finishRoundPhase(p.roomId);
  }

  activatePowerUp(ws: WebSocket, payload: any) {
    // existing implementation unchanged
  }

  // ---------- Host Control Methods ----------

  /** Host can resolve all pending votes as accepted */
  hostResolveVotes(ws: WebSocket) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;
    // Ensure only host can perform
    const isHost = buffer.get().players.find(pl => pl.id === p.playerId)?.isHost;
    if (!isHost) return;
    buffer.transact(draft => {
      // Resolve current vote if exists
      if (draft.currentVote) {
        const cv = draft.currentVote;
        const ans = draft.rounds[draft.currentRound]?.validatedAnswers.find(a => a.playerId === cv.requesterId && a.category === cv.category);
        if (ans) {
          ans.isValid = true;
          ans.isPendingVote = false;
          ans.reason = 'تم القبول بواسطة المضيف';
        }
        draft.currentVote = undefined;
      }
      // Resolve all queued votes as accepted
      if (draft.voteQueue && draft.voteQueue.length) {
        for (const item of draft.voteQueue) {
          const ans = draft.rounds[draft.currentRound]?.validatedAnswers.find(a => a.playerId === item.requesterId && a.category === item.category);
          if (ans) {
            ans.isValid = true;
            ans.isPendingVote = false;
            ans.reason = 'تم القبول بواسطة المضيف';
          }
        }
        draft.voteQueue = [];
      }
    }, 'host_resolve_votes');
    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
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

        this.addAuditLogEntry(
          draft,
          p.playerId,
          targetPlayerId,
          'ADJUST_SCORE',
          `تعديل النقاط: ${oldScore} -> ${newScore} (الفرق: ${delta > 0 ? '+' : ''}${delta})`
        );

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

        this.addAuditLogEntry(
          draft,
          p.playerId,
          payload.playerId,
          'OVERRIDE_VALIDITY',
          `رفض إجابة (${payload.category}): ${ans.answer} (بواسطة ${isHost ? 'المضيف' : 'الحكم'})`
        );
      }
    }, "refereeDeduct");

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
  kickPlayer(ws: WebSocket, payload: { playerId: string }) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;
    const isHost = buffer.get().players.find(pl => pl.id === p.playerId)?.isHost;
    if (!isHost) return;
    const { playerId } = payload;
    // Remove player from room and close their socket if connected
    const targetSocket = this.playerManager.getSocket(playerId);
    if (targetSocket) {
      this.playerManager.removePlayer(targetSocket);
      try { targetSocket.close(); } catch { }
    }
    this.roomManager.removePlayerFromRoom(p.roomId, playerId);
    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'player_kicked', payload: { playerId } });
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }
  const p = this.playerManager.getPlayer(ws);
  if(!p) return;
  const buffer = this.roomManager.getRoomBuffer(p.roomId);
  if(!buffer) return;

    buffer.transact(draft => {
    const round = draft.rounds[draft.currentRound];
    if (!round || round.powerUpUsedInRound) return;
if (round.banishedPlayerId === p.playerId) return;

const player = draft.players.find(pl => pl.id === p.playerId);
if (!player) return;

if (payload.type === 'wildcard') {
  if (!player.usedPowerUps.wildcard && player.powerUps.wildcard > 0) {
    player.powerUps.wildcard--;
    player.usedPowerUps.wildcard = true;
    round.wildcardUsedByPlayerId = p.playerId;
    round.powerUpUsedInRound = true;

    // FIX (#17): Pick a random unused word from DB for the player
    const letter = draft.letters[draft.currentRound];
    const category = payload.category as string;

    if (category) {
      const possibleWords = WildcardService.getInstance().getWords(letter, category);
      const usedAnswers = round.submissions.flatMap(sub =>
        sub.answers[category] ? [sub.answers[category]] : []
      );
      const available = possibleWords.filter(w => !usedAnswers.includes(w));

      if (available.length > 0) {
        const chosen = available[Math.floor(Math.random() * available.length)];
        // Auto-submit this word for the player
        const pSub = round.submissions.find(s => s.playerId === p.playerId);
        if (pSub) {
          pSub.answers[category] = chosen;
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
        const pSub = round.submissions.find(s => s.playerId === p.playerId);
        if (pSub) {
          pSub.answers[category] = fallback;
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

vote(ws: WebSocket, targetId: string, category: Category, accepted: boolean) {
  // Legacy — route to parallel vote
  const p = this.playerManager.getPlayer(ws);
  if (!p) return;
  this.castParallelVote(ws, { requesterId: targetId, category, vote: accepted ? 'yes' : 'no' });
}

requestVote(ws: WebSocket, payload: any) {
  const p = this.playerManager.getPlayer(ws);
  if (!p) return;
  const buffer = this.roomManager.getRoomBuffer(p.roomId);
  if (!buffer) return;

  buffer.transact(draft => {
    if (!draft.settings?.enableVoting) return;

    const player = draft.players.find(pl => pl.id === p.playerId);

    if (!draft.voteQueue) draft.voteQueue = [];

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

    // In parallel mode, no currentVote needed — all items in voteQueue are shown simultaneously
  }, "requestVote");

  const room = buffer.get();
  this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

  // Start/reset the parallel vote timer if not already running
  if (room.phase === 'voting' && room.voteQueue && room.voteQueue.length > 0) {
    const elapsed = Date.now() - (room.voteQueue[0] as any).startTime || 0;
    if (elapsed < 1000) {
      this.roundManager.setRoundTimer(room.code, () => this.handleVoteTimeout(room.code), 30000);
    }
  }
}

/**
 * FIX: New parallel voting handler — each vote targets a specific answer in the voteQueue
 * Payload: { requesterId: string, category: string, vote: 'yes' | 'no' }
 */
castParallelVote(ws: WebSocket, votePayload: { requesterId: string, category: string, vote: 'yes' | 'no' }) {
  const p = this.playerManager.getPlayer(ws);
  if (!p) return;
  const buffer = this.roomManager.getRoomBuffer(p.roomId);
  if (!buffer) return;

  let allVotesDone = false;

  // Security check: cannot vote for your own word
  if (votePayload.requesterId === p.playerId) {
    this.send(ws, { type: 'toast', payload: { message: 'لا يمكنك التصويت على إجابتك!', type: 'error' } });
    return;
  }

  buffer.transact(draft => {
    if (draft.phase !== 'voting') return;
    if (!draft.voteQueue) return;

    const item = draft.voteQueue.find(
      (q: any) => q.requesterId === votePayload.requesterId && q.category === votePayload.category
    ) as any;
    if (!item) return;

    // FIX: Use snapshotted eligibleVoterIds — late joiners can't affect count
    const eligibleVoterIds: string[] = item.eligibleVoterIds || [];

    // Must be eligible
    if (!eligibleVoterIds.includes(p.playerId)) return;

    // Can't vote twice
    if (!item.voterIds) item.voterIds = [];
    if (item.voterIds.includes(p.playerId)) return;

    item.voterIds.push(p.playerId);
    if (!item.votes) item.votes = { yes: 0, no: 0 };
    if (votePayload.vote === 'yes') item.votes.yes++;
    else item.votes.no++;

    // Check if this item is resolved (all eligible voted OR strict majority)
    const total = eligibleVoterIds.length;
    const { yes, no } = item.votes;
    if (yes > total / 2 || no > total / 2 || yes + no === total) {
      // Resolve this vote item
      const ans = draft.rounds[draft.currentRound]?.validatedAnswers.find(
        (a: any) => a.playerId === item.requesterId && a.category === item.category
      );
      if (ans) {
        ans.isValid = yes >= no; // التعادل يُحتسب لصالح اللاعب
        ans.isPendingVote = false;
        ans.reason = ans.isValid ? 'تم قبوله بالتصويت أو التعادل' : 'تم رفضه (أغلبية)';
      }
      // Remove from queue
      draft.voteQueue = draft.voteQueue.filter((q: any) =>
        !(q.requesterId === item.requesterId && q.category === item.category)
      );
    }

    // Check if ALL votes in queue are done
    const remaining = draft.voteQueue.filter((q: any) => q.isPendingVote !== false);
    if (draft.voteQueue.length === 0) {
      this.roundManager.calculateAnswerScores(draft);
      allVotesDone = true;
    }
  }, "castParallelVote");

  const room = buffer.get();
  this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

  if (allVotesDone) {
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
    if (draft.refereeId !== p.playerId && !draft.players.find(pl => pl.id === p.playerId)?.isHost) {
      return;
    }

    const round = draft.rounds[draft.currentRound];
    const ans = round.validatedAnswers.find((a: any) => a.playerId === payload.playerId && a.category === payload.category);

    if (ans) {
      ans.isValid = !ans.isValid;
      ans.reason = ans.isValid ? 'تم القبول من الحكم' : 'تم الرفض من الحكم';
      this.roundManager.calculateAnswerScores(draft);

      const roles = [];
      if (draft.refereeId === p.playerId) roles.push('REF');
      if (draft.players.find(pl => pl.id === p.playerId)?.isHost) roles.push('HOST');
      const actorRole = roles.join('/') || 'USER';

      this.addAuditLogEntry(
        draft,
        p.playerId,
        ans.playerId,
        'OVERRIDE_VALIDITY',
        `تعديل صحة الإجابة (${ans.category}): ${ans.isValid ? 'مقبولة' : 'مرفوضة'} (بواسطة ${actorRole})`
      );

      // Run soft validation
      const warnings = this.validateGameState(draft);
      if (warnings.length > 0) {
        this.addAuditLogEntry(draft, 'SYSTEM', undefined, 'SYSTEM_WARNING', warnings.join(' | '));
      }
    }
  }, "refereeToggleValidity");

  const room = buffer.get();
  this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
}

/**
 * FIX: Host can force-resolve all pending parallel votes
 */
hostResolveVotes(ws: WebSocket) {
  const p = this.playerManager.getPlayer(ws);
  if (!p) return;
  const buffer = this.roomManager.getRoomBuffer(p.roomId);
  if (!buffer) return;

  const room = buffer.get();
  if (!room.players.find(pl => pl.id === p.playerId)?.isHost) return;

  buffer.transact(draft => {
    if (draft.phase !== 'voting') return;
    // Resolve all remaining queue items
    for (const item of (draft.voteQueue || []) as any[]) {
      const ans = draft.rounds[draft.currentRound]?.validatedAnswers.find(
        (a: any) => a.playerId === item.requesterId && a.category === item.category
      );
      if (ans && ans.isPendingVote) {
        const { yes = 0, no = 0 } = item.votes || {};
        ans.isValid = yes >= no; // ties → accepted
        ans.isPendingVote = false;
        ans.reason = ans.isValid ? 'تم قبوله (قرار الهوست)' : 'تم رفضه (قرار الهوست)';
      }
    }
    draft.voteQueue = [];
    draft.currentVote = null;
    this.roundManager.calculateAnswerScores(draft);

    this.addAuditLogEntry(draft, p.playerId, undefined, 'FORCED_RESOLVE_VOTES', 'الهوست قام بإنهاء جميع التصويتات المعلقة يدوياً');
  }, "hostResolveVotes");

  this.roundManager.clearTimer(room.code);
  const updated = buffer.get();
  this.broadcastToRoom(updated.code, { type: 'sync_state', payload: { room: updated } });
  this.finishRoundPhase(room.code);
}

/**
 * FIX: Host can kick a player
 */
kickPlayer(ws: WebSocket, targetPlayerId: string) {
  const p = this.playerManager.getPlayer(ws);
  if (!p) return;
  const buffer = this.roomManager.getRoomBuffer(p.roomId);
  if (!buffer) return;

  const room = buffer.get();
  if (!room.players.find(pl => pl.id === p.playerId)?.isHost) return;
  if (targetPlayerId === p.playerId) return; // Can't kick yourself

  // Remove from room state
  this.roomManager.removePlayerFromRoom(room.code, targetPlayerId);

  // Find target's WebSocket and disconnect them
  const targetWs = this.playerManager.getSocket(targetPlayerId);
  if (targetWs) {
    this.send(targetWs, { type: 'kicked', payload: { reason: 'تم طردك من الغرفة من قبل المضيف' } });
    this.playerManager.removePlayer(targetWs);
    try { targetWs.terminate(); } catch { }
  }

  const updated = buffer.get();
  this.broadcastToRoom(updated.code, { type: 'player_left', payload: { players: updated.players } });
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

// FIX: Phase 4 — Referee Quick-Action Override
refereeOverride(ws: WebSocket, payload: { requestId: string; category: string; accepted: boolean }) {
  const p = this.playerManager.getPlayer(ws);
  if (!p) return;
  const buffer = this.roomManager.getRoomBuffer(p.roomId);
  if (!buffer) return;

  let allVotesDone = false;

  buffer.transact(draft => {
    // Must be referee to override (or host acting as referee when enabled)
    const actingPlayer = draft.players.find(pl => pl.id === p.playerId);
    if (!actingPlayer || (!actingPlayer.isReferee && !actingPlayer.isHost)) return;

    if (!draft.voteQueue) return;

    const voteItemIndex = draft.voteQueue.findIndex(v => v.requestId === payload.requestId && v.category === payload.category);
    if (voteItemIndex >= 0) {
      const item = draft.voteQueue[voteItemIndex] as any;

      // Find the matching answer
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
      }

      // Remove from queue
      draft.voteQueue.splice(voteItemIndex, 1);
    }

    // Check if ALL votes in queue are done
    if (draft.voteQueue.length === 0) {
      this.roundManager.calculateAnswerScores(draft);
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

  buffer.transact(draft => {
    draft.currentRound = 0;
    draft.phase = 'lobby';
    draft.rounds = [];
    draft.voteQueue = [];
    draft.currentVote = null;
    draft.players.forEach(pl => {
      pl.score = 0;
      pl.isReady = false;
      pl.totalEarnedPoints = 0;
      pl.busStreak = 0;
      pl.powerUps = { hint: 0, steal: 0, wildcard: 0, banish: 0 };
      pl.usedPowerUps = { hint: false, steal: false, wildcard: false, banish: false };
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

  private broadcastToRoom(roomCode: string, message: WSMessage, exclude ?: WebSocket) {
  const players = this.playerManager.getAllPlayers();
  for (const p of players) {
    if (p.roomId === roomCode && p.ws !== exclude) {
      this.send(p.ws, message);
    }
  }
}
}

// Export singleton
export const gameManager = new GameManager();
