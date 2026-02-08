import { createHash } from 'crypto';
import { GameRoom } from '../../shared/schema.ts';

interface CausalEvent {
    tick: number;
    eventType: string;
    payloadHash: string;
    prevStateHash: string;
    newStateHash: string;
}

export class CausalityGuard {
    private static instance: CausalityGuard;
    private causalityLog = new Map<string, CausalEvent[]>();
    private readonly LOG_SIZE_LIMIT = 100;

    private constructor() { }

    public static getInstance(): CausalityGuard {
        if (!CausalityGuard.instance) {
            CausalityGuard.instance = new CausalityGuard();
        }
        return CausalityGuard.instance;
    }

    /**
     * Generates a deterministic hash of the GameRoom state.
     * critical fields only to avoid noise.
     */
    private generateStateHash(room: GameRoom): string {
        try {
            // Create a deterministic object representation
            // We only include fields that affect game logic state
            const stateObj = {
                code: room.code,
                phase: room.phase,
                currentRound: room.currentRound,
                players: room.players.map(p => ({ id: p.id, score: p.score, isReady: p.isReady })).sort((a, b) => a.id.localeCompare(b.id)),
                rounds: room.rounds.map(r => ({
                    letter: r.letter,
                    submissionsCount: r.submissions.length,
                    validatedCount: r.validatedAnswers.length
                })),
                settings: room.settings
            };

            const str = JSON.stringify(stateObj);
            return createHash('sha256').update(str).digest('hex').substring(0, 16); // 16 chars is enough for collision resistance in this context
        } catch (error) {
            console.error('[CausalityGuard] Hash generation failed:', error);
            return 'HASH_ERROR';
        }
    }

    /**
     * Verifies if the current operation is causally consistent.
     * Returns the current state hash if valid.
     */
    public verifyCausality(room: GameRoom, eventType: string): string {
        const roomLog = this.causalityLog.get(room.code) || [];
        const currentHash = this.generateStateHash(room);

        if (roomLog.length > 0) {
            const lastEvent = roomLog[roomLog.length - 1];
            // The state BEFORE this new event should match the state AFTER the last event
            if (lastEvent.newStateHash !== currentHash) {
                console.error(`[QUANTUM CORRUPTION] Room ${room.code}: Causality violation detected!`);
                console.error(`Expected State Hash: ${lastEvent.newStateHash}`);
                console.error(`Actual State Hash:   ${currentHash}`);
                console.warn(`[QUANTUM CORRUPTION] Event ${eventType} attempting to execute on corrupted state.`);
                // In strict mode, we might throw or return false.
                // For now, we log heavily. In a real "Hardening" phase, we might auto-correct or strictly fail.
                return currentHash;
            }
        }
        return currentHash;
    }

    /**
     * Commits a state transition to the log.
     * Must be called AFTER the state change is applied.
     */
    public commit(room: GameRoom, eventType: string, payload: any, prevStateHash: string): void {
        const newStateHash = this.generateStateHash(room);

        let payloadStr = '';
        try {
            payloadStr = JSON.stringify(payload);
        } catch {
            payloadStr = 'circular_payload';
        }

        const payloadHash = createHash('sha256').update(payloadStr).digest('hex').substring(0, 8);

        const event: CausalEvent = {
            tick: Date.now(),
            eventType,
            payloadHash,
            prevStateHash,
            newStateHash
        };

        const log = this.causalityLog.get(room.code) || [];
        log.push(event);

        // Prune log
        if (log.length > this.LOG_SIZE_LIMIT) {
            log.shift();
        }

        this.causalityLog.set(room.code, log);

        // Console log for "Temporal-Spatial Analysis" visibility
        // console.log(`[Causality] ${room.code} :: ${eventType} :: ${prevStateHash} -> ${newStateHash}`);
    }

    public getLog(roomCode: string): CausalEvent[] {
        return this.causalityLog.get(roomCode) || [];
    }
}
