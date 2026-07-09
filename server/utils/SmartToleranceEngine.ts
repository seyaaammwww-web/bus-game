import { AdvancedNormalizer } from './AdvancedNormalizer';

/**
 * Smart Tolerance Engine for Arabic Word Validation
 * Handles fuzzy matching, synonyms, and intelligent error tolerance
 */
export class SmartToleranceEngine {
    private static instance: SmartToleranceEngine;
    private normalizer: AdvancedNormalizer;

    // Extended synonyms for different categories
    private static readonly SYNONYMS: Record<string, Record<string, string[]>> = {
        'جماد': {
            // Transportation
            'سيارة': ['عربية', 'عربيه', 'سياره', 'أوتوموبيل', 'عربه'],
            'طائرة': ['طياره', 'طائره'],
            'دراجة': ['دراجه', 'بسكليتة', 'عجلة', 'عجله'],
            'قطار': ['قطر'],
            'باص': ['أتوبيس', 'اتوبيس', 'حافلة', 'حافله'],
            'مركب': ['قارب', 'سفينة', 'سفينه'],

            // Electronics
            'تلفاز': ['تلفزيون', 'تليفزيون', 'شاشة', 'شاشه'],
            'هاتف': ['تليفون', 'موبايل', 'جوال', 'محمول'],
            'حاسوب': ['كمبيوتر', 'حاسب', 'لابتوب'],
            'راديو': ['مذياع'],
            'ريموت': ['جهاز تحكم', 'ريموت كنترول'],

            // Furniture
            'كرسي': ['كرسى', 'مقعد'],
            'طاولة': ['طاوله', 'منضدة', 'منضده', 'ترابيزة', 'ترابيزه'],
            'سرير': ['فراش'],
            'خزانة': ['خزانه', 'دولاب'],
            'مكتب': ['ديسك'],
            'أريكة': ['اريكة', 'اريكه', 'كنبة', 'كنبه', 'صوفا'],

            // Kitchen
            'ثلاجة': ['ثلاجه', 'براد', 'تلاجة', 'تلاجه'],
            'فرن': ['موقد'],
            'طنجرة': ['طنجره', 'حلة', 'حله', 'قدر'],
            'صحن': ['طبق'],
            'كوب': ['كاس', 'كأس'],
            'ملعقة': ['ملعقه'],
            'شوكة': ['شوكه'],
            'سكين': ['سكينة', 'سكينه', 'موس'],

            // Household items
            'باب': ['ابواب'],
            'شباك': ['نافذة', 'نافذه', 'شبابيك'],
            'مرآة': ['مراة', 'مرايه', 'مراه', 'مرايا'],
            'مفتاح': ['مفاتيح'],
            'قفل': ['اقفال'],
            'مصباح': ['لمبة', 'لمبه', 'نور'],
            'مروحة': ['مروحه', 'مراوح'],
            'مكيف': ['تكييف'],
            'غسالة': ['غساله'],
            'مكنسة': ['مكنسه', 'مكانس'],

            // Stationery
            'كتاب': ['كتب'],
            'قلم': ['اقلام'],
            'دفتر': ['كراسة', 'كراسه', 'نوتة', 'نوته'],
            'ممحاة': ['ممحاه', 'استيكة', 'استيكه'],
            'مسطرة': ['مسطره'],
            'مقص': ['مقصات'],

            // Clothing
            'قميص': ['بلوزة', 'بلوزه'],
            'بنطلون': ['بنطال', 'سروال'],
            'فستان': ['جلابية', 'جلابيه'],
            'حذاء': ['جزمة', 'جزمه', 'شبشب'],
            'جورب': ['شراب'],
            'معطف': ['جاكت', 'جاكيت'],

            // Sports
            'كرة': ['كره', 'طابة', 'طابه'],
            'مضرب': ['مضارب'],

            // Tools
            'مطرقة': ['مطرقه', 'شاكوش'],
            'منشار': ['مناشير'],
            'مفك': ['مفكات'],
        },
        'حيوان': {
            // Mammals
            'أسد': ['اسد', 'سبع', 'ليث'],
            'نمر': ['فهد'],
            'كلب': ['كليب', 'جرو'],
            'قط': ['قطة', 'قطه', 'هر', 'هره', 'بس', 'بسة'],
            'حصان': ['فرس', 'جواد', 'حصن'],
            'جمل': ['ابل', 'جمال'],
            'حمار': ['حمير'],
            'بقرة': ['بقره', 'ابقار'],
            'خروف': ['كبش', 'نعجة', 'نعجه'],
            'ماعز': ['معزة', 'معزه', 'جدي'],
            'فيل': ['افيال'],
            'زرافة': ['زرافه'],
            'غزال': ['غزالة', 'غزاله'],
            'ارنب': ['أرنب'],
            'فأر': ['فار', 'جرذ'],

            // Birds
            'عصفور': ['عصافير'],
            'حمامة': ['حمامه', 'حمام'],
            'دجاجة': ['دجاجه', 'فرخة', 'فرخه'],
            'بطة': ['بطه'],
            'اوزة': ['أوزة', 'أوزه'],
            'نسر': ['نسور'],
            'صقر': ['صقور'],
            'ببغاء': ['ببغان'],

            // Reptiles & Amphibians
            'ثعبان': ['حية', 'حيه', 'افعى', 'أفعى'],
            'تمساح': ['تماسيح'],
            'سلحفاة': ['سلحفاه'],
            'ضفدع': ['ضفادع'],

            // Fish
            'سمكة': ['سمكه', 'سمك'],
            'قرش': ['قروش'],
            'حوت': ['حيتان'],

            // Insects
            'نملة': ['نمله', 'نمل'],
            'نحلة': ['نحله', 'نحل'],
            'ذبابة': ['ذبابه', 'ذباب'],
            'بعوضة': ['بعوضه', 'بعوض'],
            'فراشة': ['فراشه'],
            'عنكبوت': ['عناكب'],
        },
        'بلد': {  // Changed from 'بلاد'
            // Egypt
            'مصر': ['جمهورية مصر', 'ام الدنيا'],
            'القاهرة': ['قاهرة', 'قاهره', 'عاصمة مصر'],
            'الإسكندرية': ['اسكندرية', 'اسكندريه', 'اسكندرية'],
            'الجيزة': ['جيزة', 'جيزه'],
            'الأقصر': ['اقصر', 'طيبة', 'طيبه'],
            'أسوان': ['اسوان'],
            'أسيوط': ['اسيوط'],
            'المنصورة': ['منصورة', 'منصوره'],
            'طنطا': ['طنطه'],
            'الزقازيق': ['زقازيق'],
            'الإسماعيلية': ['اسماعيلية', 'اسماعيليه'],
            'بورسعيد': ['بور سعيد'],
            'السويس': ['سويس'],

            // Saudi Arabia
            'السعودية': ['السعوديه', 'المملكة العربية السعودية', 'السعوديه'],
            'الرياض': ['رياض'],
            'جدة': ['جده'],
            'مكة': ['مكه', 'مكة المكرمة'],
            'المدينة': ['المدينه', 'المدينة المنورة'],
            'الدمام': ['دمام'],
            'الطائف': ['طائف'],

            // UAE
            'الإمارات': ['الامارات', 'دولة الإمارات', 'الامارات العربية المتحدة'],
            'دبي': ['دبى'],
            'أبوظبي': ['ابوظبي', 'ابو ظبي'],
            'الشارقة': ['شارقة', 'شارقه'],
            'عجمان': ['عجمان'],

            // Other Arab countries
            'الأردن': ['اردن', 'المملكة الأردنية الهاشمية'],
            'عمان': ['عمان'],
            'الكويت': ['كويت'],
            'البحرين': ['بحرين'],
            'قطر': ['قطر'],
            'لبنان': ['لبنان'],
            'بيروت': ['بيروت'],
            'سوريا': ['سوريا', 'سوريه'],
            'دمشق': ['دمشق'],
            'العراق': ['عراق'],
            'بغداد': ['بغداد'],
            'فلسطين': ['فلسطين'],
            'القدس': ['قدس'],
            'المغرب': ['مغرب'],
            'الرباط': ['رباط'],
            'الجزائر': ['جزائر'],
            'تونس': ['تونس', 'تونس'],
            'ليبيا': ['ليبيا', 'ليبيه'],
            'السودان': ['سودان'],
            'الخرطوم': ['خرطوم'],
            'اليمن': ['يمن'],
            'صنعاء': ['صنعاء', 'صنعا'],
        },
        'ولد': {
            'محمد': ['محمود'],
            'أحمد': ['احمد'],
            'علي': ['على'],
            'حسن': ['حسين'],
            'عمر': ['عمرو'],
            'خالد': ['خالد'],
            'يوسف': ['يوسف'],
            'إبراهيم': ['ابراهيم'],
            'عبدالله': ['عبد الله'],
            'عبدالرحمن': ['عبد الرحمن'],
        },
        'بنت': {
            'فاطمة': ['فاطمه'],
            'عائشة': ['عائشه'],
            'خديجة': ['خديجه'],
            'مريم': ['مريام'],
            'زينب': ['زينب'],
            'سارة': ['ساره'],
            'نور': ['نور'],
            'ياسمين': ['ياسمين'],
        }
    };

    private constructor() {
        this.normalizer = AdvancedNormalizer.getInstance();
    }

    static getInstance(): SmartToleranceEngine {
        if (!SmartToleranceEngine.instance) {
            SmartToleranceEngine.instance = new SmartToleranceEngine();
        }
        return SmartToleranceEngine.instance;
    }

    /**
     * Check if two words match considering all tolerance rules
     */
    isMatch(word: string, dbWord: string, category?: string): boolean {
        const normDb = this.normalizer.normalize(dbWord);
        if (!normDb || normDb.length < 3) return false;

        // 1. Exact match after normalization
        if (this.normalizer.areEquivalent(word, dbWord)) {
            return true;
        }

        // 2. Match with article tolerance (ال)
        if (this.normalizer.areEquivalentWithArticle(word, dbWord)) {
            return true;
        }

        // 3. Common spelling variations
        if (this.normalizer.matchesCommonVariation(word, dbWord)) {
            return true;
        }

        // 4. Synonym check (if category provided)
        if (category && this.areSynonyms(word, dbWord, category)) {
            return true;
        }

        // 5. Fuzzy match for typos
        if (this.isFuzzyMatch(word, dbWord)) {
            return true;
        }

        // 6. Stemming match (Remove common suffixes)
        if (this.isStemMatch(word, dbWord)) {
            return true;
        }

        return false;
    }

    /**
     * Check if two words are synonyms in the given category
     */
    areSynonyms(word1: string, word2: string, category: string): boolean {
        const categorySynonyms = SmartToleranceEngine.SYNONYMS[category];
        if (!categorySynonyms) return false;

        const norm1 = this.normalizer.normalize(word1);
        const norm2 = this.normalizer.normalize(word2);

        for (const [canonical, synonyms] of Object.entries(categorySynonyms)) {
            const normCanonical = this.normalizer.normalize(canonical);
            const normSynonyms = synonyms.map(s => this.normalizer.normalize(s));

            const word1Matches = norm1 === normCanonical || normSynonyms.includes(norm1);
            const word2Matches = norm2 === normCanonical || normSynonyms.includes(norm2);

            if (word1Matches && word2Matches) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if two words match after removing common Arabic suffixes (ات، ون، ين، ه)
     */
    isStemMatch(word1: string, word2: string): boolean {
        const norm1 = this.normalizer.normalize(word1);
        const norm2 = this.normalizer.normalize(word2);
        if (norm1 === norm2) return false;

        const [shorter, longer] = norm1.length <= norm2.length ? [norm1, norm2] : [norm2, norm1];
        if (longer.length - shorter.length > 2 || shorter.length < 3) return false;

        // Plural / dual suffixes only — ة/ه variants are handled by the normalizer
        const pluralSuffixes = ['ات', 'ون', 'ين'];
        for (const suffix of pluralSuffixes) {
            if (!longer.endsWith(suffix) || longer.length < suffix.length + 3) continue;
            if (longer.slice(0, -suffix.length) === shorter) return true;
        }

        return false;
    }

    /**
     * Advanced fuzzy matching with smart rules
     */
    /** Pairs of letters that are spelling variants, not different words. */
    private static readonly EQUIVALENT_CHARS: string[][] = [
        ['ا', 'أ', 'إ', 'آ', 'ئ', 'ؤ', 'ء'],
        ['ه', 'ة'],
        ['ي', 'ى'],
        ['و', 'ؤ'],
    ];

    /** Sound-alike consonants common in Egyptian typos (not different words). */
    private static readonly PHONETIC_CHARS: string[][] = [
        ['ذ', 'ز', 'ظ'],
        ['ث', 'س', 'ص'],
        ['ق', 'ك'],
        ['ط', 'ت'],
        ['ض', 'د'],
    ];

    private areEquivalentChars(a: string, b: string): boolean {
        if (a === b) return true;
        if (SmartToleranceEngine.EQUIVALENT_CHARS.some(g => g.includes(a) && g.includes(b))) return true;
        return SmartToleranceEngine.PHONETIC_CHARS.some(g => g.includes(a) && g.includes(b));
    }

    /** Single-character spelling or phonetic typo between same-length words. */
    private isSingleCharTypo(norm1: string, norm2: string): boolean {
        if (norm1 === norm2) return true;
        if (norm1.length !== norm2.length) return false;
        if (this.levenshteinDistance(norm1, norm2, 1) !== 1) return false;

        for (let i = 0; i < norm1.length; i++) {
            if (norm1[i] !== norm2[i]) {
                return this.areEquivalentChars(norm1[i], norm2[i]);
            }
        }
        return false;
    }

    /**
     * Advanced fuzzy matching with smart rules (Phonetic + spelling-variant typos only)
     */
    isFuzzyMatch(word1: string, word2: string): boolean {
        const norm1 = this.normalizer.normalize(word1);
        const norm2 = this.normalizer.normalize(word2);

        if (Math.abs(norm1.length - norm2.length) > 2) return false;

        const skel1 = this.normalizer.getPhoneticSkeleton(word1);
        const skel2 = this.normalizer.getPhoneticSkeleton(word2);

        if (skel1 === skel2 && Math.abs(norm1.length - norm2.length) <= 1) {
            return this.isSingleCharTypo(norm1, norm2);
        }

        const maxLength = Math.max(norm1.length, norm2.length);
        if (maxLength <= 4) {
            return norm1 === norm2;
        }
        return this.isSingleCharTypo(norm1, norm2);
    }

    /**
     * Calculate Levenshtein distance between two strings
     * Optimized with single-row algorithm and early exits
     */
    private levenshteinDistance(str1: string, str2: string, maxDistance: number = 3): number {
        const len1 = str1.length;
        const len2 = str2.length;

        // Early exit if length difference exceeds max distance
        if (Math.abs(len1 - len2) > maxDistance) return maxDistance + 1;

        // Use single-row optimization (O(n) space instead of O(n²))
        let prevRow = Array(len1 + 1).fill(0).map((_, i) => i);

        for (let j = 1; j <= len2; j++) {
            let currRow = [j];
            for (let i = 1; i <= len1; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                currRow[i] = Math.min(
                    prevRow[i] + 1,      // deletion
                    currRow[i - 1] + 1,  // insertion
                    prevRow[i - 1] + cost // substitution
                );
            }

            // Early exit if all values exceed max distance
            if (Math.min(...currRow) > maxDistance) return maxDistance + 1;

            prevRow = currRow;
        }

        return prevRow[len1];
    }

    /**
     * Get all possible matches for a word in a list
     */
    findMatches(word: string, wordList: string[], category?: string): string[] {
        const matches: string[] = [];

        for (const dbWord of wordList) {
            if (this.isMatch(word, dbWord, category)) {
                matches.push(dbWord);
            }
        }

        return matches;
    }

    /**
     * Check if word starts with the given letter (with all tolerance rules)
     */
    startsWithLetter(word: string, letter: string): boolean {
        return this.normalizer.startsWithLetter(word, letter);
    }

    /**
     * Get similarity score between two words (0-100)
     */
    getSimilarityScore(word1: string, word2: string): number {
        const norm1 = this.normalizer.normalize(word1);
        const norm2 = this.normalizer.normalize(word2);

        if (norm1 === norm2) return 100;

        const maxLen = Math.max(norm1.length, norm2.length);
        if (maxLen === 0) return 0;

        const distance = this.levenshteinDistance(norm1, norm2);
        return Math.round(((maxLen - distance) / maxLen) * 100);
    }

    /**
     * Add custom synonym for a category
     */
    addSynonym(category: string, canonical: string, synonym: string): void {
        if (!SmartToleranceEngine.SYNONYMS[category]) {
            SmartToleranceEngine.SYNONYMS[category] = {};
        }

        const normCanonical = this.normalizer.normalize(canonical);

        if (!SmartToleranceEngine.SYNONYMS[category][normCanonical]) {
            SmartToleranceEngine.SYNONYMS[category][normCanonical] = [];
        }

        const normSynonym = this.normalizer.normalize(synonym);
        if (!SmartToleranceEngine.SYNONYMS[category][normCanonical].includes(normSynonym)) {
            SmartToleranceEngine.SYNONYMS[category][normCanonical].push(normSynonym);
        }
    }
}
