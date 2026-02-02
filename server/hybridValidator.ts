import { GroqService } from './services/groqService';
import { WildcardService } from './services/wildcardService';
import type { Category } from '@shared/schema';
import dotenv from "dotenv";

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
  private maxCacheSize = 10000;
  private cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

  private metrics = {
    totalValidations: 0,
    dbHits: 0,
    aiHits: 0,
    failsLogged: 0,
    startTime: Date.now()
  };

  private constructor() {
    console.log("[HybridValidator] Initialized in Hybrid Mode (Local + AI).");
  }

  static getInstance(): HybridValidator {
    if (!HybridValidator.instance) {
      HybridValidator.instance = new HybridValidator();
    }
    return HybridValidator.instance;
  }

  /**
   * Validate a single word.
   * If valid in DB: Returns true.
   * If invalid in DB: Asks AI.
   */
  async validate(letter: string, category: Category, answer: string): Promise<ValidationResult> {
    this.metrics.totalValidations++;

    // Quick cleaning
    const trimmed = answer.trim();
    if (!trimmed || trimmed.length < 2) {
      return { isValid: false, reason: 'Too short', source: 'heuristic' };
    }

    // 1. Check Local DB
    const isLocalValid = WildcardService.getInstance().validateWord(letter, category, trimmed);

    if (isLocalValid) {
      this.metrics.dbHits++;
      return { isValid: true, reason: 'Found in Database', source: 'database' };
    }

    // 2. Fallback to AI
    try {
      const aiResult = await GroqService.getInstance().validateWord(letter, category, trimmed);

      if (aiResult.isValid) {
        this.metrics.aiHits++;
        // Optionally add to suggestion log even if valid by AI, to improve local DB?
        // Or add to local DB directly? For now, let's just accept it.
        return { isValid: true, reason: aiResult.reason, source: 'ai' };
      } else {
        // AI Rejected it
        this.metrics.failsLogged++;
        WildcardService.getInstance().logSuggestion(letter, category, trimmed);
        return { isValid: false, reason: aiResult.reason, source: 'ai' };
      }
    } catch (error) {
      console.error("[HybridValidator] AI Fallback failed:", error);
      // 3. Final Fallback: Heuristic / Autosuggest
      WildcardService.getInstance().logSuggestion(letter, category, trimmed);
      return {
        isValid: false,
        reason: 'Not found in DB and AI unavailable.',
        source: 'heuristic'
      };
    }
  }

  /**
   * Validate a batch of words efficiently.
   * Checks DB first, then batches remaining to AI.
   */
  async validateBatch(
    items: Array<{ playerId: string, category: Category, letter: string, answer: string }>
  ): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();
    const toAskAI: typeof items = [];

    // 1. Check ALL against Local DB first
    for (const item of items) {
      const key = `${item.playerId}:${item.category}`;

      // Skip empty
      if (!item.answer || item.answer.trim().length < 2) {
        results.set(key, { isValid: false, reason: 'Empty/Short', source: 'heuristic' });
        continue;
      }

      const isValidLocal = WildcardService.getInstance().validateWord(item.letter, item.category, item.answer);
      if (isValidLocal) {
        this.metrics.dbHits++;
        results.set(key, { isValid: true, reason: 'Found in Database', source: 'database' });
      } else {
        toAskAI.push(item);
      }
    }

    // 2. Batch request to AI for the rest
    if (toAskAI.length > 0) {
      console.log(`[HybridValidator] Sending ${toAskAI.length} items to AI...`);
      try {
        const aiResults = await GroqService.getInstance().validateBatch(
          toAskAI.map(i => ({ letter: i.letter, category: i.category, word: i.answer }))
        );

        toAskAI.forEach((item, index) => {
          const key = `${item.playerId}:${item.category}`;
          const aiRes = aiResults[index]; // Assume order preserved

          if (aiRes) {
            if (aiRes.isValid) this.metrics.aiHits++;
            else {
              this.metrics.failsLogged++;
              WildcardService.getInstance().logSuggestion(item.letter, item.category, item.answer);
            }
            results.set(key, { isValid: aiRes.isValid, reason: aiRes.reason, source: 'ai' });
          } else {
            results.set(key, { isValid: false, reason: 'AI Error', source: 'heuristic' });
          }
        });

      } catch (error) {
        console.error("[HybridValidator] Batch AI failed:", error);
        // Fallback for all AI failures
        toAskAI.forEach(item => {
          const key = `${item.playerId}:${item.category}`;
          results.set(key, { isValid: false, reason: 'AI Unavailable', source: 'heuristic' });
        });
      }
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
