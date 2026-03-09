import { createHash } from 'crypto';
import { produce, enablePatches, produceWithPatches, Patch } from 'immer';

// Enable features if needed in future (like patches for undo/redo)
enablePatches();
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
        const json = JSON.stringify(data, Object.keys(data as object).sort()); // Sort keys for deterministic output
        return createHash('sha256').update(json).digest('hex');
    }

    /**
     * Get a READ-ONLY copy of the current state.
     * Prevents accidental mutation outside of transaction.
     * FIX (#1): Use immer's produce instead of structuredClone for better performance.
     */
    get(): Readonly<T> {
        return produce(this.primary, () => { }); // Returns a frozen, identity-preserved copy
    }

    /**
     * Unsafe get: returns a **direct mutable reference** to the current primary state.
     *
     * ⚠️  CONTRACT: Callers MUST treat this as strictly read-only.
     *     Any mutation outside a `transact()` call will corrupt the checksum
     *     and cause the next transaction to roll back from shadow.
     *
     * Use only for hot read-only paths where the immutable copy from `get()` would
     * add measurable overhead (e.g. inside tight broadcast loops).
     */
    getUnsafe(): Readonly<T> {
        return this.primary;
    }

    /**
     * Atomic State Transition
     * @param mutator Function that modifies a draft copy of the state
     * @param description specific description of the change for logging
     * FIX (#1): Used immer's produce to avoid deep cloning the entire state before mutation.
     */
    transact(
        mutator: (draft: T) => void,
        description: string,
        onPatches?: (patches: Patch[], inversePatches: Patch[]) => void,
        retries: number = 1
    ): boolean {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                // Verify integrity of current primary before mutating (Double Check)
                const currentChecksum = this.calculateChecksum(this.primary);
                if (this.checksum !== currentChecksum) {
                    console.error(`[MEMORY CORRUPTION DETECTED] Before applying '${description}'. Restoring from shadow.`);
                    this.restoreFromShadow();
                    if (attempt === retries) {
                        throw new Error(`Memory corruption detected before '${description}'`);
                    }
                    console.warn(`[Retry ${attempt}] Transaction '${description}' failed, retrying...`);
                    continue;
                }

                // Create new immutable state using Immer and extract patches
                const [nextState, patches, inversePatches] = produceWithPatches(this.primary, mutator);

                // Calculate new checksum
                const newChecksum = this.calculateChecksum(nextState);

                // Commit transaction
                this.primary = nextState;
                this.shadow = produce(nextState, () => { }); // Create a frozen shadow copy
                this.checksum = newChecksum;

                // Trigger callback if provided
                if (onPatches) {
                    onPatches(patches, inversePatches);
                }

                return true;

            } catch (error) {
                if (attempt === retries) {
                    console.error(`[Transaction Failed] ${description}:`, error);
                    throw error;
                }
                console.warn(`[Retry ${attempt}] Transaction '${description}' failed, retrying...`);
            }
        }
        return false;
    }

    private restoreFromShadow() {
        this.primary = produce(this.shadow, () => { });
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
