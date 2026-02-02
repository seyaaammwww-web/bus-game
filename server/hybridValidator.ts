
import { WildcardService } from './services/wildcardService';
import type { Category } from '@shared/schema';
import dotenv from "dotenv";

dotenv.config();

interface ValidationResult {
  isValid: boolean;
  reason: string;
  source: 'database' | 'ai' | 'heuristic';
  isSmart?: boolean;
}

interface CacheEntry {
  result: ValidationResult;
  timestamp: number;
}

export class HybridValidator {
  private static instance: HybridValidator;

  private cache = new Map<string, CacheEntry>();
  private maxCacheSize = 10000;
  private cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

  private metrics = {
    totalValidations: 0,
    dbHits: 0,
    failsLogged: 0,
    startTime: Date.now()
  };

  private constructor() {
    console.log("[HybridValidator] Initialized in Local-Only Mode (Offline).");
  }

  static getInstance(): HybridValidator {
    if (!HybridValidator.instance) {
      HybridValidator.instance = new HybridValidator();
    }
    return HybridValidator.instance;
  }

  /**
   * Validate a single word.
   * If valid: Returns true.
   * If invalid: Logs to suggestions.json and returns false.
   */
  async validate(letter: string, category: Category, answer: string): Promise<ValidationResult> {
    this.metrics.totalValidations++;

    // Quick cleaning
    const trimmed = answer.trim();
    if (!trimmed || trimmed.length < 2) {
      return { isValid: false, reason: 'Too short', source: 'heuristic' };
    }

    // 1. Check Local DB
    const dbResult = WildcardService.getInstance().validateWord(letter, category, trimmed);

    if (dbResult.isValid) {
      this.metrics.dbHits++;
      return {
        isValid: true,
        reason: 'Found in Database',
        source: 'database',
        isSmart: dbResult.isSmart
      };
    }

    // 2. Not found? LOG IT for review!
    // We log it so the admin can add it next week if it's correct.
    WildcardService.getInstance().logSuggestion(letter, category, trimmed);
    this.metrics.failsLogged++;

    return {
      isValid: false,
      reason: 'Word not found. Logged for review.',
      source: 'database'
    };
  }

  /**
   * Validate a batch of words.
   */
  async validateBatch(
    items: Array<{ playerId: string, category: Category, letter: string, answer: string }>
  ): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    for (const item of items) {
      const key = `${item.playerId}:${item.category}`;
      const result = await this.validate(item.letter, item.category, item.answer);
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
