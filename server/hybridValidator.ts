import { WildcardService } from './services/wildcardService';
import { GroqService } from './services/groqService';
import type { Category } from '@shared/schema';
import dotenv from "dotenv";
import { SeededRNG } from './utils/reliability';

dotenv.config();

interface ValidationResult {
  isValid: boolean;
  reason: string;
  source: 'database' | 'ai' | 'heuristic';
  aiSuggestion?: boolean;
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
   * If invalid: Asks AI for suggestion, logs to suggestions.json, and returns false with aiSuggestion.
   */
  async validate(playerId: string, letter: string, category: Category, answer: string, seed?: number): Promise<ValidationResult> {
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
    // Ask AI Assistant for suggestion (Phase 4)
    let aiSuggestion = false;
    let fallbackReason = 'Word not found in DB';

    try {
      const groqResult = await GroqService.getInstance().enqueueAppeal(playerId, category, letter, trimmed);
      aiSuggestion = groqResult.isValid;
      fallbackReason = groqResult.reason;
      this.metrics.aiHits++;
    } catch (e) {
      console.error("[HybridValidator] Error getting AI suggestion:", e);
    }

    WildcardService.getInstance().logSuggestion(letter, category, trimmed);
    this.metrics.failsLogged++;

    return {
      isValid: false, // Always false if not in DB, goes to voting/referee
      reason: fallbackReason,
      source: 'ai',
      aiSuggestion
    };
  }

  /**
   * FIX (#2): Validate a batch in PARALLEL using Promise.all.
   * Time = max(single validation) instead of sum(all validations).
   * This prevents the 6-second timeout from being exceeded unnecessarily.
   */
  async validateBatch(
    items: Array<{ playerId: string, category: Category, letter: string, answer: string }>,
    seed?: number
  ): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    // Run all validations concurrently — DB lookups are synchronous (in-memory),
    // so Promise.all here mainly helps if AI fallback is ever re-enabled.
    await Promise.all(items.map(async (item) => {
      const key = `${item.playerId}:${item.category}`;
      const itemSeed = seed ? seed + item.playerId.charCodeAt(0) : undefined;
      const result = await this.validate(item.playerId, item.letter, item.category, item.answer, itemSeed);
      results.set(key, result);
    }));

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
