import { WildcardService } from './services/wildcardService';
import type { Category } from '@shared/schema';
import dotenv from "dotenv";
import { SeededRNG } from './utils/reliability';

dotenv.config();

interface ValidationResult {
  isValid: boolean;
  reason: string;
  source: 'database' | 'ai' | 'heuristic';
}

interface CacheEntry {
  result: ValidationResult;
  timestamp: number;
}

export class HybridValidator {
  private static instance: HybridValidator;

  private cache = new Map<string, CacheEntry>();
  // private maxCacheSize = 10000;
  // private cacheTTL = 24 * 60 * 60 * 1000; 

  private metrics = {
    totalValidations: 0,
    dbHits: 0,
    aiHits: 0,
    failsLogged: 0,
    startTime: Date.now()
  };

  private constructor() {
    console.log("[HybridValidator] Initialized in Manual/Voting Mode (AI Disabled).");
  }

  static getInstance(): HybridValidator {
    if (!HybridValidator.instance) {
      HybridValidator.instance = new HybridValidator();
    }
    return HybridValidator.instance;
  }

  /**
   * Validate a single word with optional seed for deterministic behavior.
   * If valid: Returns true.
   * If invalid: Logs to suggestions.json and returns false.
   */
  async validate(letter: string, category: Category, answer: string, seed?: number): Promise<ValidationResult> {
    this.metrics.totalValidations++;

    // Quick cleaning
    const trimmed = answer.trim();
    if (!trimmed || trimmed.length < 2) {
      return { isValid: false, reason: 'Too short', source: 'heuristic' };
    }

    // 1. Check Local DB (Deterministic by definition of static DB)
    const isValid = WildcardService.getInstance().validateWord(letter, category, trimmed);

    if (isValid) {
      this.metrics.dbHits++;
      return { isValid: true, reason: 'Found in Database', source: 'database' };
    }

    // 2. Not found? 
    // If we had a probabilistic fallback, we would use seed here.
    // For now, we just Log and Fail.

    // SCOP-v3.5: If we were to use AI simulation or Fuzzing here, we'd use SeededRNG.
    if (seed !== undefined) {
      const rng = new SeededRNG(seed + answer.length);
      // usage example: if (rng.next() > 0.99) ... random miracle approval?
      // keeping it strict for now.
    }

    WildcardService.getInstance().logSuggestion(letter, category, trimmed);
    this.metrics.failsLogged++;

    return {
      isValid: false,
      reason: 'Word not found in DB',
      source: 'database'
    };
  }

  /**
   * Validate a batch of words.
   * Accepts a shared seed for the batch (usually derived from room+round).
   */
  async validateBatch(
    items: Array<{ playerId: string, category: Category, letter: string, answer: string }>,
    seed?: number
  ): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    // Using the seed, we could shuffle order or effect processing, but validation should be independent.
    // We pass the seed down to individual validate calls if needed.

    for (const item of items) {
      const key = `${item.playerId}:${item.category}`;
      const itemSeed = seed ? seed + item.playerId.charCodeAt(0) : undefined;
      const result = await this.validate(item.letter, item.category, item.answer, itemSeed);
      results.set(key, result);
    }

    return results;
  }

  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    return {
      ...this.metrics,
      uptimeSeconds: Math.floor(uptime / 1000),
      suggestionsLogged: this.metrics.failsLogged
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}
