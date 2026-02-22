import { stringToSeed } from '../utils/reliability';
import { GameRoom, Round, PlayerSubmission, RoundAnswers, Category, ValidatedAnswer } from '../../shared/schema';
import { randomUUID } from 'crypto';
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

    // 1. Min 2 chars (so 2-letter words go to vote)
    if (!trimmedAnswer || trimmedAnswer.length < 2) return false;

    // 2. Block obvious keyboard mashing (gibberish)
    if (/^(.)\1{2,}$/.test(trimmedAnswer)) return false;

    // Block common Arabic keyboard mash sequence
    const mashPattern = /شسيشس|شسي|ببب|ةةة|ننن|ممم|ووو/;
    if (trimmedAnswer.length >= 3 && mashPattern.test(trimmedAnswer)) return false;

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

    startRound(draft: GameRoom): Round {
        const round: Round = {
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
        return round;
    }

    setRoundTimer(roomCode: string, callback: () => void, durationMs: number = 45000) {
        this.clearTimer(roomCode);
        const timer = setTimeout(callback, durationMs);
        this.timers.set(roomCode, timer);
    }

    clearTimer(roomCode: string) {
        const timer = this.timers.get(roomCode);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(roomCode);
        }
    }

    handleSubmission(
        draft: GameRoom,
        playerId: string,
        answers: RoundAnswers
    ): { isComplete: boolean, round: Round } {
        let isComplete = false;
        const round = draft.rounds[draft.currentRound];
        if (!round) return { isComplete: false, round: null as any };

        if (round.banishedPlayerId === playerId) return { isComplete: false, round };

        const player = draft.players.find(p => p.id === playerId);
        if (!player) return { isComplete, round };

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

        return { isComplete, round };
    }

    processRound(
        draft: GameRoom,
        onVotingStart: () => void,
        onRoundFinish: () => void
    ): void {
        const hasVoting = this.calculateScores(draft);
        if (hasVoting) {
            onVotingStart();
        } else {
            onRoundFinish();
        }
    }

    private calculateScores(draft: GameRoom): boolean {
        const round = draft.rounds[draft.currentRound];
        if (!round) return false;

        const currentCategories = draft.settings?.customCategories?.length
            ? draft.settings.customCategories
            : categories;

        const allAnswers: { playerId: string, category: string, answer: string }[] = [];

        for (const category of currentCategories) {
            for (const submission of round.submissions) {
                if (submission.playerId === round.banishedPlayerId) continue;

                const answer = submission.answers[category] || '';
                // Fix Wildcard: Force push if wildcard is active for this player, even if empty
                if (answer.trim() || round.wildcardUsedByPlayerId === submission.playerId) {
                    allAnswers.push({ playerId: submission.playerId, category, answer: answer.trim() || 'جوكر' });
                }
            }
        }

        let hasPendingVotes = false;
        round.validatedAnswers = [];

        for (const item of allAnswers) {
            let isValid = false;
            let reason = '';
            let isPendingVote = false;

            if (round.wildcardUsedByPlayerId === item.playerId) {
                isValid = true;
                reason = 'جوكر';
            } else if (item.answer.trim().length >= 2) {
                isValid = validateAnswerLenient(round.letter, item.category as Category, item.answer);
                if (isValid) {
                    reason = 'صحيح (بدون ذكاء اصطناعي)';
                    if (draft.settings?.enableVoting) {
                        isPendingVote = true;
                        reason = 'تتطلب تصويت';
                        hasPendingVotes = true;
                    }
                } else {
                    reason = 'غلط أو حرف غير متطابق';
                }
            } else {
                reason = 'كلمة قصيرة جداً';
            }

            round.validatedAnswers.push({
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

            draft.voteQueue = round.validatedAnswers
                .filter(a => a.isPendingVote)
                .map(a => ({
                    requestId: randomUUID(),
                    requesterId: a.playerId,
                    requesterName: a.playerName,
                    category: a.category,
                    word: a.answer
                }));

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

        return hasPendingVotes;
    }

    calculateAnswerScores(draft: GameRoom) {
        const round = draft.rounds[draft.currentRound];
        if (!round) return;

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
        if (!round || round.resultsCommitted) return;

        const currentCategories = draft.settings?.customCategories?.length
            ? draft.settings.customCategories
            : categories;

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

            player.powerUps = {
                wildcard: player.usedPowerUps.wildcard ? 0 : Math.floor((player.totalEarnedPoints || 0) / 200),
                banish: player.usedPowerUps.banish ? 0 : Math.floor((player.totalEarnedPoints || 0) / 400),
                hint: 0,
                steal: 0
            };
        }

        round.resultsCommitted = true;
    }
}
