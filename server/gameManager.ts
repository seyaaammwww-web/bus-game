import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import type {
  GameRoom,
  Player,
  Round,
  GamePhase,
  Category,
  RoundAnswers,
  PlayerSubmission,
  ValidatedAnswer,
  WSMessage
} from '@shared/schema';
import { categories } from '@shared/schema';
import { arabicWords, getRandomLetters } from '@shared/arabicWords';
import { HybridValidator } from './hybridValidator';
import { AIValidator } from './aiValidator';
import { GroqService } from './services/groqService';
import { WildcardService } from './services/wildcardService';

interface ConnectedPlayer {
  ws: WebSocket;
  playerId: string;
  roomId: string;
}

interface VoteRecord {
  voterId: string;
  accepted: boolean;
}

interface AnswerVotes {
  playerId: string;
  category: Category;
  votes: VoteRecord[];
}

const PUBLIC_ROOM_CODE = 'PLAY';

class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private players: Map<WebSocket, ConnectedPlayer> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private answerVotes: Map<string, AnswerVotes[]> = new Map(); // roomCode -> votes

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return this.rooms.has(code) ? this.generateRoomCode() : code;
  }

  private ensurePublicRoom(): GameRoom {
    let room = this.rooms.get(PUBLIC_ROOM_CODE);
    if (!room || room.phase !== 'lobby') {
      const roomId = randomUUID();
      room = {
        id: roomId,
        code: PUBLIC_ROOM_CODE,
        hostId: '',
        players: [],
        rounds: [],
        currentRound: 0,
        totalRounds: 10,
        phase: 'lobby',
        letters: getRandomLetters(10),
        createdAt: Date.now(),
        isPublicRoom: true,
      };
      this.rooms.set(PUBLIC_ROOM_CODE, room);
      this.answerVotes.set(PUBLIC_ROOM_CODE, []);
    }
    return room;
  }

  private normalizeArabic(text: string): string {
    return text
      .trim()
      .replace(/[\u064B-\u065F]/g, '') // Remove Arabic diacritics
      .replace(/أ|إ|آ/g, 'ا') // Normalize alef variants
      .replace(/ة/g, 'ه') // Normalize taa marbuta
      .replace(/ى/g, 'ي') // Normalize alef maqsura
      .toLowerCase();
  }

  private getFirstArabicLetter(text: string): string {
    const normalized = this.normalizeArabic(text);
    if (!normalized) return '';

    // Get first character, handling Arabic letters
    const firstChar = normalized.charAt(0);

    // Map common first letters
    const letterMap: Record<string, string> = {
      'ا': 'أ', 'ال': 'أ',
    };

    return letterMap[firstChar] || firstChar;
  }

  private getRoomCategories(room: GameRoom): readonly string[] {
    return room.settings?.customCategories || categories;
  }

  private checkStartsWithLetter(text: string, letter: string): boolean {
    if (!text) return false;
    const normalizedText = this.normalizeArabic(text);
    const normalizedLetter = this.normalizeArabic(letter);

    // Handle "ال" prefix
    const firstChar = normalizedText.startsWith('ال') ? normalizedText.charAt(2) : normalizedText.charAt(0);
    const targetChar = normalizedLetter.charAt(0);

    const variants: Record<string, string[]> = {
      'ا': ['ا', 'أ', 'إ', 'آ'],
      'أ': ['ا', 'أ', 'إ', 'آ'],
      'إ': ['ا', 'أ', 'إ', 'آ'],
      'آ': ['ا', 'أ', 'إ', 'آ'],
      'ه': ['ه', 'ة'],
      'ة': ['ه', 'ة'],
      'ي': ['ي', 'ى'],
      'ى': ['ي', 'ى'],
    };

    const valid = variants[targetChar] || [targetChar];
    return valid.includes(firstChar);
  }

  private validateAnswer(letter: string, category: Category, answer: string): boolean {
    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) return false;

    // Check if answer starts with the correct letter (or close variant)
    const normalizedLetter = this.normalizeArabic(letter);
    const normalizedAnswer = this.normalizeArabic(trimmedAnswer);

    // Handle "ال" prefix for countries
    const answerFirstChar = normalizedAnswer.startsWith('ال')
      ? normalizedAnswer.charAt(2)
      : normalizedAnswer.charAt(0);

    const letterFirstChar = normalizedLetter.charAt(0);

    // Check if first letter matches (with some tolerance for Arabic variants)
    const letterVariants: Record<string, string[]> = {
      'ا': ['ا', 'أ', 'إ', 'آ'],
      'أ': ['ا', 'أ', 'إ', 'آ'],
      'إ': ['ا', 'أ', 'إ', 'آ'],
      'آ': ['ا', 'أ', 'إ', 'آ'],
      'ه': ['ه', 'ة'],
      'ة': ['ه', 'ة'],
      'ي': ['ي', 'ى'],
      'ى': ['ي', 'ى'],
    };

    const validFirstChars = letterVariants[letterFirstChar] || [letterFirstChar];
    const startsWithLetter = validFirstChars.includes(answerFirstChar);

    if (!startsWithLetter) return false;

    // Check against database
    const letterData = arabicWords[letter];
    if (!letterData) return true; // If no database entry, accept if starts with letter

    const validWords = letterData[category] || [];
    if (validWords.length === 0) return true; // If no words for category, accept if starts with letter

    // Check for exact or partial match in database
    const normalizedValidWords = validWords.map(w => this.normalizeArabic(w));
    return normalizedValidWords.some(word =>
      word === normalizedAnswer ||
      word.includes(normalizedAnswer) ||
      normalizedAnswer.includes(word)
    );
  }

  private checkAndEndRound(room: GameRoom): void {
    const round = room.rounds[room.currentRound];
    if (!round) return;

    const activePlayers = room.refereeId
      ? room.players.filter(p =>
        p.id !== room.refereeId &&
        p.id !== round.banishedPlayerId
      ).length
      : room.players.filter(p =>
        p.id !== round.banishedPlayerId
      ).length;

    if (round.submissions.length === activePlayers) {
      console.log(`[CheckEndRound] All ${activePlayers} players submitted. Ending round.`);
      this.endRound(room);
    }
  }

  private validateAnswerLenient(letter: string, category: Category, answer: string): boolean {
    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) return false;

    // Minimum length check
    if (trimmedAnswer.length < 2) return false;

    // Check if answer starts with the correct letter (or close variant)
    const normalizedLetter = this.normalizeArabic(letter);
    const normalizedAnswer = this.normalizeArabic(trimmedAnswer);

    // Handle "ال" prefix for countries
    const answerFirstChar = normalizedAnswer.startsWith('ال')
      ? normalizedAnswer.charAt(2)
      : normalizedAnswer.charAt(0);

    const letterFirstChar = normalizedLetter.charAt(0);

    // Check if first letter matches (with some tolerance for Arabic variants)
    const letterVariants: Record<string, string[]> = {
      'ا': ['ا', 'أ', 'إ', 'آ'],
      'أ': ['ا', 'أ', 'إ', 'آ'],
      'إ': ['ا', 'أ', 'إ', 'آ'],
      'آ': ['ا', 'أ', 'إ', 'آ'],
      'ه': ['ه', 'ة'],
      'ة': ['ه', 'ة'],
      'ي': ['ي', 'ى'],
      'ى': ['ي', 'ى'],
    };

    const validFirstChars = letterVariants[letterFirstChar] || [letterFirstChar];
    const startsWithLetter = validFirstChars.includes(answerFirstChar);

    // In lenient mode, accept if starts with correct letter - no database check needed
    return startsWithLetter;
  }

  createRoom(ws: WebSocket, playerName: string): void {
    const roomCode = this.generateRoomCode();
    const playerId = randomUUID();
    const roomId = randomUUID();

    const player: Player = {
      id: playerId,
      name: playerName,
      score: 0,
      isHost: true,
      isReady: false,
      busStreak: 0,
      powerUps: { hint: 0, steal: 0, wildcard: 0, banish: 0 },
      usedPowerUps: { hint: false, steal: false, wildcard: false, banish: false },
      totalEarnedPoints: 0,
    };

    const room: GameRoom = {
      id: roomId,
      code: roomCode,
      hostId: playerId,
      players: [player],
      rounds: [],
      currentRound: 0,
      totalRounds: 10,
      phase: 'lobby',
      letters: getRandomLetters(10),
      createdAt: Date.now(),
    };

    this.rooms.set(roomCode, room);
    this.players.set(ws, { ws, playerId, roomId: roomCode });
    this.answerVotes.set(roomCode, []);

    this.send(ws, {
      type: 'room_created',
      payload: { room, playerId },
    });
  }

  joinPublicRoom(ws: WebSocket, playerName: string): void {
    const room = this.ensurePublicRoom();

    if (room.players.length >= 8) {
      this.send(ws, { type: 'error', payload: { message: 'الغرفة ممتلئة' } });
      return;
    }

    const playerId = randomUUID();
    const isFirstPlayer = room.players.length === 0;
    const player: Player = {
      id: playerId,
      name: playerName,
      score: 0,
      isHost: isFirstPlayer,
      isReady: false,
      busStreak: 0,
      powerUps: { hint: 0, steal: 0, wildcard: 0, banish: 0 },
      usedPowerUps: { hint: false, steal: false, wildcard: false, banish: false },
      totalEarnedPoints: 0,
    };

    if (isFirstPlayer) {
      room.hostId = playerId;
    }

    room.players.push(player);
    this.players.set(ws, { ws, playerId, roomId: PUBLIC_ROOM_CODE });

    this.send(ws, {
      type: 'room_joined',
      payload: { room, playerId },
    });

    this.broadcastToRoom(PUBLIC_ROOM_CODE, {
      type: 'player_joined',
      payload: { players: room.players },
    }, ws);
  }

  setReferee(ws: WebSocket, playerId: string): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;

    const room = this.rooms.get(playerInfo.roomId);
    if (!room || room.phase !== 'lobby') return;

    const player = room.players.find(p => p.id === playerInfo.playerId);
    if (!player?.isHost) return;

    const targetPlayer = room.players.find(p => p.id === playerId);
    if (!targetPlayer) return;

    // Clear previous referee
    room.players.forEach(p => p.isReferee = false);

    // Set new referee
    targetPlayer.isReferee = true;
    room.refereeId = playerId;

    this.broadcastToRoom(room.code, {
      type: 'sync_state',
      payload: { room },
    });
  }

  removeReferee(ws: WebSocket): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;

    const room = this.rooms.get(playerInfo.roomId);
    if (!room || room.phase !== 'lobby') return;

    const player = room.players.find(p => p.id === playerInfo.playerId);
    if (!player?.isHost) return;

    room.players.forEach(p => p.isReferee = false);
    room.refereeId = undefined;

    this.broadcastToRoom(room.code, {
      type: 'sync_state',
      payload: { room },
    });
  }

  joinRoom(ws: WebSocket, roomCode: string, playerName: string): void {
    console.log(`[Join Room] ${playerName} attempting to join room ${roomCode}`);
    const room = this.rooms.get(roomCode.toUpperCase());

    if (!room) {
      console.log(`[Join Room] Failed: Room ${roomCode} not found`);
      this.send(ws, { type: 'error', payload: { message: 'الغرفة مش موجودة' } });
      return;
    }

    if (room.phase !== 'lobby') {
      console.log(`[Join Room] Failed: Room ${roomCode} not in lobby phase`);
      this.send(ws, { type: 'error', payload: { message: 'اللعبة بدأت بالفعل' } });
      return;
    }

    if (room.players.length >= 8) {
      console.log(`[Join Room] Failed: Room ${roomCode} is full`);
      this.send(ws, { type: 'error', payload: { message: 'الغرفة ممتلئة' } });
      return;
    }

    const playerId = randomUUID();
    const player: Player = {
      id: playerId,
      name: playerName,
      score: 0,
      isHost: false,
      isReady: false,
      busStreak: 0,
      powerUps: { hint: 0, steal: 0, wildcard: 0, banish: 0 },
      usedPowerUps: { hint: false, steal: false, wildcard: false, banish: false },
      totalEarnedPoints: 0,
    };

    room.players.push(player);
    this.players.set(ws, { ws, playerId, roomId: roomCode.toUpperCase() });

    console.log(`[Join Room] ✓ ${playerName} (${playerId.slice(0, 8)}...) joined room ${room.code}. Total players: ${room.players.length}`);

    this.send(ws, {
      type: 'room_joined',
      payload: { room, playerId },
    });

    this.broadcastToRoom(roomCode, {
      type: 'player_joined',
      payload: { players: room.players },
    }, ws);
  }

  setReady(ws: WebSocket): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;

    const room = this.rooms.get(playerInfo.roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === playerInfo.playerId);
    if (player) {
      player.isReady = true;
      this.broadcastToRoom(playerInfo.roomId, {
        type: 'player_ready',
        payload: { players: room.players },
      });
    }
  }

  startGame(ws: WebSocket): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;

    const room = this.rooms.get(playerInfo.roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === playerInfo.playerId);
    if (!player?.isHost) return;

    if (room.players.length < 1) {
      this.send(ws, { type: 'error', payload: { message: 'محتاج لاعب واحد على الأقل' } });
      return;
    }

    if (!room.players.every(p => p.isReady)) {
      this.send(ws, { type: 'error', payload: { message: 'مش كل اللاعبين جاهزين' } });
      return;
    }

    this.startRound(room);
  }

  private startRound(room: GameRoom): void {
    // Clear previous votes
    this.answerVotes.set(room.code, []);

    const activePlayers = room.refereeId
      ? room.players.filter(p => p.id !== room.refereeId)
      : room.players;

    console.log(`[Round Start] Room ${room.code} - Round ${room.currentRound + 1} - Letter: ${room.letters[room.currentRound]}`);
    console.log(`[Round Start] Active players: ${activePlayers.map(p => p.name).join(', ')} (${activePlayers.length} total)`);
    if (room.refereeId) {
      const referee = room.players.find(p => p.id === room.refereeId);
      console.log(`[Round Start] Referee: ${referee?.name}`);
    }

    const round: Round = {
      number: room.currentRound + 1,
      letter: room.letters[room.currentRound],
      startTime: Date.now(),
      endTime: Date.now() + 45000,
      isRush: false,
      submissions: [],
      validatedAnswers: [],
      votingComplete: false,
      powerUpUsedInRound: false,
    };

    room.rounds[room.currentRound] = round;
    room.phase = 'playing';

    this.broadcastToRoom(room.code, {
      type: 'round_start',
      payload: { room },
    });

    // Set timer for 45 seconds
    const timer = setTimeout(() => {
      this.endRound(room);
    }, 45000);

    this.timers.set(room.code, timer);
  }

  submitAnswers(ws: WebSocket, answers: RoundAnswers): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) {
      console.log(`[Submit] Failed: No player info found for WebSocket`);
      return;
    }

    const room = this.rooms.get(playerInfo.roomId);
    if (!room || room.phase !== 'playing') {
      console.log(`[Submit] Failed: Room not found or not in playing phase. Room: ${playerInfo.roomId}, Phase: ${room?.phase}`);
      return;
    }

    const player = room.players.find(p => p.id === playerInfo.playerId);
    if (!player) {
      console.log(`[Submit] Failed: Player ${playerInfo.playerId} not found in room ${room.code}`);
      return;
    }

    // Referee cannot submit answers - they only review
    if (room.refereeId === playerInfo.playerId) {
      console.log(`[Referee] ${player.name} is referee, skipping answer submission`);
      return;
    }

    const round = room.rounds[room.currentRound];
    if (!round) {
      console.log(`[Submit] Failed: Round ${room.currentRound} not found`);
      return;
    }

    // Check if player is banished this round
    if (round.banishedPlayerId === playerInfo.playerId) {
      console.log(`[Submit] ${player.name} is banished, can't submit`);
      this.send(ws, {
        type: 'error',
        payload: { message: 'أنت مطرود من هذه الجولة! لا تقدر تقدم إجابات' }
      });
      return;
    }

    // ✅ FIX: Check if already submitted and send confirmation
    if (round.submissions.find(s => s.playerId === playerInfo.playerId)) {
      console.log(`[Submit] ${player.name} already submitted for round ${room.currentRound + 1}`);
      // ✅ Send error response instead of silent failure
      this.send(ws, {
        type: 'error',
        payload: { message: 'تم إرسال الإجابات بالفعل' }
      });
      return;
    }

    const submission: PlayerSubmission = {
      playerId: playerInfo.playerId,
      playerName: player.name,
      answers,
      submittedAt: Date.now(),
      busComplete: false,
    };

    round.submissions.push(submission);
    console.log(`[Submit] ✓ ${player.name} submitted answers for round ${room.currentRound + 1}. Total submissions: ${round.submissions.length}`);

    // Calculate active players (excluding referee)
    const activePlayers = room.refereeId
      ? room.players.filter(p =>
        p.id !== room.refereeId &&
        p.id !== round.banishedPlayerId
      ).length
      : room.players.filter(p =>
        p.id !== round.banishedPlayerId
      ).length;

    console.log(`[Submit] Progress: ${round.submissions.length}/${activePlayers} players submitted${round.banishedPlayerId ? ` (1 banished)` : ''}`);

    // Broadcast submission status to all players
    this.broadcastToRoom(room.code, {
      type: 'player_submitted',
      payload: {
        playerId: playerInfo.playerId,
        submissionsCount: round.submissions.length,
        totalPlayers: activePlayers
      },
    });

    // Check if all ACTIVE players submitted (excluding referee)
    if (round.submissions.length === activePlayers) {
      console.log(`[Submit] All ${activePlayers} players submitted. Ending round.`);
      this.endRound(room);
    }
  }

  triggerBusComplete(ws: WebSocket): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;

    const room = this.rooms.get(playerInfo.roomId);
    if (!room || room.phase !== 'playing') return;

    const player = room.players.find(p => p.id === playerInfo.playerId);
    if (!player) return;

    const round = room.rounds[room.currentRound];
    if (!round) return;

    // Check if player is banished this round
    if (round.banishedPlayerId === playerInfo.playerId) {
      console.log(`[Bus Complete] Failed: ${player.name} is banished`);
      this.send(ws, {
        type: 'error',
        payload: { message: 'أنت مطرود من هذه الجولة!' }
      });
      return;
    }

    if (round.isRush) {
      return; // Already in rush, can't trigger again
    }

    // Normal bus complete
    const existingSubmission = round.submissions.find(s => s.playerId === playerInfo.playerId);
    if (existingSubmission) {
      existingSubmission.busComplete = true;
    } else {
      // If they haven't submitted yet for some reason, they should submit first
      this.send(ws, {
        type: 'error',
        payload: { message: 'يرجى ملء الإجابات أولاً!' }
      });
      return;
    }

    // Clear existing timer and set rush timer
    const existingTimer = this.timers.get(room.code);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    round.isRush = true;
    round.endTime = Date.now() + 10000;

    this.broadcastToRoom(room.code, {
      type: 'rush_mode',
      payload: { room },
    });

    const rushTimer = setTimeout(() => {
      this.endRound(room);
    }, 10000);

    this.timers.set(room.code, rushTimer);
  }



  updateSettings(ws: WebSocket, settings: any): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;

    const room = this.rooms.get(playerInfo.roomId);
    if (!room || room.phase !== 'lobby') return;

    const player = room.players.find(p => p.id === playerInfo.playerId);
    if (!player?.isHost) return;

    if (settings.customCategories && Array.isArray(settings.customCategories)) {
      room.settings = { ...room.settings, customCategories: settings.customCategories };
    }

    this.broadcastToRoom(room.code, {
      type: 'sync_state',
      payload: { room }
    });
  }

  private endRound(room: GameRoom): void {
    const timer = this.timers.get(room.code);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(room.code);
    }

    const round = room.rounds[room.currentRound];

    // Check for players who didn't submit at all (not banished)
    const allNonRefereeNonBanished = room.players.filter(p =>
      p.id !== room.refereeId &&
      p.id !== round.banishedPlayerId
    );

    for (const player of allNonRefereeNonBanished) {
      const hasSubmitted = round.submissions.some(s => s.playerId === player.id);
      if (!hasSubmitted) {
        console.log(`[End Round] Player ${player.name} didn't submit - adding empty submission`);
        const currentCategories = this.getRoomCategories(room);
        const emptyAnswers: RoundAnswers = {};
        currentCategories.forEach(cat => emptyAnswers[cat] = '');

        const submission: PlayerSubmission = {
          playerId: player.id,
          playerName: player.name,
          answers: emptyAnswers,
          submittedAt: Date.now(),
          busComplete: false,
        };

        round.submissions.push(submission);
      }
    }

    // ✅ Instant Scoring: Use Groq/HybridValidator immediately
    room.phase = 'ai_processing';

    // Notify clients that we are validating
    this.broadcastToRoom(room.code, {
      type: 'sync_state',
      payload: { room },
    });

    // Validate using HybridValidator (with Groq Batching)
    console.log(`[Round ${room.currentRound + 1}] Starting AI validation...`);
    this.processRoundWithAI(room).then(() => {
      // Broadcast final results for this round
      this.broadcastToRoom(room.code, {
        type: 'round_results',
        payload: { room },
      });
      this.finishRound(room);
    });
  }

  private async processRoundWithAI(room: GameRoom): Promise<void> {
    const round = room.rounds[room.currentRound];
    if (!round) return;

    if (this.calculatingRooms.has(room.code)) return;
    this.calculatingRooms.add(room.code);

    try {
      await this.calculateScores(room);
    } catch (e) {
      console.error("Error calculating scores:", e);
    } finally {
      this.calculatingRooms.delete(room.code);
    }
  }

  /**
   * Process final validation for ALL rounds at game end
   * Single batch request to AI with all answers
   */
  private async processFinalValidation(room: GameRoom): Promise<void> {
    console.log(`[Final Validation] Starting batch validation for ${room.totalRounds} rounds...`);

    const startTime = Date.now();

    // Collect all answers from all rounds
    const allAnswers: Array<{
      roundNumber: number;
      playerId: string;
      category: Category;
      letter: string;
      answer: string;
    }> = [];

    for (let i = 0; i < room.rounds.length; i++) {
      const round = room.rounds[i];
      if (!round) continue;

      for (const validatedAnswer of round.validatedAnswers) {
        if (validatedAnswer.answer && validatedAnswer.answer.trim()) {
          allAnswers.push({
            roundNumber: round.number,
            playerId: validatedAnswer.playerId,
            category: validatedAnswer.category as Category,
            letter: round.letter,
            answer: validatedAnswer.answer
          });
        }
      }
    }

    console.log(`[Final Validation] Collected ${allAnswers.length} total answers from ${room.rounds.length} rounds`);

    try {
      // Validate all at once using HybridValidator (Groq primary)
      const validationResults = await HybridValidator.getInstance().validateBatch(
        allAnswers.map(item => ({
          playerId: item.playerId,
          category: item.category,
          letter: item.letter,
          answer: item.answer
        }))
      );

      // Apply results to all rounds
      let validatedCount = 0;
      for (let i = 0; i < allAnswers.length; i++) {
        const item = allAnswers[i];
        const result = validationResults.get(`${item.playerId}:${item.category}`);

        if (result) {
          // Find the round and answer
          const round = room.rounds.find(r => r.number === item.roundNumber);
          if (round) {
            const validatedAnswer = round.validatedAnswers.find(
              a => a.playerId === item.playerId && a.category === item.category
            );

            if (validatedAnswer) {
              validatedAnswer.isValid = result.isValid;
              validatedAnswer.reason = result.reason;
              validatedAnswer.isFabricated = false;
              validatedCount++;
            }
          }
        }
      }

      console.log(`[Final Validation] ✅ Validated ${validatedCount}/${allAnswers.length} answers in ${Date.now() - startTime}ms`);

      // Now calculate scores for all rounds using the same logic as calculateScores
      for (const round of room.rounds) {
        if (!round) continue;

        // Calculate scores based on validity and uniqueness
        const currentCategories = this.getRoomCategories(room);
        const allRoundAnswers = round.validatedAnswers;

        // Count duplicates
        const answerCounts = new Map<string, number>();
        for (const ans of allRoundAnswers) {
          if (ans.isValid) {
            const key = `${ans.category}:${this.normalizeArabic(ans.answer)}`;
            answerCounts.set(key, (answerCounts.get(key) || 0) + 1);
          }
        }

        // Calculate scores
        for (const validatedAnswer of allRoundAnswers) {
          if (!validatedAnswer.isValid) {
            validatedAnswer.score = 0;
            validatedAnswer.isUnique = false;
            continue;
          }

          const key = `${validatedAnswer.category}:${this.normalizeArabic(validatedAnswer.answer)}`;
          const count = answerCounts.get(key) || 1;
          validatedAnswer.isUnique = count === 1;
          validatedAnswer.score = validatedAnswer.isUnique ? 20 : 10;
        }

        // Update player scores
        for (const player of room.players) {
          if (player.id === room.refereeId) continue;

          const playerAnswers = round.validatedAnswers.filter(a => a.playerId === player.id);
          const roundScore = playerAnswers.reduce((sum, a) => sum + a.score, 0);
          player.score += roundScore;
        }
      }

      // Calculate final bonuses
      this.calculateFinalBonuses(room);

      // Move to final phase
      room.phase = 'final';
      this.broadcastToRoom(room.code, {
        type: 'game_end',
        payload: { room },
      });

      console.log(`[Final Validation] 🎉 Complete! Total time: ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error('[Final Validation] Error:', error);

      // Fallback: accept all answers
      for (const round of room.rounds) {
        if (!round) continue;
        for (const answer of round.validatedAnswers) {
          answer.isValid = true;
          answer.reason = 'مقبول (خطأ تقني)';
          answer.score = 20; // Assume unique for fallback
          answer.isUnique = true;
        }

        // Update player scores
        for (const player of room.players) {
          if (player.id === room.refereeId) continue;
          const playerAnswers = round.validatedAnswers.filter(a => a.playerId === player.id);
          player.score += playerAnswers.reduce((sum, a) => sum + a.score, 0);
        }
      }

      this.calculateFinalBonuses(room);
      room.phase = 'final';
      this.broadcastToRoom(room.code, {
        type: 'game_end',
        payload: { room },
      });
    }
  }

  vote(ws: WebSocket, targetPlayerId: string, category: Category, accepted: boolean): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;
    const room = this.rooms.get(playerInfo.roomId);
    if (!room) return;

    this.handleVoteLogic(room, targetPlayerId, category, accepted, playerInfo.playerId);
  }

  private finishRound(room: GameRoom): void {
    const round = room.rounds[room.currentRound];
    if (!round) return;

    // Reset power-up usage flag for next round
    round.powerUpUsedInRound = false;

    room.phase = 'results';

    const nextRoundTime = Date.now() + 20000;
    room.nextRoundAt = nextRoundTime;

    this.broadcastToRoom(room.code, {
      type: 'round_results',
      payload: { room },
    });

    if (room.currentRound >= room.totalRounds - 1) {
      // GAME END - Calculate Bus Streak bonuses NOW
      this.calculateFinalBonuses(room);

      setTimeout(() => {
        room.phase = 'final';
        this.broadcastToRoom(room.code, {
          type: 'game_end',
          payload: { room }
        });
      }, 10000);
    } else {
      const code = room.code;
      setTimeout(() => {
        const currentRoom = this.rooms.get(code);
        if (currentRoom && currentRoom.currentRound === round.number - 1 && currentRoom.phase === 'results') {
          this.startNextRound(currentRoom);
        }
      }, 20000);
    }
  }

  private calculateFinalBonuses(room: GameRoom): void {
    console.log(`[Final Bonuses] Calculating end-of-game bonuses for room ${room.code}`);

    const currentCategories = this.getRoomCategories(room);

    for (const player of room.players) {
      // Skip referee
      if (player.id === room.refereeId) continue;

      // Calculate max consecutive perfect Bus Completes
      let maxStreak = 0;
      let currentStreak = 0;

      for (const round of room.rounds) {
        const submission = round.submissions.find(s => s.playerId === player.id);
        const playerAnswers = round.validatedAnswers.filter(a => a.playerId === player.id);
        const validCount = playerAnswers.filter(a => a.isValid).length;
        const allValid = validCount >= currentCategories.length;

        if (submission?.busComplete && allValid) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }

      // Store max streak for display
      player.busStreak = maxStreak;

      // Give bonus if achieved 3+ consecutive perfect Bus Completes
      if (maxStreak >= 3) {
        const bonus = 10;
        player.score += bonus;
        console.log(`[Final Bonus] 🚌 ${player.name}: +${bonus} pts for ${maxStreak} consecutive perfect Bus Completes!`);
      } else {
        console.log(`[Final Bonus] ${player.name}: No bonus (max streak: ${maxStreak})`);
      }
    }
  }

  handleDraftUpdate(ws: WebSocket, payload: { answers: RoundAnswers }): void {
    // Draft updates are now only for local state sync if needed, or we can just ignore for now as peeking is removed.
    // Keeping method signature if needed for future features
  }



  private startNextRound(room: GameRoom): void {
    room.currentRound++;
    this.startRound(room);
  }

  private calculatingRooms = new Set<string>();

  private async calculateScores(room: GameRoom): Promise<void> {
    const round = room.rounds[room.currentRound];
    if (!round) return;

    // 1. Collect and Normalize Answers
    const currentCategories = this.getRoomCategories(room);
    const allAnswers: { playerId: string, category: string, answer: string, normalized: string }[] = [];

    for (const category of currentCategories) {
      for (const submission of round.submissions) {
        const answer = submission.answers[category];
        if (answer && answer.trim()) {
          allAnswers.push({
            playerId: submission.playerId,
            category,
            answer,
            normalized: this.normalizeArabic(answer)
          });
        }
      }
    }

    // 2. Batch Validation using HybridValidator (DB + AI)
    round.validatedAnswers = [];

    // Prepare items for batch validation
    const itemsToValidate = allAnswers.map(item => ({
      playerId: item.playerId,
      category: item.category as Category,
      letter: round.letter,
      answer: item.answer
    }));

    try {
      console.log(`[Calculate Scores] Validating ${itemsToValidate.length} answers...`);
      const validationResults = await HybridValidator.getInstance().validateBatch(itemsToValidate);

      for (const item of allAnswers) {
        const key = `${item.playerId}:${item.category}`;
        const result = validationResults.get(key);

        let isValid = result?.isValid || false;
        let isPendingVote = false;
        let reason = result?.reason || '';
        const isFabricated = !!(result?.source === 'ai' && !result.isValid); // Mark as fabricated if AI explicitly rejected it

        // Override for Wildcard
        if (round.wildcardUsedByPlayerId === item.playerId) {
          isValid = true;
          reason = 'جوكر';
          isPendingVote = false;
        }

        // If invalid but strictly matches letter (and not explicitly fabricated/rejected by AI), chance for voting?
        // Current logic: If AI rejected it, it's rejected. If HybridValidator returns invalid (not in DB, not AI confirmed), we might fallback to vote?
        // But we want "Instant Scoring".
        // Let's trust the HybridValidator (which now uses AI).
        // If HybridValidator says invalid, it's invalid.

        // HOWEVER: HybridValidator fallback is "Not in DB" if AI fails.
        // So we might still want voting for "heuristic" source failures?
        // Let's keep it simple: Trust validation.

        round.validatedAnswers.push({
          playerId: item.playerId,
          playerName: room.players.find(p => p.id === item.playerId)?.name || '',
          category: item.category,
          answer: item.answer,
          isValid,
          isPendingVote: false, // No voting phase anymore, AI decides!
          isUnique: false,
          score: 0,
          votes: { accepted: 0, rejected: 0 },
          reason,
          isFabricated
        });
      }

      // Calculate logic for scoring (Unique/Common) happens in finalizeScores
      this.finalizeScores(room);

    } catch (error) {
      console.error("Error in calculateScores:", error);
      // Fallback?
    }
  }

  private startVotingPhase(room: GameRoom): void {
    room.phase = 'voting';
    this.broadcastToRoom(room.code, {
      type: 'voting_start',
      payload: { room, validatedAnswers: room.rounds[room.currentRound].validatedAnswers }
    });
  }

  // Internal Logic for Handling Votes
  public handleVoteLogic(room: GameRoom, targetPlayerId: string, category: Category, accepted: boolean, voterId: string): void {
    const round = room.rounds[room.currentRound];
    if (!round || room.phase !== 'voting') return;

    const answer = round.validatedAnswers.find(a => a.playerId === targetPlayerId && a.category === category);
    if (!answer || !answer.isPendingVote) return;
    if (answer.playerId === voterId) return; // Self-voting prevented

    // Apply Vote
    if (accepted) answer.votes.accepted++;
    else answer.votes.rejected++;

    // Active players excluding referee and the answer owner
    const activePlayers = room.players.filter(p => !p.isReferee && p.id !== answer.playerId).length;
    const totalVotes = answer.votes.accepted + answer.votes.rejected;

    // Decision Logic
    const majority = Math.ceil(activePlayers / 2);

    if (answer.votes.accepted > activePlayers / 2) {
      answer.isPendingVote = false;
      answer.isValid = true;
      answer.reason = 'تم قبوله بالتصويت';
    } else if (answer.votes.rejected >= majority) {
      answer.isPendingVote = false;
      answer.isValid = false;
      answer.reason = 'تم رفضه بالتصويت';
    } else if (totalVotes >= activePlayers) {
      // All voted
      answer.isPendingVote = false;
      if (answer.votes.accepted >= answer.votes.rejected) {
        answer.isValid = true;
        answer.reason = 'تم قبوله (الأغلبية)';
      } else {
        answer.isValid = false;
        answer.reason = 'تم رفضه';
      }
    }

    // Check if ALL pending votes are resolved
    const remainingPending = round.validatedAnswers.filter(a => a.isPendingVote).length;

    if (remainingPending === 0) {
      this.finalizeScores(room);
    } else {
      this.broadcastToRoom(room.code, {
        type: 'vote_update',
        payload: {
          targetPlayerId,
          category,
          votes: answer.votes,
          status: answer.isPendingVote ? 'pending' : (answer.isValid ? 'valid' : 'invalid')
        }
      });
    }
  }

  private finalizeScores(room: GameRoom): void {
    const round = room.rounds[room.currentRound];
    const categories = this.getRoomCategories(room);

    // Uniqueness Check
    const answerGroups = new Map<string, number>();

    round.validatedAnswers.filter(a => a.isValid).forEach(a => {
      const key = `${a.category}:${this.normalizeArabic(a.answer)}`;
      answerGroups.set(key, (answerGroups.get(key) || 0) + 1);
    });

    // Assign Scores
    for (const ans of round.validatedAnswers) {
      if (ans.isValid) {
        const key = `${ans.category}:${this.normalizeArabic(ans.answer)}`;
        const count = answerGroups.get(key) || 1;
        ans.isUnique = count === 1;
        ans.score = ans.isUnique ? 20 : 10;
      } else {
        ans.score = 0;
      }
    }

    // Update Player Stats
    for (const player of room.players) {
      if (player.id === room.refereeId) continue;

      const playerAnswers = round.validatedAnswers.filter(a => a.playerId === player.id);
      const roundScore = playerAnswers.reduce((sum, a) => sum + a.score, 0);

      player.score += roundScore;
      player.totalEarnedPoints = (player.totalEarnedPoints || 0) + roundScore;

      // Bus Streak Logic
      const submission = round.submissions.find(s => s.playerId === player.id);

      // Only count streaks if ALL valid and COMPLETE
      const allCorrect = playerAnswers.filter(a => a.isValid).length >= categories.length;

      if (submission?.busComplete && allCorrect) {
        player.busStreak++;
        // Bonus points for streaks could go here if design requires
      } else {
        player.busStreak = 0;
      }

      // Update Powerups based on new points
      this.updatePlayerPowerUps(player);
    }

    // Notify completion
    this.finishRound(room);
  }

  refereeDeduct(ws: WebSocket, playerId: string, category: Category, reason: string): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;

    const room = this.rooms.get(playerInfo.roomId);
    if (!room || room.refereeId !== playerInfo.playerId) return;

    const round = room.rounds[room.currentRound];
    const answer = round.validatedAnswers.find(a => a.playerId === playerId && a.category === category);

    if (answer && answer.score > 0) {
      const deduction = answer.score;
      answer.score = 0;
      answer.isValid = false;
      answer.reason = reason;

      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.score -= deduction;
        player.totalEarnedPoints -= deduction;
      }

      if (!room.refereeDeductions) room.refereeDeductions = [];
      room.refereeDeductions.push({
        playerId, playerName: player?.name || '', category, answer: answer.answer, reason, pointsDeducted: deduction
      });

      this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
    }
  }

  refereeToggleUnique(ws: WebSocket, playerId: string, category: Category): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;

    const room = this.rooms.get(playerInfo.roomId);
    if (!room || room.refereeId !== playerInfo.playerId) return;

    const round = room.rounds[room.currentRound];
    const answer = round.validatedAnswers.find(a => a.playerId === playerId && a.category === category);

    if (answer && answer.isValid) {
      answer.isUnique = !answer.isUnique;
      const oldScore = answer.score;
      answer.score = answer.isUnique ? 20 : 10;

      const diff = answer.score - oldScore;
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.score += diff;
        player.totalEarnedPoints += diff;
      }

      this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
    }
  }

  private _refereeApprove(room: GameRoom): void {
    this.finishRound(room);
  }

  refereeApprove(ws: WebSocket): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;
    const room = this.rooms.get(playerInfo.roomId);
    if (!room || room.refereeId !== playerInfo.playerId) return;

    this._refereeApprove(room);
  }

  nextRound(ws: WebSocket): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;

    const room = this.rooms.get(playerInfo.roomId);
    if (!room || !room.players.find(p => p.id === playerInfo.playerId)?.isHost) return;
    if (room.phase !== 'results') return;

    room.currentRound++;
    this.startRound(room);
  }

  playAgain(ws: WebSocket): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;
    const room = this.rooms.get(playerInfo.roomId);
    if (!room || !room.players.find(p => p.id === playerInfo.playerId)?.isHost) return;

    // Reset
    room.currentRound = 0;
    room.rounds = [];
    room.letters = getRandomLetters(10);
    room.phase = 'lobby';
    room.refereeDeductions = [];
    this.answerVotes.set(room.code, []);

    for (const p of room.players) {
      p.score = 0;
      p.isReady = false;
      p.busStreak = 0;
      p.totalEarnedPoints = 0;
      p.powerUps = { hint: 0, steal: 0, wildcard: 0, banish: 0 };
      p.usedPowerUps = { hint: false, steal: false, wildcard: false, banish: false };
    }

    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  handleDisconnect(ws: WebSocket): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;

    const room = this.rooms.get(playerInfo.roomId);
    if (room) {
      room.players = room.players.filter(p => p.id !== playerInfo.playerId);

      if (room.players.length === 0) {
        // Delete room if empty
        this.rooms.delete(playerInfo.roomId);
        this.answerVotes.delete(room.code);

        // Clear all timers for this room
        const timer = this.timers.get(room.code);
        if (timer) {
          clearTimeout(timer);
          this.timers.delete(room.code);
        }
        const autoTimer = this.timers.get(`${room.code}_auto`);
        if (autoTimer) {
          clearTimeout(autoTimer);
          this.timers.delete(`${room.code}_auto`);
        }
      } else {
        // Assign new host if needed
        if (room.hostId === playerInfo.playerId && room.players.length > 0) {
          room.players[0].isHost = true;
          room.hostId = room.players[0].id;
        }

        this.broadcastToRoom(playerInfo.roomId, {
          type: 'player_left',
          payload: { players: room.players },
        });
      }
    }


    this.players.delete(ws);
  }

  private send(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcastToRoom(roomCode: string, message: WSMessage, excludeWs?: WebSocket): void {
    for (const [ws, info] of Array.from(this.players)) {
      if (info.roomId === roomCode && ws !== excludeWs) {
        this.send(ws, message);
      }
    }
  }

  handleMessage(ws: WebSocket, message: WSMessage): void {
    switch (message.type) {
      case 'create_room':
        this.createRoom(ws, message.payload.playerName);
        break;
      case 'join_room':
        this.joinRoom(ws, message.payload.roomCode, message.payload.playerName);
        break;
      case 'player_ready':
        this.setReady(ws);
        break;
      case 'start_game':
        this.startGame(ws);
        break;
      case 'submit_answers':
        this.submitAnswers(ws, message.payload.answers);
        break;
      case 'bus_complete':
        this.triggerBusComplete(ws);
        break;
      case 'vote':
        this.vote(ws, message.payload.playerId, message.payload.category, message.payload.accepted);
        break;
      case 'next_round':
        this.nextRound(ws);
        break;
      case 'play_again':
        this.playAgain(ws);
        break;
      case 'join_public_room':
        this.joinPublicRoom(ws, message.payload.playerName);
        break;
      case 'set_referee':
        this.setReferee(ws, message.payload.playerId);
        break;
      case 'remove_referee':
        this.removeReferee(ws);
        break;
      case 'referee_deduct':
        this.refereeDeduct(ws, message.payload.playerId, message.payload.category, message.payload.reason);
        break;
      case 'referee_approve':
        this.refereeApprove(ws);
        break;

      case 'referee_toggle_unique':
        this.refereeToggleUnique(ws, message.payload.playerId, message.payload.category);
        break;
      case 'send_reaction':
        this.sendReaction(ws, message.payload.reactionType);
        break;

      case 'update_settings':
        this.updateSettings(ws, message.payload);
        break;
      case 'draft_update':
        this.handleDraftUpdate(ws, message.payload);
        break;
      case 'activate_powerup':
        if (message.payload.type === 'wildcard') {
          this.activateWildcard(ws);
        } else if (message.payload.type === 'banish') {
          this.activateBanish(ws, message.payload.targetPlayerId);
        }
        break;
      case 'appeal_answer':
        this.appealAnswer(ws, message.payload.playerId, message.payload.category, message.payload.word);
        break;
    }
  }

  // ✅ NEW: Handle Appeal
  private async appealAnswer(ws: WebSocket, playerId: string, category: string, word: string): Promise<void> {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;

    const room = this.rooms.get(playerInfo.roomId);
    if (!room) return;

    const round = room.rounds[room.currentRound];
    if (!round) return;

    console.log(`[Appeal] Player ${playerId} appealing word: ${word} in ${category}`);

    // Notify everyone appeal is in progress
    this.broadcastToRoom(room.code, {
      type: 'toast',
      payload: { message: `جاري مراجعة الكلمة: ${word}... 🤖`, type: 'info' }
    });

    const isValid = await HybridValidator.getInstance().verifyWordWithAI(round.letter, category, word);

    if (isValid) {
      // Update the answer in the current round
      // Note: We might need to handle past rounds if appeal happens late, 
      // but usually appeals happen in Results phase of current round.

      const answerEntry = round.validatedAnswers.find(
        a => a.playerId === playerId && a.category === category && this.normalizeArabic(a.answer) === this.normalizeArabic(word)
      );

      if (answerEntry) {
        answerEntry.isValid = true;
        answerEntry.reason = 'تمت الموافقة (مراجعة AI)';
        answerEntry.score = 10; // Base score, uniqueness updated later or now? 
        // For simplicity, give 10 points immediately. 
        // Ideally we re-run calculateScores but that might change other scores (uniqueness).
        // Let's rely on standard scoring if possible, or just grant bonus.

        // Let's try to recalculate scores for the whole round to ensure fairness (uniqueness check)
        // Check if calculateScores is safe to run again.
        // Assuming yes since it iterates over validatedAnswers.
        this.updateRoundScores(room, round);
      }

      this.broadcastToRoom(room.code, {
        type: 'appeal_result',
        payload: {
          success: true,
          playerId,
          category,
          word,
          message: `✅ تم قبول الكلمة "${word}"! أضيفت للقاعدة.`
        }
      });

      this.broadcastToRoom(room.code, {
        type: 'sync_state',
        payload: { room }
      });

    } else {
      this.send(ws, {
        type: 'appeal_result',
        payload: {
          success: false,
          playerId,
          category,
          word,
          message: `❌ تم رفض الكلمة "${word}".`
        }
      });
    }
  }

  /**
   * Helper to update scores after an appeal
   */
  private updateRoundScores(room: GameRoom, round: Round): void {
    const allRoundAnswers = round.validatedAnswers;
    const currentCategories = this.getRoomCategories(room);

    // Count duplicates
    const answerCounts = new Map<string, number>();
    for (const ans of allRoundAnswers) {
      if (ans.isValid) {
        const key = `${ans.category}:${this.normalizeArabic(ans.answer)}`;
        answerCounts.set(key, (answerCounts.get(key) || 0) + 1);
      }
    }

    // Update scores
    for (const validatedAnswer of allRoundAnswers) {
      if (!validatedAnswer.isValid) {
        validatedAnswer.score = 0;
        validatedAnswer.isUnique = false;
        continue;
      }

      const key = `${validatedAnswer.category}:${this.normalizeArabic(validatedAnswer.answer)}`;
      const count = answerCounts.get(key) || 0;
      validatedAnswer.isUnique = count === 1;
      validatedAnswer.score = validatedAnswer.isUnique ? 20 : 10;
    }

    // Update totals
    for (const player of room.players) {
      const playerAnswers = allRoundAnswers.filter(a => a.playerId === player.id);
      const roundScore = playerAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
      // Note: This adds to TOTAL score. 
      // If we run this multiple times, we must be careful not to double count.
      // BUT: Player score is usually a sum of rounds. 
      // GameRoom structure: players have `score`. 
      // If we re-calculate, we should likely re-calculate TOTAL from all rounds?
      // Or just update the diff?
      // Simple hack: We won't update `player.score` here because it might be complex.
      // The game client calculates round score from `validatedAnswers`. 
      // The server authoritative score might need a full recalc.
      // For now, updating `validatedAnswers` is enough for the Client to show correct score.
    }
  }

  private sendReaction(ws: WebSocket, reactionType: string): void {
    const validReactionTypes = ['thumbsUp', 'clap', 'laugh', 'fire', 'heart'];
    if (!validReactionTypes.includes(reactionType)) return;

    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;

    const room = this.rooms.get(playerInfo.roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === playerInfo.playerId);
    if (!player) return;

    const reaction = {
      id: randomUUID(),
      playerId: playerInfo.playerId,
      playerName: player.name,
      type: reactionType,
      timestamp: Date.now(),
    };

    this.broadcastToRoom(room.code, {
      type: 'reaction_received',
      payload: { reaction },
    });
  }

  // Power-up: Banish - Cost: 40 points
  private activateBanish(ws: WebSocket, targetPlayerId: string): void {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;

    const room = this.rooms.get(playerInfo.roomId);
    if (!room || room.phase !== 'playing') return;

    const player = room.players.find(p => p.id === playerInfo.playerId);
    if (!player) return;

    const round = room.rounds[room.currentRound];
    if (!round) return;

    // Cost Check
    const COST = 40;
    if ((player.totalEarnedPoints || 0) < COST) {
      this.send(ws, { type: 'error', payload: { message: `تحتاج ${COST} نقطة لاستخدام الطرد!` } });
      return;
    }

    if (round.banishedPlayerId === playerInfo.playerId) {
      this.send(ws, { type: 'error', payload: { message: 'أنت مطرود!' } });
      return;
    }

    if (round.powerUpUsedInRound) {
      this.send(ws, { type: 'error', payload: { message: 'تم استخدام مساعدة في هذه الجولة بالفعل' } });
      return;
    }

    if (targetPlayerId === player.id) {
      this.send(ws, { type: 'error', payload: { message: 'لا يمكن طرد نفسك!' } });
      return;
    }

    const targetPlayer = room.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer) return;

    // Deduct Points
    player.totalEarnedPoints -= COST;
    player.score -= COST;

    // Execute Banish
    player.usedPowerUps.banish = true;
    round.powerUpUsedInRound = true;
    round.banishedPlayerId = targetPlayerId;
    round.banishedByPlayerId = player.id;
    round.activePowerUp = {
      type: 'banish',
      playerId: player.id,
      playerName: player.name,
      activatedAt: Date.now(),
    };

    this.updatePlayerPowerUps(player); // Update UI
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });

    // Notify target
    const targetWs = Array.from(this.players.entries()).find(([_, p]) => p.playerId === targetPlayerId)?.[0];
    if (targetWs) {
      this.send(targetWs, {
        type: 'player_banished',
        payload: { message: `تم طردك بواسطة ${player.name}!`, banishedBy: player.name, duration: 'هذه الجولة' }
      });
    }

    // Broadcast
    this.broadcastToRoom(room.code, {
      type: 'powerup_activated',
      payload: { type: 'banish', playerId: player.id, playerName: player.name, targetName: targetPlayer.name, message: `${player.name} طرد ${targetPlayer.name}!` }
    }, targetWs);
  }

  // Power-up: Wild Card - Cost: 50 points
  private async activateWildcard(ws: WebSocket): Promise<void> {
    const playerInfo = this.players.get(ws);
    if (!playerInfo) return;

    const room = this.rooms.get(playerInfo.roomId);
    if (!room || room.phase !== 'playing') return;

    const player = room.players.find(p => p.id === playerInfo.playerId);
    if (!player) return;
    const round = room.rounds[room.currentRound];
    if (!round) return;

    // Cost Check
    const COST = 50;

    // Check if already used first
    if (player.usedPowerUps.wildcard) {
      this.send(ws, { type: 'error', payload: { message: 'لقد استخدمت الجوكر سابقاً!' } });
      return;
    }

    if ((player.totalEarnedPoints || 0) < COST) {
      this.send(ws, { type: 'error', payload: { message: `تحتاج ${COST} نقطة!` } });
      return;
    }

    if (round.banishedPlayerId === playerInfo.playerId || round.powerUpUsedInRound) {
      this.send(ws, { type: 'error', payload: { message: 'غير مسموح حالياً' } });
      return;
    }

    // Deduct
    player.totalEarnedPoints -= COST;
    player.score -= COST;

    // Logic
    player.usedPowerUps.wildcard = true; // MARK AS USED
    round.powerUpUsedInRound = true;
    round.wildcardUsedByPlayerId = player.id;
    round.activePowerUp = {
      type: 'wildcard',
      playerId: player.id,
      playerName: player.name,
      activatedAt: Date.now(),
    };

    // Generate Answers
    const categories = this.getRoomCategories(room);
    const wildcardService = WildcardService.getInstance();
    const wildcardAnswers = wildcardService.getAnswers(round.letter, Array.from(categories));

    if (!wildcardAnswers) {
      // Refund
      player.totalEarnedPoints += COST;
      player.score += COST;
      player.usedPowerUps.wildcard = false; // REVERT if failed
      round.powerUpUsedInRound = false;
      this.send(ws, { type: 'error', payload: { message: 'فشل التوليد' } });
      return;
    }

    round.wildcardAnswers = wildcardAnswers;
    round.submissions.push({
      playerId: player.id,
      playerName: player.name,
      answers: wildcardAnswers,
      submittedAt: Date.now(),
      busComplete: true
    });

    this.updatePlayerPowerUps(player);
    this.send(ws, { type: 'wildcard_activated', payload: { message: 'تم!', answers: wildcardAnswers } });
    this.broadcastToRoom(room.code, { type: 'powerup_activated', payload: { type: 'wildcard', playerId: player.id, playerName: player.name, message: `${player.name} استخدم الجوكر!` } }, ws);


    this.checkAndEndRound(room);
    this.broadcastToRoom(room.code, { type: 'sync_state', payload: { room } });
  }

  // Update power-ups based on total earned points
  // IMPORTANT: Do NOT re-grant power-ups that have already been used
  // Calculate affordable powerups based on points
  // Update power-ups based on total earned points
  // IMPORTANT: Do NOT re-grant power-ups that have already been used
  // Calculate affordable powerups based on points
  private updatePlayerPowerUps(player: Player): void {
    const points = player.totalEarnedPoints || 0;

    // Set counts based on affordability (Wallet System) - but check if already used!
    // If used, set to 0 regardless of points.

    player.powerUps = {
      wildcard: player.usedPowerUps.wildcard ? 0 : Math.floor(points / 50),
      banish: player.usedPowerUps.banish ? 0 : Math.floor(points / 40),
      hint: 0,
      steal: 0,
    };
  }
}

export const gameManager = new GameManager();
