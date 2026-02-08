/**
 * Advanced Arabic Text Normalizer
 * Handles all edge cases for Arabic text normalization
 */
export class AdvancedNormalizer {
    private static instance: AdvancedNormalizer;

    // Common spelling variations and their canonical forms
    private static readonly COMMON_VARIATIONS: Record<string, string[]> = {
        'يحيى': ['يحيي', 'يحي'],
        'محمد': ['محمود'],
        'عيسى': ['عيسي'],
        'موسى': ['موسي'],
        'مصطفى': ['مصطفي'],
        'سلمى': ['سلمي'],
        'ليلى': ['ليلي'],
        'منى': ['مني'],
        'هدى': ['هدي'],
        'نجوى': ['نجوي'],
    };

    private constructor() { }

    static getInstance(): AdvancedNormalizer {
        if (!AdvancedNormalizer.instance) {
            AdvancedNormalizer.instance = new AdvancedNormalizer();
        }
        return AdvancedNormalizer.instance;
    }

    /**
     * Comprehensive Arabic text normalization
     */
    normalize(text: string): string {
        if (!text) return '';

        let normalized = text.trim().toLowerCase();

        // 1. Remove all diacritics (tashkeel)
        normalized = this.removeDiacritics(normalized);

        // 2. Normalize all forms of Alef
        normalized = this.normalizeAlef(normalized);

        // 3. Normalize Taa Marbuta and Haa
        normalized = this.normalizeTaaHaa(normalized);

        // 4. Normalize Yaa and Alef Maqsura
        normalized = this.normalizeYaa(normalized);

        // 5. Normalize Hamza
        normalized = this.normalizeHamza(normalized);

        // 6. Remove non-Arabic characters (keep spaces)
        normalized = normalized.replace(/[^\u0600-\u06FF\s]/g, '');

        // 7. Normalize spaces
        normalized = normalized.replace(/\s+/g, ' ').trim();

        return normalized;
    }

    /**
     * Remove all Arabic diacritics (tashkeel)
     */
    private removeDiacritics(text: string): string {
        return text.replace(/[\u064B-\u065F\u0670]/g, '');
    }

    /**
     * Normalize all forms of Alef to simple Alef
     * أ إ آ ٱ → ا
     */
    private normalizeAlef(text: string): string {
        return text.replace(/[أإآٱ]/g, 'ا');
    }

    /**
     * Normalize Taa Marbuta to Haa
     * ة → ه
     */
    private normalizeTaaHaa(text: string): string {
        return text.replace(/ة/g, 'ه');
    }

    /**
     * Normalize Yaa and Alef Maqsura
     * ى → ي
     */
    private normalizeYaa(text: string): string {
        return text.replace(/ى/g, 'ي');
    }

    /**
     * Normalize all forms of Hamza
     * ء ؤ ئ → ا
     */
    private normalizeHamza(text: string): string {
        return text.replace(/[ءؤئ]/g, 'ا');
    }

    /**
     * Remove "ال" (Al-) prefix if present
     */
    removeArticle(text: string): string {
        const normalized = this.normalize(text);
        if (normalized.startsWith('ال') && normalized.length > 2) {
            return normalized.substring(2);
        }
        return normalized;
    }

    /**
     * Check if two words are equivalent after normalization
     */
    areEquivalent(word1: string, word2: string): boolean {
        const norm1 = this.normalize(word1);
        const norm2 = this.normalize(word2);
        return norm1 === norm2;
    }

    /**
     * Check if two words are equivalent considering "ال" prefix
     * Examples: "الجزائر" ↔ "جزائر", "المغرب" ↔ "مغرب"
     */
    areEquivalentWithArticle(word1: string, word2: string): boolean {
        const norm1 = this.normalize(word1);
        const norm2 = this.normalize(word2);

        // Direct match
        if (norm1 === norm2) return true;

        // Check with/without article
        const word1WithoutArticle = this.removeArticle(word1);
        const word2WithoutArticle = this.removeArticle(word2);

        return (
            norm1 === word2WithoutArticle ||
            norm2 === word1WithoutArticle ||
            word1WithoutArticle === word2WithoutArticle
        );
    }

    /**
     * Check if word matches any common spelling variation
     */
    matchesCommonVariation(word: string, dbWord: string): boolean {
        const normWord = this.normalize(word);
        const normDbWord = this.normalize(dbWord);

        // Check if they're already equal
        if (normWord === normDbWord) return true;

        // Check all common variations
        for (const [canonical, variations] of Object.entries(AdvancedNormalizer.COMMON_VARIATIONS)) {
            const normCanonical = this.normalize(canonical);
            const normVariations = variations.map(v => this.normalize(v));

            // Check if word and dbWord are variations of the same canonical form
            const wordIsVariant = normWord === normCanonical || normVariations.includes(normWord);
            const dbWordIsVariant = normDbWord === normCanonical || normVariations.includes(normDbWord);

            if (wordIsVariant && dbWordIsVariant) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get all possible normalized forms of a word
     * (with/without article, common variations)
     */
    getAllNormalizedForms(word: string): string[] {
        const forms = new Set<string>();

        // Add base normalized form
        const normalized = this.normalize(word);
        forms.add(normalized);

        // Add form without article
        const withoutArticle = this.removeArticle(word);
        if (withoutArticle !== normalized) {
            forms.add(withoutArticle);
        }

        // Add form with article if it doesn't have one
        if (!normalized.startsWith('ال')) {
            forms.add('ال' + normalized);
        }

        // Add common variations
        for (const [canonical, variations] of Object.entries(AdvancedNormalizer.COMMON_VARIATIONS)) {
            const normCanonical = this.normalize(canonical);
            if (normalized === normCanonical) {
                variations.forEach(v => forms.add(this.normalize(v)));
            }
            variations.forEach(v => {
                if (this.normalize(v) === normalized) {
                    forms.add(normCanonical);
                    variations.forEach(other => forms.add(this.normalize(other)));
                }
            });
        }

        return Array.from(forms);
    }

    /**
     * Check if word starts with the given letter (considering normalization and article)
     */
    startsWithLetter(word: string, letter: string): boolean {
        const normWord = this.normalize(word);
        const normLetter = this.normalize(letter);

        if (!normWord || !normLetter) return false;

        const firstChar = normLetter.charAt(0);

        // Direct check
        if (normWord.charAt(0) === firstChar) return true;

        // Check after removing "ال" prefix
        if (normWord.startsWith('ال') && normWord.length > 2) {
            return normWord.charAt(2) === firstChar;
        }

        return false;
    }
    /**
     * Generate a "Phonetic Skeleton" for the word based on Egyptian Arabic pronunciation.
     * This maps sound-alike letters to a single representative character.
     */
    getPhoneticSkeleton(word: string): string {
        let normalized = this.normalize(word);

        // Map of substitutions for Egyptian Dialect
        // Order matters for some overlapping cases
        return normalized
            .replace(/[أإآاىةه]/g, 'A') // All vowels/silent ends -> A
            .replace(/[ي]/g, 'Y')       // Yaa -> Y
            .replace(/[قك]/g, 'K')      // Qaf/Kaf -> K (often swapped in dialect)
            .replace(/[ذزظ]/g, 'Z')     // Dhal/Zay/Zah -> Z
            .replace(/[ثسص]/g, 'S')     // Tha/Seen/Sad -> S
            .replace(/[طت]/g, 'T')      // Tah/Taa -> T
            .replace(/[ضد]/g, 'D')      // Dad/Dal -> D
            .replace(/[جغ]/g, 'G')      // Jeem/Ghain -> G (approximate, often Jeem is G in Egypt)
            .replace(/\s+/g, '')        // Remove spaces for skeleton
            .toUpperCase();
    }
}
