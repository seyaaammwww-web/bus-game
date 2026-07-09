import * as fs from 'fs';
import * as path from 'path';
import { CorruptionProofBuffer, stringToSeed } from '../utils/reliability';
import { GameRoom, Round, PlayerSubmission, RoundAnswers, Category, ValidatedAnswer } from '../../shared/schema';
import { randomUUID } from 'crypto';
import { HybridValidator } from '../hybridValidator';
import { categories } from '../../shared/schema';
import {
    passesAnswerHeuristics,
    hasGarbagePattern,
    answerStartsWithLetter,
} from '../utils/answerHeuristics';

// ثوابت المؤقتات
const ROUND_DURATION_MS = 45000; // 45 ثانية
const RUSH_MODE_DURATION_MS = 10000; // 10 ثواني

function buildSynonymMap(): Record<string, string[][]> {
    const map: Record<string, string[][]> = { جماد: [] };
    try {
        const synPath = path.join(process.cwd(), 'server/data/synonyms.json');
        if (!fs.existsSync(synPath)) return map;

        const data = JSON.parse(fs.readFileSync(synPath, 'utf-8'));

        for (const [canonical, variants] of Object.entries(data.jamad_synonyms || {})) {
            const group = [canonical, ...(variants as string[])];
            map['جماد'].push(group);
        }

        for (const words of Object.values(data.jamad_categories || {})) {
            if (Array.isArray(words) && words.length > 1) {
                map['جماد'].push(words as string[]);
            }
        }
    } catch (err) {
        console.warn('[RoundManager] Failed to load synonyms for scoring:', err);
    }
    return map;
}

const SYNONYM_MAP: Record<string, string[][]> = buildSynonymMap();

function areSynonyms(word1: string, word2: string, category: string): boolean {
    const norm1 = normalizeArabic(word1);
    const norm2 = normalizeArabic(word2);
    if (norm1 === norm2) return true;

    const synonyms = SYNONYM_MAP[category];
    if (!synonyms) return false;
    return synonyms.some(group => {
        const normalizedGroup = group.map(w => normalizeArabic(w));
        return normalizedGroup.includes(norm1) && normalizedGroup.includes(norm2);
    });
}

function normalizeArabic(text: string): string {
    return text
        .trim()
        .replace(/[\u064B-\u065F]/g, '')
        .replace(/أ|إ|آ/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .toLowerCase();
}


/** Eligible voters for a round (excludes referee, banished, and offline players). */
export function getEligibleVoters(draft: GameRoom, round: Round): typeof draft.players {
    return draft.players.filter(
        p => !p.isOffline && p.id !== draft.refereeId && p.id !== round.banishedPlayerId
    );
}

export function countEligibleVoters(draft: GameRoom, round: Round): number {
    return getEligibleVoters(draft, round).length;
}

/** Resolve pending-vote answers when voting cannot run (solo play or voting off). */
function resolvePendingVotes(draft: GameRoom, dRound: Round): void {
    dRound.validatedAnswers.forEach(a => {
        if (!a.isPendingVote) return;
        a.isPendingVote = false;
        // Never auto-accept words missing from the dictionary — solo or not
        a.isValid = false;
        a.reason = draft.settings?.votingEnabled
            ? 'غير موجودة في القاموس (تحتاج تصويت جماعي)'
            : 'غير موجودة في القاموس';
    });
}


export class RoundManager {
    private timers: Map<string, NodeJS.Timeout> = new Map();
    private calculatingRooms = new Set<string>();
    private validationGen = new Map<string, number>();

    // FIX: Combined startRound — increment currentRound AND initialize round in one transact
    startRound(buffer: CorruptionProofBuffer<GameRoom>): Round {
        buffer.transact((draft) => {
            // RM3: Guard against out-of-bounds letters access
            if (draft.currentRound >= draft.letters.length) {
                throw new Error(`Invalid round index ${draft.currentRound} — only ${draft.letters.length} letters available`);
            }

            const round: Round = {
                number: draft.currentRound + 1,
                letter: draft.letters[draft.currentRound],
                startTime: Date.now(),
                endTime: Date.now() + ROUND_DURATION_MS,
                isRush: false,
                isComplete: false,
                submissions: [],
                validatedAnswers: [],
                votingComplete: false,
                powerUpUsedInRound: false,
                endRoundInProgress: false,
            };

            draft.rounds[draft.currentRound] = round;
            draft.phase = 'playing';
            // Clear any stale vote state from previous round
            draft.voteQueue = [];
            draft.currentVote = null;
        }, "startRound");

        const room = buffer.get();
        return room.rounds[room.currentRound];
    }

    public setRoundTimer(roomCode: string, callback: () => void, durationMs: number = ROUND_DURATION_MS) {
        this.clearTimer(roomCode);
        const timer = setTimeout(() => {
            callback();
            this.timers.delete(roomCode);
        }, durationMs);
        this.timers.set(roomCode, timer);
    }

    public clearTimer(roomCode: string) {
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
            if (draft.phase !== 'playing') return;
            if (round.endRoundInProgress) return;
            if (round.banishedPlayerId === playerId) return;

            const player = draft.players.find(p => p.id === playerId);
            if (!player || player.isOffline) return;

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
                ? draft.players.filter(p => !p.isOffline && p.id !== draft.refereeId && p.id !== round.banishedPlayerId).length
                : draft.players.filter(p => !p.isOffline && p.id !== round.banishedPlayerId).length;

            const submittedActive = round.submissions.filter(s => {
                if (s.playerId === round.banishedPlayerId) return false;
                if (s.playerId === draft.refereeId) return false;
                const pl = draft.players.find(p => p.id === s.playerId);
                return !!pl && !pl.isOffline;
            }).length;

            if (submittedActive >= activePlayers) {
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

        if (this.calculatingRooms.has(roomCode)) {
            console.log(`[RoundManager] Already processing ${roomCode}, skipping`);
            return;
        }
        this.calculatingRooms.add(roomCode);

        const gen = (this.validationGen.get(roomCode) || 0) + 1;
        this.validationGen.set(roomCode, gen);
        let finished = false;
        const finishOnce = (cb: () => void) => {
            if (finished || this.validationGen.get(roomCode) !== gen) return;
            finished = true;
            cb();
        };

        try {
            await Promise.race([
                this.calculateScores(buffer, gen, () => finishOnce(onVotingStart), () => finishOnce(onRoundFinish)),
                new Promise<void>((_, reject) =>
                    setTimeout(() => reject(new Error('validation_timeout')), 6000)
                )
            ]);
        } catch (e: any) {
            console.warn(`[RoundManager] Validation failed for ${roomCode}: ${e?.message || e}. Pushing all to vote.`);
            if (!finished && this.validationGen.get(roomCode) === gen) {
                this.pushAllAnswersToVote(buffer, gen, () => finishOnce(onVotingStart), () => finishOnce(onRoundFinish));
            }
        } finally {
            this.calculatingRooms.delete(roomCode);
        }
    }

    private pushAllAnswersToVote(
        buffer: CorruptionProofBuffer<GameRoom>,
        gen: number,
        onVotingStart: () => void,
        onRoundFinish: () => void
    ) {
        const roomRead = buffer.get();
        const roomCode = roomRead.code;
        if (this.validationGen.get(roomCode) !== gen) return;

        const round = roomRead.rounds[roomRead.currentRound];
        if (!round) { onRoundFinish(); return; }

        const currentCategories = roomRead.settings?.customCategories?.length
            ? roomRead.settings.customCategories
            : categories;

        let hasPending = false;

        buffer.transact((draft) => {
            const dRound = draft.rounds[draft.currentRound];
            dRound.validatedAnswers = [];

            for (const submission of dRound.submissions) {
                if (submission.playerId === dRound.banishedPlayerId) continue;
                for (const category of currentCategories) {
                    const answer = submission.answers[category];
                    if (!answer?.trim() || answer.trim().length < 2) continue;

                    const lenient = passesAnswerHeuristics(dRound.letter, category as Category, answer);
                    dRound.validatedAnswers.push({
                        playerId: submission.playerId,
                        playerName: submission.playerName,
                        category: category as Category,
                        answer,
                        isValid: false,
                        isPendingVote: lenient,
                        isUnique: false,
                        score: 0,
                        votes: { accepted: 0, rejected: 0 },
                        reason: lenient ? 'تتطلب تصويت (فشل AI)' : 'حرف خطأ',
                        isFabricated: false
                    });
                    if (lenient) hasPending = true;
                }
            }

            const activeVoters = countEligibleVoters(draft, dRound);

            if (hasPending && draft.settings?.votingEnabled && activeVoters > 1) {
                draft.phase = 'voting';
                this.buildVoteQueueInDraft(draft);
            } else {
                if (hasPending) resolvePendingVotes(draft, dRound);
                this.calculateAnswerScores(draft);
            }
        }, "fallbackVote");

        if (this.validationGen.get(roomCode) !== gen) return;

        const roomState = buffer.get();
        const dRound = roomState.rounds[roomState.currentRound];
        const finalActiveVoters = dRound ? countEligibleVoters(roomState, dRound) : 0;
        if (hasPending && roomState.settings?.votingEnabled && finalActiveVoters > 1) {
            onVotingStart();
        } else {
            onRoundFinish();
        }
    }

    private async calculateScores(
        buffer: CorruptionProofBuffer<GameRoom>,
        gen: number,
        onVotingStart: () => void,
        onRoundFinish: () => void
    ): Promise<void> {
        const roomRead = buffer.get();
        const roomCode = roomRead.code;
        if (this.validationGen.get(roomCode) !== gen) return;

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
                if (answer?.trim()) {
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
            // RM4: Validation failure must NOT penalise players — fall back to lenient per-answer check
            console.error(`[RoundManager] validateBatch failed for room ${roomRead.code}, falling back to lenient validation.`, e);
            validationResults = new Map();
            for (const item of itemsToValidate) {
                validationResults.set(`${item.playerId}:${item.category}`, {
                    isValid: false,
                    reason: 'فشل التحقق — غير موجودة في القاموس',
                    source: 'heuristic'
                });
            }
        }

        // Apply Results to State
        let hasPendingVotes = false;

        if (this.validationGen.get(roomCode) !== gen) return;

        buffer.transact((draft) => {
            if (this.validationGen.get(roomCode) !== gen) return;
            // endRound sets phase to ai_processing before validation runs — that is expected
            if (draft.phase !== 'playing' && draft.phase !== 'ai_processing') {
                console.log(`[RoundManager] calculateScores aborted for ${roomRead.code} - Phase shifted to ${draft.phase}`);
                return;
            }

            const dRound = draft.rounds[draft.currentRound];
            dRound.validatedAnswers = [];

            for (const item of allAnswers) {
                const key = `${item.playerId}:${item.category}`;
                const result = validationResults.get(key);
                let isValid = result?.isValid || false;
                let reason = result?.reason || '';
                let isPendingVote = false;

                // Wildcard only accepts dictionary-valid answers (no free pass for typed garbage)
                const isWildcard = dRound.wildcardUsedByPlayerIds?.includes(item.playerId);
                if (isWildcard) {
                    if (isValid) {
                        reason = 'جوكر';
                    } else {
                        isValid = false;
                        reason = 'جوكر - إجابة غير موجودة في القاموس';
                    }
                }

                if (!isValid && !isPendingVote && item.answer.trim().length >= 2) {
                    const plausible = passesAnswerHeuristics(dRound.letter, item.category as Category, item.answer);
                    if (plausible) {
                        if (draft.settings?.votingEnabled) {
                            isPendingVote = true;
                            reason = 'تتطلب تصويت';
                            hasPendingVotes = true;
                        } else {
                            isValid = false;
                            reason = 'غير موجودة في القاموس';
                        }
                    } else {
                        isValid = false;
                        reason = hasGarbagePattern(item.answer)
                            ? 'إجابة غير صالحة'
                            : 'حرف خطأ أو قصيرة جداً';
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
                    isFabricated: false,
                    aiSuggestion: result?.aiSuggestion
                });
            }

            if (hasPendingVotes) {
                // LOGIC-3 FIX: Don't force-enable voting. If host disabled it, keep it disabled.
                // ALSO: Do not enter voting if the player is playing alone (activeVoters <= 1)
                const activeVoters = countEligibleVoters(draft, dRound);

                if (draft.settings?.votingEnabled && activeVoters > 1) {
                    draft.phase = 'voting';
                    this.buildVoteQueueInDraft(draft);
                } else {
                    resolvePendingVotes(draft, dRound);
                    this.calculateAnswerScores(draft);
                }
            } else {
                this.calculateAnswerScores(draft);
            }

        }, "calculateScores");

        if (this.validationGen.get(roomCode) !== gen) return;

        const roomState = buffer.get();
        const dRoundState = roomState.rounds[roomState.currentRound];
        const finalActiveVoters = dRoundState ? countEligibleVoters(roomState, dRoundState) : 0;

        if (hasPendingVotes && roomState.settings?.votingEnabled && finalActiveVoters > 1) {
            onVotingStart();
        } else {
            onRoundFinish();
        }
    }
    /**
     * FIX: Parallel Voting — instead of sequential one-by-one, we expose ALL pending
     * answers simultaneously. The UI renders a card per answer, all voted on at once.
     * currentVote is set to null (no sequential queue) and voteQueue holds all items.
     * The client renders all voteQueue items and submits votes per-answer.
     */
    private buildVoteQueueInDraft(draft: GameRoom) {
        const dRound = draft.rounds[draft.currentRound];
        if (!dRound) return;

        const eligibleVoterIds = getEligibleVoters(draft, dRound).map(pl => pl.id);

        // RM5: Guard against undefined validatedAnswers (shouldn't happen, but defensive)
        if (!dRound.validatedAnswers || dRound.validatedAnswers.length === 0) {
            draft.voteQueue = [];
            return;
        }

        // Build queue from all pending votes
        draft.voteQueue = dRound.validatedAnswers
            .filter(a => a.isPendingVote)
            .map(a => ({
                requestId: randomUUID(),
                requesterId: a.playerId,
                requesterName: a.playerName,
                category: a.category,
                word: a.answer,
                eligibleVoterIds: eligibleVoterIds.filter(id => id !== a.playerId), // FIX: exclude answer owner
                voterIds: [],
                votes: { yes: 0, no: 0 },
                aiSuggestion: a.aiSuggestion
            }));

        // FIX: No currentVote needed for parallel mode — null signals "use voteQueue directly"
        draft.currentVote = null;
    }

    calculateAnswerScores(draft: GameRoom) {
        const round = draft.rounds[draft.currentRound];
        const answerGroups: Record<string, string[][]> = {};
        for (const a of round.validatedAnswers) {
            if (!a.isValid) continue;
            const cat = a.category;
            const ansNorm = normalizeArabic(a.answer);
            if (!answerGroups[cat]) answerGroups[cat] = [];
            // تحقق من وجود مجموعة مرادفات
            let found = false;
            for (const group of answerGroups[cat]) {
                if (group.some(w => areSynonyms(w, ansNorm, cat) || w === ansNorm)) {
                    group.push(ansNorm);
                    found = true;
                    break;
                }
            }
            if (!found) answerGroups[cat].push([ansNorm]);
        }
        for (const ans of round.validatedAnswers) {
            if (ans.isValid) {
                const cat = ans.category;
                const ansNorm = normalizeArabic(ans.answer);
                const group = answerGroups[cat]?.find(g => g.includes(ansNorm));
                ans.isUnique = !!(group && group.length === 1);
                ans.score = ans.isUnique ? 20 : 10;
            } else {
                ans.score = 0;
            }
        }
    }

    recalculatePlayerTotals(draft: GameRoom) {
        draft.players.forEach(p => {
            p.score = 0;
            p.totalEarnedPoints = 0;
        });

        draft.rounds.forEach(r => {
            r.validatedAnswers.forEach(ans => {
                if (ans.isValid) {
                    const player = draft.players.find(p => p.id === ans.playerId);
                    if (player) {
                        player.score += ans.score || 0;
                        player.totalEarnedPoints += ans.score || 0;
                    }
                }
            });
        });

        draft.players.forEach(p => {
            if (p.manualScoreAdjustment) {
                const adjustment = p.manualScoreAdjustment;
                p.score = Math.max(0, p.score + adjustment);
                p.totalEarnedPoints = Math.max(0, (p.totalEarnedPoints || 0) + adjustment);
            }
        });
    }

    commitRoundResults(draft: GameRoom) {
        const round = draft.rounds[draft.currentRound];
        if (round.resultsCommitted) return;

        const currentCategories = draft.settings?.customCategories?.length
            ? draft.settings.customCategories
            : categories;

        this.calculateAnswerScores(draft);
        this.recalculatePlayerTotals(draft);

        for (const player of draft.players) {
            if (player.id === draft.refereeId) continue;

            const playerAnswers = round.validatedAnswers.filter(a => a.playerId === player.id);
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
