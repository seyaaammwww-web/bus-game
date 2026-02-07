import * as fs from 'fs';
import * as path from 'path';
import { arabicWords } from '../../shared/arabicWords';


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
    private usedAnswers = new Map<string, Set<string>>(); // Track used answers per letter+category

    // Performance Optimization: Cache validation results
    private validationCache = new Map<string, boolean>();
    private MAX_CACHE_SIZE = 50000;

    private constructor() {
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
                this.database = JSON.parse(data);
                const stats = this.getStats();
                console.log(`✅ Wildcard Database loaded from: ${dbPath}`);
                console.log(`📊 Stats: ${stats.totalAnswers} words, ${stats.letters} letters.`);
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

    /**
     * Helper to find the correct database key for a given letter
     */
    private getDatabaseKey(letter: string): string | null {
        if (this.database[letter]) return letter;

        const normalized = this.normalizeArabic(letter);
        const key = Object.keys(this.database).find(k => this.normalizeArabic(k) === normalized);
        return key || null;
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

            const usedKey = `${dbKey}:${category}`;
            if (!this.usedAnswers.has(usedKey)) this.usedAnswers.set(usedKey, new Set());

            const used = this.usedAnswers.get(usedKey)!;
            let availableAnswers = categoryAnswers.filter(ans => !used.has(ans));

            if (availableAnswers.length === 0) {
                used.clear();
                availableAnswers = categoryAnswers;
            }

            const randomAnswer = availableAnswers[Math.floor(Math.random() * availableAnswers.length)];
            used.add(randomAnswer);
            answers[category] = randomAnswer;
        }
        return answers;
    }

    /**
     * Validate a word against the database with smart logic
     */
    validateWord(letter: string, category: string, word: string): boolean {
        // 1. Basic cleaning
        const normalizedInput = this.normalizeArabic(word);
        if (!normalizedInput || normalizedInput.length < 2) return false;

        // 2. Cache Check (O(1))
        const cacheKey = `${letter}:${category}:${normalizedInput}`;
        if (this.validationCache.has(cacheKey)) {
            return this.validationCache.get(cacheKey)!;
        }

        let isValid = false;

        // 3. Strict letter check (must start with letter)
        const normalizedLetter = this.normalizeArabic(letter);
        let startsWith = normalizedInput.startsWith(normalizedLetter.charAt(0));

        // Allow "Al" prefix exception
        if (!startsWith && normalizedInput.startsWith("ال") && normalizedInput.length > 2) {
            if (normalizedInput.substring(2).startsWith(normalizedLetter.charAt(0))) {
                startsWith = true;
            }
        }

        if (startsWith) {
            // 4. Database Check (Direct)
            if (this.checkDatabase(letter, category, normalizedInput)) {
                isValid = true;
            }
            // 5. Synonyms & Smart Logic
            else if (category === 'جماد' && this.checkJamadSmart(letter, normalizedInput)) {
                isValid = true;
            }
        }

        // 6. Update Cache
        if (this.validationCache.size >= this.MAX_CACHE_SIZE) {
            this.validationCache.clear(); // Simple eviction strategy
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

    // Direct Levenshtein implementation for dependency-free fuzzy matching
    private levenshtein(a: string, b: string): number {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    private checkDatabase(letter: string, category: string, normalizedWord: string): boolean {
        const dbKey = this.getDatabaseKey(letter);
        if (!dbKey) return false;

        const letterData = this.database[dbKey];
        if (!letterData) return false;

        const categoryAnswers = letterData[category];
        if (!categoryAnswers) return false;

        // 1. Exact Match (High Performance) - No fuzzy logic for very short words
        if (categoryAnswers.some(answer => this.normalizeArabic(answer) === normalizedWord)) {
            return true;
        }

        // 2. Advanced Logic: Fuzzy Match (Allow 1 character error for longer words only)
        // Strictly avoid fuzzy match on the first letter and keep it for words where a single typo is likely
        if (normalizedWord.length > 4) {
            const firstChar = normalizedWord.charAt(0);
            for (const answer of categoryAnswers) {
                const normAnswer = this.normalizeArabic(answer);
                // First letter MUST match exactly, and length must be similar
                if (normAnswer.charAt(0) === firstChar && Math.abs(normAnswer.length - normalizedWord.length) <= 1) {
                    if (this.levenshtein(normAnswer, normalizedWord) <= 1) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    private checkJamadSmart(letter: string, normalizedWord: string): boolean {
        // A. Direct Synonyms Check
        for (const [canonical, variants] of Object.entries(this.synonyms.jamad_synonyms)) {
            const allVariants = [canonical, ...variants];
            if (allVariants.some(v => this.normalizeArabic(v) === normalizedWord)) {
                return true;
            }
        }

        // B. Check Sub-categories (General Knowledge)
        for (const list of Object.values(this.synonyms.jamad_categories)) {
            if (list.some(item => this.normalizeArabic(item) === normalizedWord)) {
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

        const normalizedWord = this.normalizeArabic(word);
        const exists = this.database[dbKey][category].some(w =>
            this.normalizeArabic(w) === normalizedWord
        );

        if (exists) return false;

        this.database[dbKey][category].push(word);

        // Invalidate cache for this key if it existed as false
        const cacheKey = `${letter}:${category}:${normalizedWord}`;
        this.validationCache.delete(cacheKey);

        try {
            this.database[dbKey][category].sort();
            fs.writeFileSync(cleanDbPath, JSON.stringify(this.database, null, 2), 'utf-8');
            console.log(`[Wildcard DB] Added ${word} to ${dbKey}:${category}`);
            return true;
        } catch (error) {
            console.error('[Wildcard DB] Failed to save:', error);
            return false;
        }
    }

    /**
     * Log a word that was not found in the database for manual review/Suggestion
     */
    logSuggestion(letter: string, category: string, word: string): void {
        const suggestionPath = path.join(process.cwd(), 'server/data/suggestions.json');
        let suggestions: any[] = [];

        try {
            if (fs.existsSync(suggestionPath)) {
                const content = fs.readFileSync(suggestionPath, 'utf-8');
                if (content.trim()) {
                    try { suggestions = JSON.parse(content); } catch (e) { suggestions = []; }
                }
            }

            const normalizedWord = this.normalizeArabic(word);

            const existingIndex = suggestions.findIndex(s =>
                this.normalizeArabic(s.word) === normalizedWord &&
                s.category === category &&
                s.letter === letter
            );

            if (existingIndex >= 0) {
                suggestions[existingIndex].count++;
                suggestions[existingIndex].lastSeen = new Date().toISOString();
            } else {
                suggestions.push({
                    word: word,
                    normalized: normalizedWord,
                    letter,
                    category,
                    count: 1,
                    firstSeen: new Date().toISOString(),
                    lastSeen: new Date().toISOString()
                });
            }

            fs.writeFileSync(suggestionPath, JSON.stringify(suggestions, null, 2), 'utf-8');
        } catch (error) {
            console.error('[WildcardService] Failed to log suggestion:', error);
        }
    }
}
