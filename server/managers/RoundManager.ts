
import { CorruptionProofBuffer, stringToSeed } from '../utils/reliability';
import { GameRoom, Round, PlayerSubmission, RoundAnswers, Category, ValidatedAnswer } from '../../shared/schema';
import { randomUUID } from 'crypto';
import { HybridValidator } from '../hybridValidator';
import { categories } from '../../shared/schema';

// Helper to normalize arabic for comparison/validation
function normalizeArabic(text: string): string {
    return text
        .trim()
        .replace(/[\u064B-\u065F]/g, '')
        .replace(/أ|إ|آ/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .toLowerCase();
}

function validateAnswerLenient(letter: string, category: Category, answer: string): boolean {
    const trimmedAnswer = answer.trim();

    // Minimum 3 characters — blocks gibberish like "سي", "يس", etc.
    if (!trimmedAnswer || trimmedAnswer.length < 3) return false;

    const normalizedLetter = normalizeArabic(letter);
    const normalizedAnswer = normalizeArabic(trimmedAnswer);

    const answerFirstChar = normalizedAnswer.startsWith('ال')
        ? normalizedAnswer.charAt(2)
        : normalizedAnswer.charAt(0);

    const letterFirstChar = normalizedLetter.charAt(0);
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
    return validFirstChars.includes(answerFirstChar);
}


export class RoundManager {
    private timers: Map<string, NodeJS.Timeout> = new Map();
    private calculatingRooms = new Map<string, number>();

    startRound(buffer: CorruptionProofBuffer<GameRoom>): Round {
        let round: Round;

        buffer.transact((draft) => {
            round = {
                number: draft.currentRound + 1,
                letter: draft.letters[draft.currentRound],
                startTime: Date.now(),
                endTime: Date.now() + 45000,
                isRush: false,
                submissions: [],
                validatedAnswers: [],
                votingComplete: false,
                powerUpUsedInRound: false,
            };

            draft.rounds[draft.currentRound] = round;
            draft.phase = 'playing';
        }, "startRound");

        const room = buffer.get();
        return room.rounds[room.currentRound];
    }

    setRoundTimer(roomCode: string, callback: () => void, durationMs: number = 45000) {
        this.clearTimer(roomCode);
        const timer = setTimeout(callback, durationMs);
        this.timers.set(roomCode, timer);
    }

    clearTimer(roomCode: string) {
        if (this.timers.has(roomCode)) {
            clearTimeout(this.timers.get(roomCode)!);
            this.timers.delete(roomCode);
        }
    }

    handleSubmission(
        buffer: CorruptionProofBuffer<GameRoom>,
        playerId: string,
        answers: RoundAnswers
    ): { isComplete: boolean, round: Round } {

        let isComplete = false;

        buffer.transact((draft) => {
            const round = draft.rounds[draft.currentRound];
            if (!round) return;

            if (round.banishedPlayerId === playerId) return;

            const player = draft.players.find(p => p.id === playerId);
            if (!player) return;

            const existingIdx = round.submissions.findIndex(s => s.playerId === playerId);
            if (existingIdx !== -1) {
                round.submissions[existingIdx].answers = answers;
            } else {
                round.submissions.push({
                    playerId,
                    playerName: player.name,
                    answers,
                    submittedAt: Date.now(),
                    busComplete: false
                });
            }

            const activePlayers = draft.refereeId
                ? draft.players.filter(p => p.id !== draft.refereeId && p.id !== round.banishedPlayerId).length
                : draft.players.filter(p => p.id !== round.banishedPlayerId).length;

            if (round.submissions.length === activePlayers) {
                isComplete = true;
            }
        }, "handleSubmission");

        const room = buffer.get();
        return { isComplete, round: room.rounds[room.currentRound] };
    }

    async processRoundWithAI(
        buffer: CorruptionProofBuffer<GameRoom>,
        onVotingStart: () => void,
        onRoundFinish: () => void
    ): Promise<void> {
        const roomCode = buffer.get().code;

        // Prevent Re-entry / Race
        const now = Date.now();
        const existing = this.calculatingRooms.get(roomCode);
        if (existing && (now - existing) < 30000) return;
        this.calculatingRooms.set(roomCode, now);

        try {
            await this.calculateScores(buffer, onVotingStart, onRoundFinish);
        } catch (e) {
            console.error("Error calculating scores:", e);
        } finally {
            this.calculatingRooms.delete(roomCode);
        }
    }

    private async calculateScores(
        buffer: CorruptionProofBuffer<GameRoom>,
        onVotingStart: () => void,
        onRoundFinish: () => void
    ): Promise<void> {
        const roomRead = buffer.get();
        const round = roomRead.rounds[roomRead.currentRound];
        if (!round) return;

        const currentCategories = roomRead.settings?.customCategories?.length
            ? roomRead.settings.customCategories
            : categories;

        const allAnswers: { playerId: string, category: string, answer: string }[] = [];

        for (const category of currentCategories) {
            for (const submission of round.submissions) {
                if (submission.playerId === round.banishedPlayerId) continue;

                const answer = submission.answers[category];
                if (answer && answer.trim()) {
                    allAnswers.push({ playerId: submission.playerId, category, answer });
                }
            }
        }

        const itemsToValidate = allAnswers.map(item => ({
            playerId: item.playerId,
            category: item.category as Category,
            letter: round.letter,
            answer: item.answer
        }));

        const seed = stringToSeed(roomRead.code + round.number);
        let validationResults: Map<string, any>;
        try {
            validationResults = await HybridValidator.getInstance().validateBatch(itemsToValidate, seed);
        } catch (e) {
            validationResults = new Map();
        }

        // Apply Results to State
        let hasPendingVotes = false;

        buffer.transact((draft) => {
            const dRound = draft.rounds[draft.currentRound];
            dRound.validatedAnswers = [];

            for (const item of allAnswers) {
                const key = `${item.playerId}:${item.category}`;
                const result = validationResults.get(key);
                let isValid = result?.isValid || false;
                let reason = result?.reason || '';
                let isPendingVote = false;

                if (dRound.wildcardUsedByPlayerId === item.playerId) {
                    isValid = true;
                    reason = 'جوكر';
                }

                if (!isValid && !isPendingVote && item.answer.trim().length >= 2) {
                    const lenient = validateAnswerLenient(dRound.letter, item.category as Category, item.answer);
                    if (lenient) {
                        if (draft.settings?.enableVoting) {
                            isPendingVote = true;
                            reason = 'تتطلب تصويت';
                            hasPendingVotes = true;
                        } else {
                            isValid = false;
                            reason = 'غير موجودة في القاموس';
                        }
                    } else {
                        isValid = false;
                        reason = 'حرف خطأ';
                    }
                }

                dRound.validatedAnswers.push({
                    playerId: item.playerId,
                    playerName: draft.players.find(p => p.id === item.playerId)?.name || '',
                    category: item.category as Category,
                    answer: item.answer,
                    isValid: isValid && !isPendingVote,
                    isPendingVote,
                    isUnique: false,
                    score: 0,
                    votes: { accepted: 0, rejected: 0 },
                    reason,
                    isFabricated: false
                });
            }

            if (hasPendingVotes) {
                if (!draft.settings) draft.settings = {};
                draft.settings.enableVoting = true;
                draft.phase = 'voting';

                // Populate Vote Queue
                draft.voteQueue = dRound.validatedAnswers
                    .filter(a => a.isPendingVote)
                    .map(a => ({
                        requestId: randomUUID(),
                        requesterId: a.playerId,
                        requesterName: a.playerName,
                        category: a.category,
                        word: a.answer
                    }));

                // Start first vote
                if (draft.voteQueue.length > 0) {
                    const next = draft.voteQueue.shift()!;
                    draft.currentVote = {
                        ...next,
                        votes: { yes: 0, no: 0 },
                        voterIds: [],
                        votesDetails: {},
                        startTime: Date.now()
                    };
                }
            } else {
                this.calculateAnswerScores(draft);
            }

        }, "calculateScores");

        if (hasPendingVotes) {
            onVotingStart();
        } else {
            onRoundFinish();
        }
    }

    calculateAnswerScores(draft: GameRoom) {
        const round = draft.rounds[draft.currentRound];

        const answerCounts = new Map<string, number>();

        for (const a of round.validatedAnswers) {
            if (!a.isValid) continue;
            const key = `${a.category}:${normalizeArabic(a.answer)}`;
            answerCounts.set(key, (answerCounts.get(key) || 0) + 1);
        }

        for (const ans of round.validatedAnswers) {
            if (ans.isValid) {
                const key = `${ans.category}:${normalizeArabic(ans.answer)}`;
                ans.isUnique = answerCounts.get(key) === 1;
                ans.score = ans.isUnique ? 20 : 10;
            } else {
                ans.score = 0;
            }
        }
    }

    commitRoundResults(draft: GameRoom) {
        const round = draft.rounds[draft.currentRound];
        if (round.resultsCommitted) return;

        const currentCategories = draft.settings?.customCategories?.length
            ? draft.settings.customCategories
            : categories;

        // Ensure scores are fresh before committing
        this.calculateAnswerScores(draft);

        for (const player of draft.players) {
            if (player.id === draft.refereeId) continue;

            const playerAnswers = round.validatedAnswers.filter(a => a.playerId === player.id);
            const roundScore = playerAnswers.reduce((sum, a) => sum + (a.score || 0), 0);

            player.score += roundScore;
            player.totalEarnedPoints = (player.totalEarnedPoints || 0) + roundScore;

            const submission = round.submissions.find(s => s.playerId === player.id);
            const allCorrect = playerAnswers.filter(a => a.isValid).length >= currentCategories.length;

            if (submission?.busComplete && allCorrect) {
                player.busStreak++;
            } else {
                player.busStreak = 0;
            }

            // Wallet Update
            player.powerUps = {
                wildcard: player.usedPowerUps.wildcard ? 0 : Math.floor((player.totalEarnedPoints || 0) / 200),
                banish: player.usedPowerUps.banish ? 0 : Math.floor((player.totalEarnedPoints || 0) / 400),
                hint: 0, // Not implemented fully yet
                steal: 0 // Not implemented fully yet
            };
        }

        round.resultsCommitted = true;
    }
}
