import { WildcardService } from './services/wildcardService';
import type { Category } from '@shared/schema';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIValidator } from './aiValidator';
import dotenv from "dotenv";
import { GroqService } from './services/groqService';

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

/**
 * الفاليديتور الهجين: يعتمد على قاعدة البيانات أساساً مع AI كمساعد اختياري
 * يضمن العمل تحت أي ظرف - حتى بدون إنترنت أو عندما AI يفشل
 */
export class HybridValidator {
  private static instance: HybridValidator;
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  private cache = new Map<string, CacheEntry>();
  private maxCacheSize = 10000;
  private cacheTTL = 24 * 60 * 60 * 1000; // 24 ساعات

  private metrics = {
    totalValidations: 0,
    dbHits: 0,
    aiHits: 0,
    cacheHits: 0,
    heuristicHits: 0,
    startTime: Date.now()
  };

  private constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINIAPIKEY;
    const modelName = process.env.GEMINI_MODEL_NAME || process.env.GEMINIMODEL || 'gemini-3-flash-preview';

    console.log(`[HybridValidator] API Key: ${apiKey ? 'Provided' : 'Missing'}`);
    console.log(`[HybridValidator] Model: ${modelName}`);

    if (apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0.1,
          }
        });
        console.log("[HybridValidator] AI initialized successfully");
      } catch (error: any) {
        console.warn("[HybridValidator] AI initialization failed:", error.message);
        console.warn("[HybridValidator] Falling back to database-only mode");
        this.model = null; // Ensure partial failure doesn't leave bad state
      }
    } else {
      console.warn("[HybridValidator] No API key - using database-only mode");
    }
  }

  static getInstance(): HybridValidator {
    if (!HybridValidator.instance) {
      HybridValidator.instance = new HybridValidator();
    }
    return HybridValidator.instance;
  }

  /**
   * تحديث سريع يعتمد على قاعدة البيانات الكبيرة
   */
  private quickDatabaseCheck(letter: string, category: Category, answer: string): ValidationResult | null {
    const trimmed = answer.trim();
    if (!trimmed || trimmed.length < 2) {
      return {
        isValid: false,
        reason: 'إجابة قصيرة جداً',
        source: 'database'
      };
    }

    // استخدم WildcardService للتحقق من قاعدة البيانات الكبيرة
    const isValid = WildcardService.getInstance().validateWord(letter, category, trimmed);

    if (isValid) {
      return {
        isValid: true,
        reason: 'موجود في قاعدة البيانات',
        source: 'database'
      };
    }

    // إذا لم يكن موجوداً، نتحقق فقط من بداية الحرف كرفض مبدئي
    const startsWith = this.startsWithLetter(letter, trimmed);
    if (!startsWith) {
      return {
        isValid: false,
        reason: 'لا يبدأ بالحرف المطلوب',
        source: 'database'
      };
    }

    // إذا كان يبدأ بالحرف لكنه غير موجود في قاعدة البيانات -> نعتبره خطأ مبدئياً 
    // (المستخدم يمكنه طلب المراجعة لاحقاً)
    return {
      isValid: false,
      reason: 'غير موجود في قاعدة البيانات',
      source: 'database'
    };
  }

  /**
   * التحقق الرئيسي:
   * 1. Cache
   * 2. Database (Strict)
   */
  async validate(letter: string, category: Category, answer: string): Promise<ValidationResult> {
    this.metrics.totalValidations++;

    const cacheKey = `${letter}:${category}:${answer.trim().toLowerCase()}`;

    // 1. التحقق من الـ cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }

    // 2. البحث في قاعدة البيانات (Strict)
    const dbResult = this.quickDatabaseCheck(letter, category, answer);

    // إذا كان صالحاً -> تمام
    // إذا كان غير صالح -> تمام (المستخدم يطعن عليه يدوياً)
    // لا يوجد AI تلقائي هنا بعد الآن

    if (dbResult) {
      this.setCache(cacheKey, dbResult);
      if (dbResult.isValid) this.metrics.dbHits++;
      return dbResult;
    }

    return {
      isValid: false,
      reason: 'خطأ غير معروف',
      source: 'heuristic'
    };
  }

  /**
   * التحقق من مجموعة إجابات (Database Only First)
   * Unknown words are temporarily rejected until appealed
   */
  async validateBatch(
    items: Array<{ playerId: string, category: Category, letter: string, answer: string }>
  ): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    // 1. Check DB & Cache for ALL items
    for (const item of items) {
      const key = `${item.playerId}:${item.category}`;
      // Basic strict DB check
      let dbResult = this.quickDatabaseCheck(item.letter, item.category, item.answer);

      if (dbResult && dbResult.isValid) {
        // Valid in DB
        results.set(key, dbResult);
        this.metrics.dbHits++;
      } else {
        // Not in DB or invalid -> REJECT for now
        // START LOGIC CHANGE: We strictly rely on DB. 
        // If not found, it is INVALID. 
        // User must APPEAL to validation via AI.

        if (!dbResult) {
          dbResult = {
            isValid: false,
            reason: 'غير مسجلة (اضغط + للتأكيد)',
            source: 'database'
          };
        }

        results.set(key, dbResult);
      }
    }

    // No AI batching here. AI is exclusively for Appeals.

    return results;
  }

  /**
   * ✅ NEW: Manual Appeal / Verification using AI (Groq)
   * This is called ONLY when user clicks (+) button
   */
  async verifyWordWithAI(letter: string, category: string, word: string): Promise<boolean> {
    console.log(`[HybridValidator] appeal requested for: ${word} (${letter}:${category})`);

    try {
      // 1. Double check DB just in case
      if (WildcardService.getInstance().validateWord(letter, category, word)) {
        return true;
      }

      // 2. Call Groq
      const items = [{ letter, category, word }];
      const groqResults = await GroqService.getInstance().validateBatch(items);

      if (groqResults && groqResults.length > 0 && groqResults[0].isValid) {
        console.log(`[HybridValidator] Appeal APPROVED by AI`);

        // 3. Persist to DB immediately
        WildcardService.getInstance().addWord(letter, category, word);

        // Update metrics/cache
        this.metrics.aiHits++;
        const cacheKey = `${letter}:${category}:${word.trim().toLowerCase()}`;
        this.setCache(cacheKey, { isValid: true, reason: 'Approved by Appeal', source: 'ai' });

        return true;
      }

      console.log(`[HybridValidator] Appeal REJECTED by AI`);
      return false;

    } catch (error) {
      console.error('[HybridValidator] Appeal failed due to error:', error);
      return false;
    }
  }

  private startsWithLetter(letter: string, answer: string): boolean {
    const normalizedLetter = this.normalizeArabic(letter);
    const normalizedAnswer = this.normalizeArabic(answer);

    if (!normalizedAnswer) return false;

    // Handle "ال" prefix
    let cleanAnswer = normalizedAnswer;
    if (cleanAnswer.startsWith('ال') && cleanAnswer.length > 2) {
      cleanAnswer = cleanAnswer.substring(2);
    }

    const answerFirstChar = cleanAnswer.charAt(0);
    const letterFirstChar = normalizedLetter.charAt(0);

    const letterVariants: Record<string, string[]> = {
      'ا': ['ا', 'أ', 'إ', 'آ', 'ء'],
      'أ': ['ا', 'أ', 'إ', 'آ', 'ء'],
      'إ': ['ا', 'أ', 'إ', 'آ', 'ء'],
      'آ': ['ا', 'أ', 'إ', 'آ', 'ء'],
      'ء': ['ا', 'أ', 'إ', 'آ', 'ء'],
      'ه': ['ه', 'ة', 'ت'], // sometimes taa marbuta is written as ha or taa
      'ة': ['ه', 'ة', 'ت'],
      'ي': ['ي', 'ى'],
      'ى': ['ي', 'ى'],
      'و': ['و', 'ؤ'],
      'ك': ['ك', 'گ'],
    };

    const validFirstChars = letterVariants[letterFirstChar] || [letterFirstChar];
    return validFirstChars.includes(answerFirstChar);
  }

  private normalizeArabic(text: string): string {
    if (!text) return '';
    return text
      .trim()
      .replace(/[^\u0621-\u064A]/g, '') // Keep only standard Arabic letters (remove diacritics, spaces, special chars)
      .replace(/أ|إ|آ/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .toLowerCase();
  }

  private getFromCache(key: string): ValidationResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  private setCache(key: string, result: ValidationResult): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    return {
      ...this.metrics,
      uptimeSeconds: Math.floor(uptime / 1000),
      dbPercentage: this.metrics.totalValidations > 0
        ? ((this.metrics.dbHits / this.metrics.totalValidations) * 100).toFixed(1) + '%'
        : '0%',
      aiPercentage: this.metrics.totalValidations > 0
        ? ((this.metrics.aiHits / this.metrics.totalValidations) * 100).toFixed(1) + '%'
        : '0%',
      cacheSize: this.cache.size
    };
  }

  clearCache(): void {
    this.cache.clear();
    console.log("[HybridValidator] Cache cleared");
  }
}
