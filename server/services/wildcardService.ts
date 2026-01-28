import * as fs from 'fs';
import * as path from 'path';
import { arabicWords } from '../../shared/arabicWords';


interface WildcardDatabase {
    [letter: string]: {
        [category: string]: string[];
    };
}

/**
 * Service to provide wildcard answers from pre-built database
 * Fast, reliable, and no AI dependency
 */
export class WildcardService {
    private static instance: WildcardService;
    private database: WildcardDatabase = {};
    private usedAnswers = new Map<string, Set<string>>(); // Track used answers per letter+category

    private constructor() {
        this.loadDatabase();
    }

    static getInstance(): WildcardService {
        if (!WildcardService.instance) {
            WildcardService.instance = new WildcardService();
        }
        return WildcardService.instance;
    }

    private loadDatabase(): void {
        try {
            // Try explicit path from root (robust for both dev and prod if CWD is root)
            const dbPath = path.join(process.cwd(), 'server/data/wildcardDatabase.json');

            if (fs.existsSync(dbPath)) {
                const data = fs.readFileSync(dbPath, 'utf-8');
                this.database = JSON.parse(data);

                const totalAnswers = Object.keys(this.database).reduce((sum, letter) => {
                    return sum + Object.keys(this.database[letter]).reduce((catSum, cat) => {
                        return catSum + this.database[letter][cat].length;
                    }, 0);
                }, 0);

                console.log(`✅ Wildcard Database loaded from JSON: ${totalAnswers} words`);
            } else {
                throw new Error("JSON not found");
            }
        } catch (error) {
            console.warn('⚠️ Wildcard Database JSON missing or invalid. Using built-in fallback.');
            // Fallback: Use shared/arabicWords
            // We need to match the structure: Record<string, Record<string, string[]>>
            // arabicWords matches this structure.
            this.database = arabicWords;
        }
    }

    /**
     * Get wildcard answers for given categories and letter
     * Returns one random answer per category (never repeats same answer)
     */
    getAnswers(letter: string, categories: string[]): Record<string, string> | null {
        const letterData = this.database[letter];

        if (!letterData) {
            console.error(`[Wildcard] No data for letter: ${letter}`);
            return null;
        }

        const answers: Record<string, string> = {};

        for (const category of categories) {
            const categoryAnswers = letterData[category];

            if (!categoryAnswers || categoryAnswers.length === 0) {
                console.error(`[Wildcard] No answers for ${letter}:${category}`);
                return null;
            }

            // Track used answers
            const usedKey = `${letter}:${category}`;
            if (!this.usedAnswers.has(usedKey)) {
                this.usedAnswers.set(usedKey, new Set());
            }

            const used = this.usedAnswers.get(usedKey)!;

            // Find unused answer
            let availableAnswers = categoryAnswers.filter(ans => !used.has(ans));

            // Reset if all used
            if (availableAnswers.length === 0) {
                used.clear();
                availableAnswers = categoryAnswers;
            }

            // Pick random
            const randomAnswer = availableAnswers[Math.floor(Math.random() * availableAnswers.length)];
            used.add(randomAnswer);

            answers[category] = randomAnswer;
        }

        console.log(`[Wildcard DB] Generated for ${letter}:`, answers);
        return answers;
    }

    /**
     * Validate a word against the database
     */
    validateWord(letter: string, category: string, word: string): boolean {
        if (!word || !this.database[letter]) return false;

        const categoryAnswers = this.database[letter][category];
        if (!categoryAnswers) return false;

        const normalizedInput = this.normalizeArabic(word);

        // Exact match or normalized match
        return categoryAnswers.some(answer =>
            this.normalizeArabic(answer) === normalizedInput
        );
    }

    private normalizeArabic(text: string): string {
        try {
            return text
                .trim()
                .toLowerCase() // In case of English
                .replace(/[أإآ]/g, 'ا')
                .replace(/ة/g, 'ه')
                .replace(/ى/g, 'ي')
                .replace(/[\u064B-\u065F]/g, ''); // Remove tashkeel
        } catch (e) {
            return text;
        }
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
            averagePerCategory: categoryCount > 0 ? Math.floor(totalAnswers / (letterCount * categoryCount)) : 0
        };
    }

    /**
     * Add a new word to the database and persist it to disk
     */
    addWord(letter: string, category: string, word: string): boolean {
        if (!this.database[letter]) {
            this.database[letter] = {};
        }
        if (!this.database[letter][category]) {
            this.database[letter][category] = [];
        }

        const normalizedWord = this.normalizeArabic(word);

        // Check if already exists to avoid duplicates
        const exists = this.database[letter][category].some(w =>
            this.normalizeArabic(w) === normalizedWord
        );

        if (exists) return false;

        this.database[letter][category].push(word);

        // Persist to disk
        try {
            const dbPath = path.join(process.cwd(), 'server/data/wildcardDatabase.json');
            fs.writeFileSync(dbPath, JSON.stringify(this.database, null, 2), 'utf-8');
            console.log(`[Wildcard DB] Added new word: ${word} to ${letter}:${category}`);
            return true;
        } catch (error) {
            console.error('[Wildcard DB] Failed to save database:', error);
            return false;
        }
    }
}
