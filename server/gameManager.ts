
import { WebSocket } from 'ws';
import type { WSMessage, RoundAnswers, Category, PowerUpType, ReactionType } from '../shared/schema';
import { RoomManager } from './managers/RoomManager';
import { PlayerManager } from './managers/PlayerManager';
import { RoundManager } from './managers/RoundManager';
import { CorruptionProofBuffer } from './utils/reliability';
import { StateOrchestrator } from './persistence/StateOrchestrator';

export class GameManager {
  private roomManager: RoomManager;
  private playerManager: PlayerManager;
  private roundManager: RoundManager;
  private stateOrchestrator: StateOrchestrator;

  // Causal Logging (Persistence TODO)
  private causalityLog: Map<string, Array<{ tick: number, event: string }>> = new Map();

  // Voting Timers (Keep here or move to RoundManager? RoundManager seems appropriate for round-scoped timers, but Voting is a phase)
  // Let's keep voting timers in RoundManager eventually, but for now we can manage them here or in RM.
  // actually RoundManager has generic timers, let's use that.

  // Drafts for rescue
  private drafts: Map<string, Map<string, { answers: RoundAnswers, updatedAt: number, roundNumber: number }>> = new Map();

  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.roomManager = new RoomManager();
    this.playerManager = new PlayerManager();
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
          // p.ws.ping(); 
          // browser client might not handle ping frame control messages easily accessible, 
          // so we use a custom message 'ping'
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
  // Connection Handling
  // ==========================================

  private startVoteTimer(roomCode: string) {
    this.roundManager.setRoundTimer(roomCode, () => {
      this.handleVoteTimeout(roomCode);
    }, 15000); // 15 seconds per vote
  }

  private handleVoteTimeout(roomCode: string) {
    const buffer = this.roomManager.getRoomBuffer(roomCode);
    if (!buffer) return;

    let nextVoteReady = false;

    buffer.transact(draft => {
      if (draft.phase !== 'voting' || !draft.currentVote) return;

      // Timeout = Resolve based on current majority or Reject if 0 votes?
      // Let's say: If Yes >= No, accept. (Unless 0-0 => Reject).
      const { yes, no } = draft.currentVote.votes;
      if (yes === 0 && no === 0) {
        // Auto-reject if nobody voted? Or Auto-accept if nobody complained?
        // Usually if it's "Review", it means it's suspicious. Auto-reject?
        // But if it's "Request Check", maybe auto-reject.
        // Let's go with: Tie goes to requester? No, tie goes to NO.
      }

      // Force resolution
      this.resolveCurrentVoteInDraft(draft);
      if (draft.currentVote) nextVoteReady = true;

    }, "handleVoteTimeout");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    if (nextVoteReady) {
      this.startVoteTimer(roomCode);
    } else if (room.phase === 'results') {
      // Timer naturally cleared or we can start results timer
      // finishRoundPhase handles auto-start timer if needed
    }
  }

  handleMessage(ws: WebSocket, message: WSMessage): void {
    console.log(`[GameManager] Received: ${message.type}`, message.payload);
    try {
      switch (message.type) {
        case 'create_room': this.createRoom(ws, message.payload.playerName); break;
        case 'join_room': this.joinRoom(ws, message.payload.roomCode, message.payload.playerName); break;
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
        case 'referee_toggle_validity': this.refereeToggleValidity(ws, message.payload); break;
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

    // Broadcast leave
    const buffer = this.roomManager.getRoomBuffer(playerInfo.roomId);
    if (buffer) {
      const room = buffer.get();
      if (room.players.length > 0) {
        this.broadcastToRoom(room.code, { type: 'player_left', payload: { players: room.players } });
      }
    }
  }

  // ==========================================
  // Room Logic
  // ==========================================

  createRoom(ws: WebSocket, playerName: string): void {
    const playerId = this.playerManager.addPlayer(ws, '', '').playerId; // Temp add to generate ID
    // Actually addPlayer logic in PlayerManager might need adjustment to handle "pending" or re-assignment
    // distinct from "host".
    // Let's refine:

    // 1. Create Room (generates IDs)
    // We need host ID first? Or CreateRoom returns it?
    // Let's use a temp ID for creation

    // Better: RoomManager.createRoom returns the room and host ID used.
    // The player's socket needs to be mapped to that ID.
    // Note: My PlayerManager.addPlayer generates an ID if not provided.

    // Fix: We should generate ID, map it, then create room using that ID.
    const tempId = crypto.randomUUID();

    try {
      const { room } = this.roomManager.createRoom(tempId, playerName);
      this.playerManager.addPlayer(ws, room.code, tempId);

      this.send(ws, {
        type: 'room_created',
        payload: { room, playerId: tempId }
      });
    } catch (e: any) {
      this.send(ws, { type: 'error', payload: { message: e.message } });
    }
  }

  joinRoom(ws: WebSocket, roomCode: string, playerName: string): void {
    const normCode = roomCode.toUpperCase();
    const playerId = crypto.randomUUID();

    try {
      const room = this.roomManager.joinRoom(normCode, playerId, playerName);
      this.playerManager.addPlayer(ws, room.code, playerId);

      this.send(ws, { type: 'room_joined', payload: { room, playerId } });
      this.broadcastToRoom(room.code, { type: 'player_joined', payload: { players: room.players } }, ws);
    } catch (e: any) {
      this.send(ws, { type: 'error', payload: { message: e.message } });
    }
  }

  joinPublicRoom(ws: WebSocket, playerName: string): void {
    const playerId = crypto.randomUUID();
    try {
      const room = this.roomManager.joinPublicRoom(playerId, playerName);
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

    // Start Round
    const round = this.roundManager.startRound(buffer); // Mutates

    const updated = buffer.get();
    this.broadcastToRoom(updated.code, { type: 'round_start', payload: { room: updated } });

    this.roundManager.setRoundTimer(updated.code, () => {
      this.endRound(updated.code);
    });
  }

  submitAnswers(ws: WebSocket, answers: RoundAnswers): void {
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
      const roomDrafts = this.drafts.get(roomCode);
      const active = draft.players.filter(pl => pl.id !== draft.refereeId && pl.id !== round.banishedPlayerId);

      for (const player of active) {
        if (!round.submissions.some(s => s.playerId === player.id)) {
          let answers: RoundAnswers = {};
          const saved = roomDrafts?.get(player.id);
          if (saved && saved.roundNumber === draft.currentRound) {
            answers = saved.answers;
          } else {
            // fill empty
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
      }
    }, "endRound_rescue");

    this.drafts.delete(roomCode);

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    // Calculate Scores
    this.roundManager.processRoundWithAI(buffer, () => {
      // On Voting Start
      const r = buffer.get();
      this.broadcastToRoom(r.code, {
        type: 'voting_start',
        payload: { room: r, validatedAnswers: r.rounds[r.currentRound].validatedAnswers }
      });

      // Vote Timeout
      // Vote Timeout - Start Per Vote Timer
      this.startVoteTimer(r.code);
    }, () => {

      // On Round Finish directly
      const r = buffer.get();
      this.finishRoundPhase(r.code);
    });
  }

  private resolveAllPendingVotes(roomCode: string) {
    const buffer = this.roomManager.getRoomBuffer(roomCode);
    if (!buffer) return;

    buffer.transact(draft => {
      const round = draft.rounds[draft.currentRound];
      let changed = false;
      round.validatedAnswers.forEach(a => {
        if (a.isPendingVote) {
          const yes = a.votes.accepted;
          const no = a.votes.rejected;
          a.isValid = yes > no;
          a.reason = a.isValid ? 'تم قبوله (انتهاء الوقت)' : 'تم رفضه (انتهاء الوقت)';
          a.isPendingVote = false;
          changed = true;
        }
      });

      if (changed) {
        this.roundManager.calculateAnswerScores(draft);
      }
    }, "resolveAllVotes");

    this.finishRoundPhase(roomCode);
  }

  private finishRoundPhase(roomCode: string) {
    try {
      const buffer = this.roomManager.getRoomBuffer(roomCode);
      if (!buffer) return;

      let autoStart = false;
      buffer.transact(draft => {
        const round = draft.rounds[draft.currentRound];
        if (round) round.powerUpUsedInRound = false;

        // Logic to determine next phase
        // If we are currently playing, check for Referee
        if (draft.phase === 'playing' && draft.refereeId) {
          draft.phase = 'referee_review';
        }
        // If we are coming from Voting or Referee Review, or Playing (no referee), go to Results
        else {
          if (round.resultsCommitted) return; // Prevent re-entry

          draft.phase = 'results';
          this.roundManager.commitRoundResults(draft);

          // Auto-start logic only if not manual (no referee, maybe no voting)
          if (!draft.refereeId && !draft.settings?.enableVoting) {
            draft.nextRoundAt = Date.now() + 20000;
            autoStart = true;
          }
        }
      }, "finishRoundPhase");

      const room = buffer.get();
      this.broadcastToRoom(room.code, { type: 'round_results', payload: { room } });

      if (autoStart && room.currentRound < room.totalRounds - 1) {
        setTimeout(() => {
          const check = buffer.get();
          if (check.phase === 'results' && check.currentRound === room.currentRound) {
            this.nextRoundByRoomCode(room.code);
          }
        }, 20000);
      } else if (room.currentRound >= room.totalRounds - 1) {
        setTimeout(() => {
          const check = buffer.get();
          if (check.phase === 'results') {
            this.handleGameEnd(check.code);
          }
        }, 20000);
      }
    } catch (e: any) {
      console.error(`[FinishRoundPhase] Error in room ${roomCode}:`, e);
      // Attempt to broadcast error or safe state?
      // For now just logging prevents the process from crashing if uncaught.
    }
  }

  nextRound(ws: WebSocket) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
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

    buffer.transact(draft => {
      draft.currentRound++;
    }, "nextRoundInc");

    const round = this.roundManager.startRound(buffer);
    const updated = buffer.get();

    this.broadcastToRoom(updated.code, { type: 'round_start', payload: { room: updated } });
    this.roundManager.setRoundTimer(updated.code, () => this.endRound(updated.code));
  }

  private handleGameEnd(roomCode: string) {
    const buffer = this.roomManager.getRoomBuffer(roomCode);
    if (!buffer) return;

    buffer.transact(draft => {
      // Bonus logic could go here similar to before
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

    if (!this.drafts.has(p.roomId)) this.drafts.set(p.roomId, new Map());
    this.drafts.get(p.roomId)!.set(p.playerId, {
      answers,
      updatedAt: Date.now(),
      roundNumber: buffer.get().currentRound
    });
  }

  updateSettings(ws: WebSocket, settings: any) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
      const isHost = draft.players.find(pl => pl.id === p.playerId)?.isHost;
      console.log(`[UpdateSettings] Req from ${p.playerId} (${p.playerId === draft.hostId ? 'HOST' : 'NOT HOST'}). Settings:`, settings);

      if (!isHost) {
        console.log('[UpdateSettings] Denied: Not host');
        return;
      }

      if (draft.phase === 'lobby') {
        if (settings.customCategories) draft.settings = { ...draft.settings, customCategories: settings.customCategories };
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

      // Clear voting state to avoid conflicts
      draft.voteQueue = [];
      draft.currentVote = null;
      if (!draft.settings) draft.settings = {};
      draft.settings.enableVoting = false;

      console.log(`[SetReferee] Referee set to ${target.name} (${targetId}), Voting Disabled`);
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
    // ... logic similar to original, transition to results
    this.finishRoundPhase(p.roomId);
  }

  activatePowerUp(ws: WebSocket, payload: any) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
      const round = draft.rounds[draft.currentRound];
      if (!round || round.powerUpUsedInRound) return; // Error handling usually needed
      if (round.banishedPlayerId === p.playerId) return;

      const player = draft.players.find(pl => pl.id === p.playerId);
      if (!player) return;

      if (payload.type === 'wildcard') {
        if (!player.usedPowerUps.wildcard && player.powerUps.wildcard > 0) {
          player.powerUps.wildcard--;
          player.usedPowerUps.wildcard = true;
          round.wildcardUsedByPlayerId = p.playerId;
          round.powerUpUsedInRound = true;
        }
      } else if (payload.type === 'banish') {
        if (!player.usedPowerUps.banish && player.powerUps.banish > 0) {
          player.powerUps.banish--;
          player.usedPowerUps.banish = true;
          round.banishedPlayerId = payload.targetPlayerId;
          round.powerUpUsedInRound = true;
        }
      }
      // Hint/Steal not full impl in original either or simple
    }, "activatePowerUp");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    if (room.phase === 'voting' && room.currentVote) {
      this.startVoteTimer(room.code);
    }
  }

  vote(ws: WebSocket, targetId: string, category: Category, accepted: boolean) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
      if (draft.phase !== 'voting') return;
      const round = draft.rounds[draft.currentRound];
      const answer = round.validatedAnswers.find(a => a.playerId === targetId && a.category === category);
      if (!answer || !answer.isPendingVote) return;

      if (!answer.votes) answer.votes = { accepted: 0, rejected: 0 };
      // Logic for simple voting (not democratic full flow, but the request_vote flow)
      // Actually original had 'vote' separate from 'cast_democratic_vote'
      // This matches the 'vote' case in original switch
    }, "vote");
    // This seems to be the old voting logic. 
    // The democratic logic is `castDemocraticVote`.
  }

  requestVote(ws: WebSocket, payload: any) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
      if (!draft.settings?.enableVoting) {
        console.log('[RequestVote] Voting disabled in settings');
        return;
      }

      const player = draft.players.find(pl => pl.id === p.playerId);

      // Add to vote queue
      if (!draft.voteQueue) draft.voteQueue = [];
      draft.voteQueue.push({
        requestId: crypto.randomUUID(),
        requesterId: p.playerId,
        requesterName: player?.name || 'Unknown',
        category: payload.category,
        word: payload.word
      });

      console.log(`[RequestVote] Queue length: ${draft.voteQueue.length}, CurrentVote: ${!!draft.currentVote}`);

      if (!draft.currentVote && draft.voteQueue.length > 0) {
        const next = draft.voteQueue.shift()!;
        draft.currentVote = { ...next, votes: { yes: 0, no: 0 }, voterIds: [], votesDetails: {}, startTime: Date.now() };
        draft.phase = 'voting';
        console.log('[RequestVote] Started voting phase');
      }
    }, "requestVote");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    if (room.phase === 'voting' && room.currentVote) {
      // Only start timer if this is a newly created vote session
      const elapsed = Date.now() - room.currentVote.startTime;
      if (elapsed < 1000) {
        this.startVoteTimer(room.code);
      }
    }
  }

  castDemocraticVote(ws: WebSocket, vote: 'yes' | 'no') {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
      if (draft.phase !== 'voting' || !draft.currentVote) return;
      if (draft.currentVote.voterIds.includes(p.playerId)) return;

      draft.currentVote.voterIds.push(p.playerId);
      if (vote === 'yes') draft.currentVote.votes.yes++;
      else draft.currentVote.votes.no++;

      // Check majority
      const active = draft.players.length; // simplified
      if (draft.currentVote.votes.yes > active / 2 || draft.currentVote.votes.no > active / 2) {
        // Resolve immediately
        this.resolveCurrentVoteInDraft(draft);
      }
    }, "castVote");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    if (room.phase === 'voting' && room.currentVote) {
      // Check if we moved to NEXT vote (new session started by resolution)
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
      // Security check: Must be Referee (or Host as fallback if no referee set explicitly, but mostly Referee)
      // console.log(`[RefereeToggle] Req from ${p.playerId}, Referee: ${draft.refereeId}, IsHost: ${draft.players.find(pl => pl.id === p.playerId)?.isHost}`);
      if (draft.refereeId !== p.playerId && !draft.players.find(pl => pl.id === p.playerId)?.isHost) {
        console.log('[RefereeToggle] Denied: Not referee or host');
        return;
      }

      const round = draft.rounds[draft.currentRound];
      const ans = round.validatedAnswers.find((a: any) => a.playerId === payload.playerId && a.category === payload.category);

      if (ans) {
        console.log(`[RefereeToggle] Toggling ${ans.category} for ${ans.playerName} from ${ans.isValid} to ${!ans.isValid}`);
        ans.isValid = !ans.isValid;
        ans.reason = ans.isValid ? 'تم القبول من الحكم' : 'تم الرفض من الحكم';
        // Recalculate answer scores (unique etc) immediately for UI feedback
        this.roundManager.calculateAnswerScores(draft);
      } else {
        console.log(`[RefereeToggle] Answer not found for ${payload.playerId} / ${payload.category}`);
      }
    }, "refereeToggleValidity");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  private resolveCurrentVoteInDraft(draft: any) {
    // Resolve logic
    const accepted = draft.currentVote.votes.yes >= draft.currentVote.votes.no;
    const round = draft.rounds[draft.currentRound];
    const ans = round.validatedAnswers.find((a: any) => a.playerId === draft.currentVote.requesterId && a.category === draft.currentVote.category);
    if (ans) {
      ans.isValid = accepted;
      ans.isPendingVote = false;
    }
    draft.currentVote = null;
    if (draft.voteQueue.length > 0) {
      const next = draft.voteQueue.shift();
      draft.currentVote = { ...next, votes: { yes: 0, no: 0 }, voterIds: [], votesDetails: {}, startTime: Date.now() };
    } else {
      draft.phase = 'results';
    }
  }

  sendReaction(ws: WebSocket, type: ReactionType) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    this.broadcastToRoom(p.roomId, {
      type: 'reaction_received',
      payload: { reaction: { id: crypto.randomUUID(), type, playerId: p.playerId, playerName: '', timestamp: Date.now() } } // simplified
    });
  }

  playAgain(ws: WebSocket) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const buffer = this.roomManager.getRoomBuffer(p.roomId);
    if (!buffer) return;

    buffer.transact(draft => {
      // reset logic
      draft.currentRound = 0;
      draft.phase = 'lobby';
      draft.rounds = [];
      draft.players.forEach(pl => { pl.score = 0; pl.isReady = false; });
    }, "playAgain");

    const room = buffer.get();
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  // Helpers
  private send(ws: WebSocket, message: WSMessage) {
    if (message.type !== 'ping') console.log(`[GameManager] Sending: ${message.type}`, message.payload ? Object.keys(message.payload) : 'no payload');
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
}

// Export singleton
export const gameManager = new GameManager();

