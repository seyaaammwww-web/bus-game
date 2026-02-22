
import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import type { WSMessage, RoundAnswers, Category, PowerUpType, ReactionType, GameRoom } from '../shared/schema';
import { RoomManager } from './managers/RoomManager';
import { PlayerManager } from './managers/PlayerManager';
import { RoundManager } from './managers/RoundManager';
import { CorruptionProofBuffer } from './utils/reliability';
import { StateOrchestrator } from './persistence/StateOrchestrator';
import { votingService, reconnectService } from './container';

export class GameManager {
  private roomManager: RoomManager;
  private playerManager: PlayerManager;
  private roundManager: RoundManager;
  private stateOrchestrator: StateOrchestrator;

  private drafts: Map<string, Map<string, { answers: RoundAnswers, updatedAt: number, roundNumber: number }>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private disconnectTimeouts = new Map<string, NodeJS.Timeout>();

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
        const wsWrapper = p.ws as any;
        if (wsWrapper.isAlive === false) {
          console.log(`[GameManager] Terminating zombie socket: ${p.playerId}`);
          p.ws.terminate();
          continue;
        }
        wsWrapper.isAlive = false;
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
  // Connection & Core Handling
  // ==========================================

  async handleMessage(ws: WebSocket, message: WSMessage): Promise<void> {
    if (message.type !== 'ping' && message.type !== 'pong') {
      console.log(`[GameManager] Received: ${message.type}`, message.payload);
    }
    (ws as any).isAlive = true;

    try {
      switch (message.type) {
        case 'pong': break;
        case 'reconnect': await this.reconnect(ws, message.payload.token || message.payload.playerId); break;
        case 'create_room': await this.createRoom(ws, message.payload.playerName); break;
        case 'join_room': await this.joinRoom(ws, message.payload.roomCode, message.payload.playerName); break;
        case 'join_public_room': await this.joinPublicRoom(ws, message.payload.playerName); break;
        case 'player_ready': await this.setReady(ws); break;
        case 'start_game': await this.startGame(ws); break;
        case 'submit_answers': await this.submitAnswers(ws, message.payload.answers); break;
        case 'bus_complete': await this.triggerBusComplete(ws); break;
        case 'vote': await this.vote(ws, message.payload.playerId, message.payload.category, message.payload.accepted); break;
        case 'next_round': await this.nextRound(ws); break;
        case 'play_again': await this.playAgain(ws); break;
        case 'set_referee': await this.setReferee(ws, message.payload.playerId); break;
        case 'remove_referee': await this.removeReferee(ws); break;
        case 'referee_approve': await this.refereeApprove(ws); break;
        case 'update_settings': await this.updateSettings(ws, message.payload); break;
        case 'draft_update': await this.handleDraftUpdate(ws, message.payload.answers); break;
        case 'activate_powerup': await this.activatePowerUp(ws, message.payload); break;
        case 'send_reaction': await this.sendReaction(ws, message.payload.reactionType); break;
        case 'request_vote': await this.requestVote(ws, message.payload); break;
        case 'vote_cast':
        case 'cast_democratic_vote':
          await this.castDemocraticVote(ws, message.payload.vote || message.payload);
          break;
        case 'referee_toggle_validity': await this.refereeToggleValidity(ws, message.payload); break;
      }
    } catch (e: any) {
      console.error(`[GameManager] Error handling ${message.type}:`, e);
      this.send(ws, { type: 'error', payload: { message: e.message || 'Error occurred' } });
    }
  }

  async handleDisconnect(ws: WebSocket): Promise<void> {
    const playerInfo = this.playerManager.removePlayer(ws);
    if (!playerInfo) return;

    await this.roomManager.transact(playerInfo.roomId, draft => {
      const p = draft.players.find(p => p.id === playerInfo.playerId);
      if (p) {
        p.status = 'disconnected';
        p.disconnectedAt = Date.now();
      }
    }, "markDisconnected");

    const timeout = setTimeout(async () => {
      await this.roomManager.removePlayerFromRoom(playerInfo.roomId, playerInfo.playerId);
      const room = await this.roomManager.getRoom(playerInfo.roomId);
      if (room && room.players.length > 0) {
        this.broadcastToRoom(room.code, { type: 'player_left', payload: { players: room.players } });
      }
      this.disconnectTimeouts.delete(playerInfo.playerId);
    }, 45000);

    this.disconnectTimeouts.set(playerInfo.playerId, timeout);
  }

  async reconnect(ws: WebSocket, token: string): Promise<void> {
    const session = await reconnectService.restore(token);
    if (session) {
      const { playerId, roomId, newToken } = session;
      const timeout = this.disconnectTimeouts.get(playerId);
      if (timeout) {
        clearTimeout(timeout);
        this.disconnectTimeouts.delete(playerId);
      }

      const room = await this.roomManager.transact(roomId, draft => {
        const p = draft.players.find(player => player.id === playerId);
        if (p) {
          p.status = 'active';
          delete p.disconnectedAt;
        }
      }, "restoreActive");

      this.playerManager.addPlayer(ws, room.code, playerId);
      (ws as any).isAlive = true;
      this.send(ws, { type: 'sync_state', payload: { room, reconnectToken: newToken } });
      this.broadcastToRoom(room.code, { type: 'player_joined', payload: { players: room.players } }, ws);
    } else {
      this.send(ws, { type: 'error', payload: { message: 'انتهت المهلة أو التوكن غير صالح' } });
    }
  }

  // ==========================================
  // Room Management
  // ==========================================

  async createRoom(ws: WebSocket, playerName: string): Promise<void> {
    const tempId = randomUUID();
    try {
      const { room } = await this.roomManager.createRoom(tempId, playerName);
      this.playerManager.addPlayer(ws, room.code, tempId);
      this.send(ws, { type: 'room_created', payload: { room, playerId: tempId } });
    } catch (e: any) {
      this.send(ws, { type: 'error', payload: { message: e.message } });
    }
  }

  async joinRoom(ws: WebSocket, roomCode: string, playerName: string): Promise<void> {
    const normCode = roomCode.toUpperCase();
    const playerId = randomUUID();
    try {
      const room = await this.roomManager.joinRoom(normCode, playerId, playerName);
      this.playerManager.addPlayer(ws, room.code, playerId);
      this.send(ws, { type: 'room_joined', payload: { room, playerId } });
      this.broadcastToRoom(room.code, { type: 'player_joined', payload: { players: room.players } }, ws);
    } catch (e: any) {
      this.send(ws, { type: 'error', payload: { message: e.message } });
    }
  }

  async joinPublicRoom(ws: WebSocket, playerName: string): Promise<void> {
    const playerId = randomUUID();
    try {
      const room = await this.roomManager.joinPublicRoom(playerId, playerName);
      this.playerManager.addPlayer(ws, room.code, playerId);
      this.send(ws, { type: 'room_joined', payload: { room, playerId } });
      this.broadcastToRoom(room.code, { type: 'player_joined', payload: { players: room.players } }, ws);
    } catch (e: any) {
      this.send(ws, { type: 'error', payload: { message: e.message } });
    }
  }

  async setReady(ws: WebSocket): Promise<void> {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const room = await this.roomManager.transact(p.roomId, draft => {
      const player = draft.players.find(pl => pl.id === p.playerId);
      if (player) player.isReady = !player.isReady;
    }, "setReady");
    this.broadcastToRoom(room.code, { type: 'player_ready', payload: { players: room.players } });
  }

  // ==========================================
  // Game Flow
  // ==========================================

  async startGame(ws: WebSocket): Promise<void> {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    const room = await this.roomManager.transact(p.roomId, draft => {
      const isHost = draft.players.find(pl => pl.id === p.playerId)?.isHost;
      if (!isHost) throw new Error("Only host can start the game");
      this.roundManager.startRound(draft);
    }, "startGame");

    this.broadcastToRoom(room.code, { type: 'round_start', payload: { room } });
    this.roundManager.setRoundTimer(room.code, async () => {
      await this.endRound(room.code);
    });
  }

  async submitAnswers(ws: WebSocket, answers: RoundAnswers): Promise<void> {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    let isComplete = false;
    const room = await this.roomManager.transact(p.roomId, draft => {
      const result = this.roundManager.handleSubmission(draft, p.playerId, answers);
      isComplete = result.isComplete;
    }, "submitAnswers");

    const round = room.rounds[room.currentRound];
    const activeCount = room.players.filter(pl => pl.id !== room.refereeId && pl.id !== round.banishedPlayerId).length;

    this.broadcastToRoom(room.code, {
      type: 'player_submitted',
      payload: {
        playerId: p.playerId,
        submissionsCount: round.submissions.length,
        totalPlayers: activeCount
      }
    });

    if (isComplete) await this.endRound(room.code);
  }

  async triggerBusComplete(ws: WebSocket): Promise<void> {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    let startedRush = false;
    const room = await this.roomManager.transact(p.roomId, draft => {
      const round = draft.rounds[draft.currentRound];
      if (!round || round.isRush || round.banishedPlayerId === p.playerId) return;

      const sub = round.submissions.find(s => s.playerId === p.playerId);
      if (!sub) return;

      sub.busComplete = true;
      round.isRush = true;
      round.endTime = Date.now() + 10000;
      startedRush = true;
    }, "triggerBusComplete");

    if (startedRush) {
      this.broadcastToRoom(room.code, { type: 'rush_mode', payload: { room } });
      this.roundManager.setRoundTimer(room.code, async () => {
        await this.endRound(room.code);
      }, 10000);
    }
  }

  private async endRound(roomCode: string) {
    this.roundManager.clearTimer(roomCode);

    const room = await this.roomManager.transact(roomCode, draft => {
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
            (draft.settings?.customCategories || ['ولد', 'بنت', 'بلد', 'حيوان', 'جماد']).forEach(c => answers[c] = '');
          }
          this.roundManager.handleSubmission(draft, player.id, answers);
        }
      }
      this.drafts.delete(roomCode);
      this.roundManager.processRound(draft, () => { }, () => { });
    }, "endRound");

    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    if (room.phase === 'voting') {
      this.broadcastToRoom(room.code, {
        type: 'voting_start',
        payload: { room, validatedAnswers: room.rounds[room.currentRound].validatedAnswers }
      });
      this.startVoteTimer(room.code);
    } else {
      await this.finishRoundPhase(room.code);
    }
  }

  private async finishRoundPhase(roomCode: string) {
    const room = await this.roomManager.transact(roomCode, draft => {
      const round = draft.rounds[draft.currentRound];
      if (round) round.powerUpUsedInRound = false;

      if (draft.phase === 'playing' && draft.refereeId) {
        draft.phase = 'referee_review';
      } else {
        if (round.resultsCommitted) return;
        draft.phase = 'results';
        this.roundManager.commitRoundResults(draft);
      }
    }, "finishRoundPhase");

    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  // ==========================================
  // Voting & Referee
  // ==========================================

  private startVoteTimer(roomCode: string) {
    this.roundManager.setRoundTimer(roomCode, async () => {
      await this.handleVoteTimeout(roomCode);
    }, 15000);
  }

  private async handleVoteTimeout(roomCode: string) {
    const room = await this.roomManager.transact(roomCode, draft => {
      if (draft.phase !== 'voting' || !draft.currentVote) return;
      this.resolveCurrentVoteInDraft(draft);
    }, "handleVoteTimeout");

    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    if (!room.currentVote) {
      await this.finishRoundPhase(room.code);
    } else {
      this.startVoteTimer(room.code);
    }
  }

  private resolveCurrentVoteInDraft(draft: GameRoom) {
    const vote = draft.currentVote;
    if (!vote) return;

    const round = draft.rounds[draft.currentRound];
    const answer = round.validatedAnswers.find(a => a.playerId === vote.requesterId && a.category === vote.category);

    if (answer) {
      answer.isValid = vote.votes.yes > vote.votes.no;
      answer.isPendingVote = false;
      answer.reason = answer.isValid ? 'تم قبوله بالتصويت' : 'تم رفضه بالتصويت';
    }

    if (draft.voteQueue && draft.voteQueue.length > 0) {
      const next = draft.voteQueue.shift()!;
      draft.currentVote = { ...next, votes: { yes: 0, no: 0 }, voterIds: [], votesDetails: {}, startTime: Date.now() };
    } else {
      draft.currentVote = null;
    }
  }

  async castDemocraticVote(ws: WebSocket, vote: 'yes' | 'no') {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    const room = await this.roomManager.transact(p.roomId, draft => {
      if (draft.phase !== 'voting' || !draft.currentVote) return;
      const round = draft.rounds[draft.currentRound];
      const eligible = draft.players.filter(pl =>
        pl.id !== draft.currentVote!.requesterId &&
        pl.id !== draft.refereeId &&
        pl.id !== round?.banishedPlayerId
      );

      if (!eligible.find(ev => ev.id === p.playerId)) return;
      if (draft.currentVote.voterIds.includes(p.playerId)) return;

      draft.currentVote.voterIds.push(p.playerId);
      if (vote === 'yes') draft.currentVote.votes.yes++;
      else draft.currentVote.votes.no++;

      if (draft.currentVote.voterIds.length >= eligible.length) {
        this.resolveCurrentVoteInDraft(draft);
      }
    }, "castDemocraticVote");

    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
    if (room.phase !== 'voting') {
      await this.finishRoundPhase(room.code);
    }
  }

  async refereeApprove(ws: WebSocket) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    await this.finishRoundPhase(p.roomId);
  }

  async refereeToggleValidity(ws: WebSocket, payload: { playerId: string, category: Category }) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    const room = await this.roomManager.transact(p.roomId, draft => {
      if (draft.refereeId !== p.playerId) return;
      const round = draft.rounds[draft.currentRound];
      const ans = round.validatedAnswers.find(a => a.playerId === payload.playerId && a.category === payload.category);
      if (ans) {
        ans.isValid = !ans.isValid;
        ans.reason = 'تعديل الحكم';
      }
    }, "refereeToggle");

    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  // ==========================================
  // Misc Methods
  // ==========================================

  async updateSettings(ws: WebSocket, settings: any) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    const room = await this.roomManager.transact(p.roomId, draft => {
      const isHost = draft.players.find(pl => pl.id === p.playerId)?.isHost;
      if (!isHost) return;

      if (draft.phase === 'lobby') {
        if (settings.customCategories) draft.settings = { ...draft.settings, customCategories: settings.customCategories };
        if (settings.totalRounds) {
          const newTotal = Math.max(3, Math.min(20, Number(settings.totalRounds)));
          const alphabet = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";
          draft.totalRounds = newTotal;
          draft.letters = Array.from({ length: newTotal }, (_, i) =>
            draft.letters[i] || alphabet[Math.floor(Math.random() * alphabet.length)]
          );
        }
      }

      if (settings.enableVoting !== undefined) {
        if (!draft.settings) draft.settings = {};
        draft.settings.enableVoting = settings.enableVoting;
        if (settings.enableVoting && draft.refereeId) {
          draft.refereeId = undefined;
          draft.players.forEach(pl => pl.isReferee = false);
        }
      }
    }, "updateSettings");

    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  async handleDraftUpdate(ws: WebSocket, answers: RoundAnswers) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    const room = await this.roomManager.getRoom(p.roomId);
    if (!room || room.phase !== 'playing') return;

    if (!this.drafts.has(p.roomId)) this.drafts.set(p.roomId, new Map());
    this.drafts.get(p.roomId)!.set(p.playerId, {
      answers,
      updatedAt: Date.now(),
      roundNumber: room.currentRound
    });
  }

  async activatePowerUp(ws: WebSocket, payload: any) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    const room = await this.roomManager.transact(p.roomId, draft => {
      const round = draft.rounds[draft.currentRound];
      if (!round || round.powerUpUsedInRound || round.banishedPlayerId === p.playerId) return;

      const player = draft.players.find(pl => pl.id === p.playerId);
      if (!player) return;

      if (payload.type === 'wildcard' && player.powerUps.wildcard > 0) {
        player.powerUps.wildcard--;
        player.usedPowerUps.wildcard = true;
        round.wildcardUsedByPlayerId = p.playerId;
        round.powerUpUsedInRound = true;
      } else if (payload.type === 'banish' && player.powerUps.banish > 0) {
        player.powerUps.banish--;
        player.usedPowerUps.banish = true;
        round.banishedPlayerId = payload.targetPlayerId;
        round.powerUpUsedInRound = true;
      }
    }, "activatePowerUp");

    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  async nextRound(ws: WebSocket) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;

    const room = await this.roomManager.transact(p.roomId, draft => {
      if (draft.currentRound + 1 < draft.totalRounds) {
        draft.currentRound++;
        this.roundManager.startRound(draft);
      } else {
        draft.phase = 'final';
      }
    }, "nextRound");

    if (room.phase === 'playing') {
      this.broadcastToRoom(room.code, { type: 'round_start', payload: { room } });
      this.roundManager.setRoundTimer(room.code, async () => await this.endRound(room.code));
    } else {
      this.broadcastToRoom(room.code, { type: 'game_end', payload: { room } });
    }
  }

  async playAgain(ws: WebSocket) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const room = await this.roomManager.transact(p.roomId, draft => {
      draft.phase = 'lobby';
      draft.currentRound = 0;
      draft.rounds = [];
      const alphabet = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";
      draft.letters = Array.from({ length: draft.totalRounds }, () =>
        alphabet[Math.floor(Math.random() * alphabet.length)]
      );
      draft.players.forEach(pl => {
        pl.score = 0;
        pl.isReady = pl.isHost; // Keep host ready
        pl.busStreak = 0;
        pl.totalEarnedPoints = 0;
        pl.usedPowerUps = { wildcard: false, banish: false, hint: false, steal: false };
        pl.powerUps = { wildcard: 0, banish: 0, hint: 0, steal: 0 };
      });
    }, "playAgain");
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  async sendReaction(ws: WebSocket, reactionType: ReactionType) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    this.broadcastToRoom(p.roomId, {
      type: 'player_reaction',
      payload: { playerId: p.playerId, reactionType }
    });
  }

  async setReferee(ws: WebSocket, targetId: string) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const room = await this.roomManager.transact(p.roomId, draft => {
      const host = draft.players.find(pl => pl.id === p.playerId);
      if (!host?.isHost) return;
      draft.players.forEach(pl => pl.isReferee = false);
      const target = draft.players.find(pl => pl.id === targetId);
      if (target) {
        target.isReferee = true;
        draft.refereeId = targetId;
      }
      if (!draft.settings) draft.settings = {};
      draft.settings.enableVoting = false;
    }, "setReferee");
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  async removeReferee(ws: WebSocket) {
    const p = this.playerManager.getPlayer(ws);
    if (!p) return;
    const room = await this.roomManager.transact(p.roomId, draft => {
      draft.refereeId = undefined;
      draft.players.forEach(pl => pl.isReferee = false);
    }, "removeReferee");
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  async vote(ws: WebSocket, targetId: string, category: Category, accepted: boolean) {
    // Legacy or simple vote handler - usually castDemocraticVote is used now.
  }

  async requestVote(ws: WebSocket, payload: any) {
    // Logic for manual vote requests if applicable
  }

  // ==========================================
  // Helpers
  // ==========================================

  private broadcastToRoom(roomCode: string, message: WSMessage, excludeWs?: WebSocket) {
    const players = this.playerManager.getPlayersInRoom(roomCode);
    for (const p of players) {
      if (p.ws !== excludeWs && p.ws.readyState === WebSocket.OPEN) {
        this.send(p.ws, message);
      }
    }
  }

  private send(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

export const gameManager = new GameManager();
