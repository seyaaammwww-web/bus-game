import * as fs from 'fs';
import { promises as fsAsync } from 'fs';
import * as path from 'path';
import { arabicWords, availableLetters } from '../../shared/arabicWords';
import { AdvancedNormalizer } from '../utils/AdvancedNormalizer';
import { SmartToleranceEngine } from '../utils/SmartToleranceEngine';
import { hasGarbagePattern, isMostlyArabic } from '../utils/answerHeuristics';

// FIX (#3): Serialized async write queue — prevents concurrent write corruption
let writeQueuePromise: Promise<void> = Promise.resolve();
function enqueueWrite(fn: () => Promise<void>): Promise<void> {
    writeQueuePromise = writeQueuePromise.then(() => fn()).catch(err => {
        console.error('[WriteQueue] Error:', err);
    });
    return writeQueuePromise;
}

interface WildcardDatabase {
    [letter: string]: {
        [category: string]: string[];
    };
}

interface SynonymsConfig {
    jamad_synonyms: Record<string, string[]>;
    jamad_categories: Record<string, string[]>;
}

/**
 * Service to provide wildcard answers from pre-built database
 * Features:
 * - Smart Validation (Synonyms, Normalization)
 * - Caching (High Performance)
 * - Community Suggestion Logging
 * - NO Fuzzy Validation (Removed for Scalability)
 */
export class WildcardService {
    private static instance: WildcardService;
  private database: WildcardDatabase = {};
    private synonyms: SynonymsConfig = { jamad_synonyms: {}, jamad_categories: {} };

    // Performance Optimization: Cache validation results
    private validationCache = new Map<string, boolean>();
    private MAX_CACHE_SIZE = 50000;

    // Advanced validation utilities
    private normalizer: AdvancedNormalizer;
    private toleranceEngine: SmartToleranceEngine;

    private constructor() {
        this.normalizer = AdvancedNormalizer.getInstance();
        this.toleranceEngine = SmartToleranceEngine.getInstance();
        this.loadDatabase();
        this.loadSynonyms();
    }

    static getInstance(): WildcardService {
        if (!WildcardService.instance) {
            WildcardService.instance = new WildcardService();
        }
        return WildcardService.instance;
    }

    private loadDatabase(): void {
        try {
            const filename = 'clean_wildcardDatabase.json';
            // Search paths:
            // 1. Source path (Local dev / Docker source mapping)
            // 2. Build output path (Relative to compiled index.cjs)
            // 3. Fallback relative to CWD
            const candidates = [
                path.join(process.cwd(), 'server', 'data', filename),
                path.join(process.cwd(), 'dist', 'data', filename)
            ];

            let dbPath = '';
            for (const candidate of candidates) {
                console.log(`[WildcardService] Checking for DB at: ${candidate}`);
                if (fs.existsSync(candidate)) {
                    dbPath = candidate;
                    break;
                }
            }

            if (!dbPath) {
                // Try original as last resort
                const origFilename = 'wildcardDatabase.json';
                const origPath = path.join(process.cwd(), 'server', 'data', origFilename);
                if (fs.existsSync(origPath)) dbPath = origPath;
            }

            if (dbPath && fs.existsSync(dbPath)) {
                const data = fs.readFileSync(dbPath, 'utf-8');
                const parsed = JSON.parse(data) as WildcardDatabase;
                this.database = this.sanitizeDatabase(this.filterValidLetterKeys(parsed));
                const keys = Object.keys(this.database);
                const nonArabic = keys.filter(k => !/^[\u0600-\u06FF]/.test(k) || /^\d+$/.test(k));
                if (keys.length > 0 && nonArabic.length / keys.length > 0.1) {
                    console.warn(`⚠️ Wildcard DB has ${nonArabic.length}/${keys.length} non-Arabic letter keys — run cleanDatabase.ts`);
                }
                console.log(`✅ Wildcard Database loaded from: ${dbPath} (${keys.length} Arabic letters)`);
                this.supplementFromFallback();
            } else {
                console.error(`❌ Wildcard Database NOT found in any candidate path.`);
                if (!arabicWords || Object.keys(arabicWords).length === 0) {
                    console.error("❌ Fallback arabicWords is EMPTY/Undefined!");
                }
                throw new Error("JSON not found");
            }
        } catch (error) {
            console.warn('⚠️ Wildcard Database JSON missing or invalid. Using built-in fallback.', error);
            this.database = arabicWords;
            const nums = Object.keys(this.database).length;
            console.log(`⚠️ Loaded fallback database with ${nums} letters.`);
        }
    }

    /** Merge core words from arabicWords.ts when missing from the main JSON DB. */
    private supplementFromFallback(): void {
        let added = 0;
        for (const [letter, cats] of Object.entries(arabicWords)) {
            const dbKey = this.getDatabaseKey(letter);
            if (!dbKey) continue;
            if (!this.database[dbKey]) this.database[dbKey] = {};
            for (const [category, words] of Object.entries(cats)) {
                if (!this.database[dbKey][category]) this.database[dbKey][category] = [];
                const existing = new Set(
                    this.database[dbKey][category].map(w => this.normalizer.normalize(w))
                );
                for (const word of words) {
                    const norm = this.normalizer.normalize(word);
                    if (!existing.has(norm)) {
                        this.database[dbKey][category].push(word);
                        existing.add(norm);
                        added++;
                    }
                }
            }
        }
        if (added > 0) {
            console.log(`✅ Supplemented ${added} core words from arabicWords fallback`);
        }
    }

    private loadSynonyms(): void {
        try {
            const synPath = path.join(process.cwd(), 'server/data/synonyms.json');
            if (fs.existsSync(synPath)) {
                this.synonyms = JSON.parse(fs.readFileSync(synPath, 'utf-8'));
                console.log('✅ Synonyms loaded.');
            }
        } catch (error) {
            console.error('⚠️ Failed to load synonyms:', error);
        }
    }

    private isValidLetterKey(key: string): boolean {
        if (/^\d+$/.test(key)) return false;
        if (/^[a-zA-Z]/.test(key)) return false;
        if (availableLetters.includes(key)) return true;
        const norm = this.normalizer.normalize(key);
        return availableLetters.some(l => this.normalizer.normalize(l) === norm);
    }

    private filterValidLetterKeys(db: WildcardDatabase): WildcardDatabase {
        const filtered: WildcardDatabase = {};
        for (const [letter, categories] of Object.entries(db)) {
            if (this.isValidLetterKey(letter)) {
                filtered[letter] = categories;
            }
        }
        return filtered;
    }

    /** Drop polluted short/garbage entries that cause false fuzzy matches. */
    private sanitizeDatabase(db: WildcardDatabase): WildcardDatabase {
        const clean: WildcardDatabase = {};
        for (const [letter, categories] of Object.entries(db)) {
            clean[letter] = {};
            for (const [category, words] of Object.entries(categories)) {
                clean[letter][category] = words.filter(w => {
                    const trimmed = w.trim();
                    if (trimmed.length < 3) return false;
                    if (!/^[\u0600-\u06FF]+$/.test(trimmed)) return false;
                    if (/(.)\1{2,}/.test(trimmed)) return false;
                    const norm = this.normalizer.normalize(trimmed);
                    return norm.length >= 3;
                });
            }
        }
        return clean;
    }

    /**
     * Helper to find the correct database key for a given letter
     */
    private getDatabaseKey(letter: string): string | null {
        if (this.database[letter] && this.isValidLetterKey(letter)) return letter;

        const normalized = this.normalizer.normalize(letter);
        const key = Object.keys(this.database)
            .filter(k => this.isValidLetterKey(k))
            .find(k => this.normalizer.normalize(k) === normalized);
        return key || null;
    }

    /**
     * FIX (#17): Expose method to get all words for a category/letter for wildcard powerup
     */
    getWords(letter: string, category: string): string[] {
        const dbKey = this.getDatabaseKey(letter);
        if (!dbKey) return [];
        return this.database[dbKey]?.[category] || [];
    }

    /**
     * Get wildcard answers for given categories and letter
     */
    getAnswers(letter: string, categories: string[]): Record<string, string> | null {
        const dbKey = this.getDatabaseKey(letter);
        if (!dbKey) return null;

        const letterData = this.database[dbKey];
        const answers: Record<string, string> = {};

        for (const category of categories) {
            let categoryAnswers = letterData[category];
            if (!categoryAnswers || categoryAnswers.length === 0) continue;

            let availableAnswers = categoryAnswers;


            // Advanced Filtering for Quality
            // 1. No spaces (single words only)
            // 2. No starting numbers
            // 3. Reasonable length
            // 4. No special chars meant for explanations (parentheses)
            availableAnswers = availableAnswers.filter((a: string) =>
                !a.includes(' ') &&
                !/^\d/.test(a) &&
                a.length <= 15 &&
                !a.includes('(')
            );

            if (availableAnswers.length === 0) continue;

            const randomAnswer = availableAnswers[Math.floor(Math.random() * availableAnswers.length)];
            answers[category] = randomAnswer;
        }
        return Object.keys(answers).length > 0 ? answers : null;
    }

    /**
     * Validate a word against the database with ADVANCED smart logic
     */
    validateWord(letter: string, category: string, word: string): boolean {
        const trimmed = word.trim();
        if (!trimmed || trimmed.length < 3) return false;
        if (!isMostlyArabic(trimmed)) return false;
        if (hasGarbagePattern(trimmed)) return false;

        // 1. Basic cleaning using advanced normalizer
        const normalizedInput = this.normalizer.normalize(trimmed);
        if (!normalizedInput || normalizedInput.length < 3) return false;

        // 2. Cache Check (O(1))
        const cacheKey = `${letter}:${category}:${normalizedInput}`;
        if (this.validationCache.has(cacheKey)) {
            return this.validationCache.get(cacheKey)!;
        }

        let isValid = false;

        // 3. Advanced letter check (with article support)
        if (!this.toleranceEngine.startsWithLetter(word, letter)) {
            // Cache and return false immediately if doesn't start with letter
            this.validationCache.set(cacheKey, false);
            return false;
        }

        // 4. Advanced Database Check with all tolerance rules
        if (this.checkDatabaseAdvanced(letter, category, word)) {
            isValid = true;
        }
        // 5. Extended Synonyms & Smart Logic (all categories)
        else if (this.checkSynonymsAdvanced(category, word)) {
            isValid = true;
        }

        // 6. Update Cache with FIFO eviction (Map preserves insertion order)
        // WS1: Removes oldest 25% of entries when full — not true LRU but practical for this use case
        if (this.validationCache.size >= this.MAX_CACHE_SIZE) {
            const entriesToRemove = Math.floor(this.MAX_CACHE_SIZE * 0.25);
            const iterator = this.validationCache.keys();
            for (let i = 0; i < entriesToRemove; i++) {
                const key = iterator.next().value;
                if (key) this.validationCache.delete(key);
            }
            console.log(`[Cache] Evicted ${entriesToRemove} oldest entries (FIFO)`);
        }
        this.validationCache.set(cacheKey, isValid);

        return isValid;
    }

    private normalizeArabic(text: string): string {
        try {
            return text
                .trim()
                .toLowerCase()
                .replace(/[^\u0600-\u06FF\s]/g, '') // Keep Arabic only
                .replace(/[أإآ]/g, 'ا')
                .replace(/ة/g, 'ه')  // Normalized Taa Marbuta
                .replace(/ى/g, 'ي')  // Aggressive normalization: Alef Maqsura -> Yaa globally
                .replace(/[\u064B-\u065F]/g, ''); // Remove tashkeel
        } catch (e) {
            return text;
        }
    }

    /**
     * Advanced database check using SmartToleranceEngine
     */
    private checkDatabaseAdvanced(letter: string, category: string, word: string): boolean {
        const dbKey = this.getDatabaseKey(letter);
        if (!dbKey) return false;

        const letterData = this.database[dbKey];
        if (!letterData) return false;

        const categoryAnswers = letterData[category];
        if (!categoryAnswers || categoryAnswers.length === 0) return false;

        // Use SmartToleranceEngine to find matches with ALL tolerance rules:
        // - Exact match after normalization
        // - Match with/without "ال" article
        // - Common spelling variations (يحيى/يحيي, etc.)
        // - Fuzzy matching for typos (intelligent based on word length)
        const matches = this.toleranceEngine.findMatches(word, categoryAnswers, category);

        return matches.length > 0;
    }

    /**
     * Legacy checkDatabase for backward compatibility (now uses advanced version)
     */
    private checkDatabase(letter: string, category: string, normalizedWord: string): boolean {
        return this.checkDatabaseAdvanced(letter, category, normalizedWord);
    }

    /**
     * Advanced synonym checking for ALL categories
     */
    private checkSynonymsAdvanced(category: string, word: string): boolean {
        // Check built-in synonyms from SmartToleranceEngine (all categories)
        // This is automatically handled by toleranceEngine.isMatch() with category parameter

        // Additionally check legacy synonyms.json for 'جماد' category
        if (category === 'جماد') {
            return this.checkJamadSmart(word);
        }

        return false;
    }

    /**
     * Legacy Jamad smart check (enhanced with advanced normalizer)
     */
    private checkJamadSmart(word: string): boolean {
        const normalizedWord = this.normalizer.normalize(word);

        // A. Direct Synonyms Check
        for (const [canonical, variants] of Object.entries(this.synonyms.jamad_synonyms)) {
            const allVariants = [canonical, ...variants];
            if (allVariants.some(v => this.normalizer.areEquivalentWithArticle(v, word))) {
                return true;
            }
        }

        // B. Check Sub-categories (General Knowledge)
        for (const list of Object.values(this.synonyms.jamad_categories)) {
            if (list.some(item => this.normalizer.areEquivalentWithArticle(item, word))) {
                return true;
            }
        }

        return false;
    }

    getStats() {
        const letterCount = Object.keys(this.database).length;
        const categoryCount = letterCount > 0 ? Object.keys(this.database[Object.keys(this.database)[0]]).length : 0;
        const totalAnswers = Object.keys(this.database).reduce((sum, letter) => {
            return sum + Object.keys(this.database[letter]).reduce((catSum, cat) => {
                return catSum + this.database[letter][cat].length;
            }, 0);
        }, 0);

        return {
            letters: letterCount,
            categoriesPerLetter: categoryCount,
            totalAnswers,
            averagePerCategory: categoryCount > 0 ? Math.floor(totalAnswers / (letterCount * categoryCount)) : 0,
            cacheSize: this.validationCache.size
        };
    }

    /**
     * Add a new word to the database (Admin/Direct)
     */
    addWord(letter: string, category: string, word: string): boolean {
        const cleanDbPath = path.join(process.cwd(), 'server/data/clean_wildcardDatabase.json');

        let dbKey = this.getDatabaseKey(letter);
        if (!dbKey) {
            this.database[letter] = {};
            dbKey = letter;
        }

        if (!this.database[dbKey]) this.database[dbKey] = {};
        if (!this.database[dbKey][category]) this.database[dbKey][category] = [];

        const normalizedWord = this.normalizer.normalize(word);
        const exists = this.database[dbKey][category].some(w =>
            this.normalizer.normalize(w) === normalizedWord
        );

        if (exists) return false;

        this.database[dbKey][category].push(word);

        // Invalidate cache for this key if it existed as false
        const cacheKey = `${letter}:${category}:${normalizedWord}`;
        this.validationCache.delete(cacheKey);

        // WS3: Use async write queue to avoid blocking the event loop
        this.database[dbKey][category].sort();
        const snapshot = JSON.stringify(this.database, null, 2);
        enqueueWrite(async () => {
            try {
                await fsAsync.writeFile(cleanDbPath, snapshot, 'utf-8');
                console.log(`[Wildcard DB] Added ${word} to ${dbKey}:${category}`);
            } catch (error) {
                console.error('[Wildcard DB] Failed to save, retrying once...', error);
                try {
                    await fsAsync.writeFile(cleanDbPath, snapshot, 'utf-8');
                    console.log(`[Wildcard DB] Retry succeeded for ${word}`);
                } catch (retryErr) {
                    console.error('[Wildcard DB] Retry also failed:', retryErr);
                }
            }
        });

        return true;
    }

    /**
     * FIX (#3): Log a word not found in DB — async write to avoid blocking event loop
     */
    logSuggestion(letter: string, category: string, word: string): void {
        const suggestionPath = path.join(process.cwd(), 'server/data/suggestions.json');
        const MAX_SUGGESTIONS = 5000; // Cap file size to prevent unbounded growth
        // Fire and forget — errors logged internally
        enqueueWrite(async () => {
            let suggestions: any[] = [];
            try {
                if (fs.existsSync(suggestionPath)) {
                    const content = await fsAsync.readFile(suggestionPath, 'utf-8');
                    if (content.trim()) {
                        try { suggestions = JSON.parse(content); } catch { suggestions = []; }
                    }
                }

                const normalizedWord = this.normalizeArabic(word);
                const existingIndex = suggestions.findIndex((s: any) =>
                    this.normalizeArabic(s.word) === normalizedWord &&
                    s.category === category &&
                    s.letter === letter
                );

                if (existingIndex >= 0) {
                    suggestions[existingIndex].count++;
                    suggestions[existingIndex].lastSeen = new Date().toISOString();
                } else {
                    suggestions.push({
                        word, normalized: normalizedWord, letter, category,
                        count: 1,
                        firstSeen: new Date().toISOString(),
                        lastSeen: new Date().toISOString()
                    });
                }

                // Trim oldest entries if over cap
                if (suggestions.length > MAX_SUGGESTIONS) {
                    suggestions.sort((a: any, b: any) =>
                        new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime()
                    );
                    suggestions = suggestions.slice(suggestions.length - MAX_SUGGESTIONS);
                }

                await fsAsync.writeFile(suggestionPath, JSON.stringify(suggestions, null, 2), 'utf-8');
            } catch (error) {
                console.error('[WildcardService] Failed to log suggestion:', error);
            }
        });
    }

}
