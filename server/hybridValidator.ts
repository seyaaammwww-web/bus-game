import { WildcardService } from './services/wildcardService';
import type { Category } from '@shared/schema';
import { SeededRNG } from './utils/reliability';

// ============================================================
// AI validation has been INTENTIONALLY DISABLED.
// Groq is no longer in the validation path.
// Validation = local word database (WildcardService) only.
// Uncertain answers go to parallel player voting.
// Groq is still used ONLY for the Wildcard power-up generator.
// ============================================================

interface ValidationResult {
  isValid: boolean;
  reason: string;
  source: 'database' | 'heuristic';
}

export class HybridValidator {
  private static instance: HybridValidator;

  private metrics = {
    totalValidations: 0,
    dbHits: 0,
    dbMisses: 0,
    startTime: Date.now()
  };

  private constructor() {
    console.log("[HybridValidator] Initialized — Database-only mode. AI disabled.");
  }

  static getInstance(): HybridValidator {
    if (!HybridValidator.instance) {
      HybridValidator.instance = new HybridValidator();
    }
    return HybridValidator.instance;
  }

  /**
   * Validate a single word.
   * - Found in database → valid
   * - Not found → invalid (goes to voting/referee for uncertain answers)
   * No AI calls are made.
   */
  validate(playerId: string, letter: string, category: Category, answer: string, _seed?: number): ValidationResult {
    this.metrics.totalValidations++;

    const trimmed = answer.trim();
    if (!trimmed || trimmed.length < 2) {
      return { isValid: false, reason: 'قصير جداً', source: 'heuristic' };
    }

    const isValid = WildcardService.getInstance().validateWord(letter, category, trimmed);

    if (isValid) {
      this.metrics.dbHits++;
      return { isValid: true, reason: 'موجودة في القاموس', source: 'database' };
    }

    this.metrics.dbMisses++;
    // DATA3: Only log Arabic words to suggestions — filter out test/English entries
    const isArabic = /[\u0600-\u06FF]/.test(trimmed);
    if (isArabic) {
      WildcardService.getInstance().logSuggestion(letter, category, trimmed);
    }

    return {
      isValid: false,
      reason: 'غير موجودة في القاموس',
      source: 'database',
    };
  }

  /**
   * Validate a batch — synchronous internally, async return kept for API compatibility.
   * HV1: No await calls inside, so async keyword is removed for clarity.
   */
  validateBatch(
    items: Array<{ playerId: string, category: Category, letter: string, answer: string }>,
    seed?: number
  ): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    for (const item of items) {
      const key = `${item.playerId}:${item.category}`;
      const itemSeed = seed ? seed + item.playerId.charCodeAt(0) : undefined;
      const result = this.validate(item.playerId, item.letter, item.category, item.answer, itemSeed);
      results.set(key, result);
    }

    return Promise.resolve(results);
  }

  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    return {
      ...this.metrics,
      uptimeSeconds: Math.floor(uptime / 1000),
    };
  }
}
