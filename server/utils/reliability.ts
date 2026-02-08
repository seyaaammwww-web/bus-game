import { createHash } from 'crypto';

/**
 * SCOP-v3.5: Anti-Corruption Memory Architecture
 * Ensures state transitions are valid, logged, and recoverable.
 */
export class CorruptionProofBuffer<T> {
    private primary: T;
    private shadow: T; // Immutable shadow copy
    private checksum: string;

    constructor(initial: T) {
        // Deep clone to ensure isolation
        this.primary = structuredClone(initial);
        this.shadow = structuredClone(initial);
        this.checksum = this.calculateChecksum(initial);
        Object.freeze(this.shadow); // Enforce immutability on shadow
    }

    /**
     * Calculate SHA-256 checksum of the state
     */
    private calculateChecksum(data: T): string {
        const json = JSON.stringify(data, Object.keys(data).sort()); // Sort keys for deterministic output
        return createHash('sha256').update(json).digest('hex');
    }

    /**
     * Get a READ-ONLY copy of the current state.
     * Prevents accidental mutation outside of transaction.
     */
    get(): Readonly<T> {
        return structuredClone(this.primary);
    }

    /**
     * Unsafe get: returns direct reference. USE ONLY FOR READS THAT MUST BE FAST.
     * DO NOT MUTATE.
     */
    getUnsafe(): Readonly<T> {
        return this.primary;
    }

    /**
     * Atomic State Transition
     * @param mutator Function that modifies a draft copy of the state
     * @param description specific description of the change for logging
     */
    transact(mutator: (draft: T) => void, description: string): void {
        const draft = structuredClone(this.primary);

        try {
            mutator(draft); // Apply changes to draft

            // Calculate new checksum
            const newChecksum = this.calculateChecksum(draft);

            // Verify integrity of current primary before swapping (Double Check)
            const currentChecksum = this.calculateChecksum(this.primary);
            if (this.checksum !== currentChecksum) {
                console.error(`[MEMORY CORRUPTION DETECTED] Before applying '${description}'. Restoring from shadow.`);
                this.restoreFromShadow();
                throw new Error(`Memory corruption detected before '${description}'`);
            }

            // Commit transaction
            this.primary = draft;
            this.shadow = structuredClone(draft);
            Object.freeze(this.shadow);
            this.checksum = newChecksum;

            // console.log(`[Transaction] ${description} - New Checksum: ${this.checksum.substring(0, 8)}`);

        } catch (error) {
            console.error(`[Transaction Failed] ${description}:`, error);
            throw error; // Re-throw to caller
        }
    }

    private restoreFromShadow() {
        this.primary = structuredClone(this.shadow);
        this.checksum = this.calculateChecksum(this.primary);
    }
}

/**
 * SCOP-v3.5: Deterministic Random Number Generator
 * Linear Congruential Generator (LCG) for replayable randomness.
 */
export class SeededRNG {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    /**
     * Generates a random float between 0 (inclusive) and 1 (exclusive).
     */
    next(): number {
        // LCG parameters (standard values)
        const a = 1664525;
        const c = 1013904223;
        const m = 4294967296; // 2^32

        this.seed = (a * this.seed + c) % m;
        return this.seed / m;
    }

    /**
     * Returns a random integer between min (inclusive) and max (inclusive).
     */
    range(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Returns a random element from an array.
     */
    pick<T>(array: T[]): T {
        const index = Math.floor(this.next() * array.length);
        return array[index];
    }
}

export function stringToSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}
