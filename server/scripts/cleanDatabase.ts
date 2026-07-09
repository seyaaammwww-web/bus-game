
import * as fs from 'fs';
import * as path from 'path';
import { AdvancedNormalizer } from '../utils/AdvancedNormalizer';
import { arabicWords, availableLetters } from '../../shared/arabicWords';

interface WildcardDatabase {
    [letter: string]: {
        [category: string]: string[];
    };
}

const VALID_CATEGORIES = new Set(['ولد', 'بنت', 'بلد', 'حيوان', 'جماد']);
const CANONICAL_LETTERS = new Set(availableLetters);

/** Names that legitimately double as animal/place/object answers. */
const NAME_HOMONYMS = new Set([
    'أسد', 'اسد', 'فهد', 'نمر', 'نور', 'ياسمين', 'سحر', 'غزال', 'غزالة',
    'يمن', 'عمان', 'سعد', 'فرح', 'امل', 'أمل', 'امل', 'رعد', 'بدر', 'قمر',
    'نجم', 'نهاد', 'وليد', 'سعاد', 'هناء', 'منى', 'هدى', 'رنا', 'دعاء',
]);

// Curated 2-char words that are legitimate answers (matched exact-only at runtime)
const SHORT_WORD_WHITELIST = new Set(['دب', 'قط', 'بط', 'ضب', 'طه', 'مي', 'رف', 'زر']);

const CONFIG = {
    minLength: 3,
    maxLength: 15,
    blacklists: {
        'ولد': ['السيد', 'الطيب', 'الكبير', 'الصغير', 'ابو', 'أبو'],
        'بنت': ['السيدة', 'الحسناء', 'الجميلة', 'الست', 'ام', 'أم'],
        'بلد': ['المملكة', 'جمهورية', 'ولاية', 'إقليم', 'محافظة', 'قرية'],
        'حيوان': ['البحر', 'البر', 'الجبل', 'الصحراوي', 'النهري'],
        'جماد': ['الكهربائي', 'المنزلي', 'الحديث', 'الصغير', 'الكبير']
    },
    compoundPrefixes: ['أبو', 'أم', 'ابن', 'بنت', 'ذو', 'ذي', 'ال', 'وال', 'عبد'],
    sportsPatterns: /متر|كيلو|ياردة|سباحة|حواجز|اندفاع|bob|relay|sprint/i,
};

const normalizer = AdvancedNormalizer.getInstance();

function resolveCanonicalLetter(key: string): string | null {
    if (CANONICAL_LETTERS.has(key)) return key;
    const norm = normalizer.normalize(key);
    for (const letter of availableLetters) {
        if (normalizer.normalize(letter) === norm) return letter;
    }
    return null;
}

function normalizeArabic(text: string): string {
    return text
        .trim()
        .replace(/[^\u0600-\u06FF\s]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة$/g, 'ه')
        .replace(/ى$/g, 'ي');
}

function startsWithLetter(word: string, letter: string): boolean {
    const normWord = normalizer.normalize(word);
    const normLetter = normalizer.normalize(letter);
    if (normWord.startsWith(normLetter)) return true;
    if (normWord.startsWith('ال' + normLetter)) return true;
    return false;
}

function isComplexWord(word: string): boolean {
    if (SHORT_WORD_WHITELIST.has(word.trim())) return false;
    if (/[\s،\-_/]/.test(word)) return true;
    if (word.length > CONFIG.maxLength || word.length < CONFIG.minLength) return true;
    if (/\d/.test(word)) return true;
    if (!/^[\u0600-\u06FF]+$/.test(word)) return true;
    if (CONFIG.sportsPatterns.test(word)) return true;

    for (const prefix of CONFIG.compoundPrefixes) {
        if (word.startsWith(prefix) && word.length > prefix.length + 3) {
            if (prefix === 'ال' || prefix === 'وال') continue;
            return true;
        }
    }

    return false;
}

function isBlacklisted(word: string, category: string): boolean {
    const list = CONFIG.blacklists[category as keyof typeof CONFIG.blacklists];
    if (!list) return false;
    return list.some(bad => word.includes(bad));
}

function isHomonymName(word: string): boolean {
    const norm = normalizeArabic(word);
    for (const name of NAME_HOMONYMS) {
        if (normalizeArabic(name) === norm) return true;
    }
    return false;
}

/** Remove words from name categories when they clearly belong elsewhere. */
function dedupeCrossCategory(cleanDb: WildcardDatabase): number {
    let removed = 0;
    const cats = ['ولد', 'بنت', 'بلد', 'حيوان', 'جماد'] as const;

    for (const letter of Object.keys(cleanDb)) {
        const bucket = cleanDb[letter];
        if (!bucket) continue;

        const byNorm = new Map<string, Set<string>>();
        for (const cat of cats) {
            for (const word of bucket[cat] || []) {
                const norm = normalizeArabic(word);
                if (!byNorm.has(norm)) byNorm.set(norm, new Set());
                byNorm.get(norm)!.add(cat);
            }
        }

        for (const [norm, presentCats] of byNorm) {
            if (presentCats.size < 2) continue;

            const word = (bucket['ولد'] || []).find(w => normalizeArabic(w) === norm)
                || (bucket['بنت'] || []).find(w => normalizeArabic(w) === norm)
                || (bucket['حيوان'] || []).find(w => normalizeArabic(w) === norm)
                || (bucket['جماد'] || []).find(w => normalizeArabic(w) === norm)
                || (bucket['بلد'] || []).find(w => normalizeArabic(w) === norm)
                || norm;

            if (isHomonymName(word)) continue;

            const removeFrom: string[] = [];
            if (presentCats.has('حيوان') && (presentCats.has('ولد') || presentCats.has('بنت'))) {
                removeFrom.push('ولد', 'بنت');
            }
            if (presentCats.has('جماد') && (presentCats.has('ولد') || presentCats.has('بنت'))) {
                removeFrom.push('ولد', 'بنت');
            }
            if (presentCats.has('حيوان') && presentCats.has('جماد')) {
                removeFrom.push('جماد');
            }
            if (presentCats.has('حيوان') && presentCats.has('بلد')) {
                removeFrom.push('حيوان');
            }
            if (presentCats.has('بلد')) {
                for (const cat of ['ولد', 'بنت', 'حيوان', 'جماد']) {
                    if (presentCats.has(cat)) removeFrom.push(cat);
                }
            }

            for (const cat of [...new Set(removeFrom)]) {
                if (!bucket[cat]) continue;
                const before = bucket[cat].length;
                bucket[cat] = bucket[cat].filter(w => normalizeArabic(w) !== norm);
                removed += before - bucket[cat].length;
                if (bucket[cat].length === 0) delete bucket[cat];
            }
        }
    }

    return removed;
}

function cleanDatabase() {
    const dataDir = path.join(process.cwd(), 'server', 'data');
    const inputCandidates = [
        path.join(dataDir, 'wildcardDatabase.json'),
        path.join(dataDir, 'clean_wildcardDatabase.json'),
    ];
    const outputPath = path.join(dataDir, 'clean_wildcardDatabase.json');
    const backupPath = path.join(dataDir, 'clean_wildcardDatabase.json.bak');

    let inputPath = '';
    for (const candidate of inputCandidates) {
        if (fs.existsSync(candidate)) {
            inputPath = candidate;
            break;
        }
    }

    if (!inputPath) {
        console.error('No database file found!');
        return;
    }

    console.log(`Reading from ${inputPath}...`);

    if (fs.existsSync(outputPath) && !fs.existsSync(backupPath)) {
        fs.copyFileSync(outputPath, backupPath);
        console.log(`Backup created at ${backupPath}`);
    }

    const db: WildcardDatabase = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    const cleanDb: WildcardDatabase = {};

    let totalOriginal = 0;
    let totalClean = 0;
    let droppedKeys = 0;
    let mergedKeys = 0;

    for (const letter of Object.keys(db)) {
        const canonical = resolveCanonicalLetter(letter);
        if (!canonical) {
            droppedKeys++;
            continue;
        }
        if (letter !== canonical) mergedKeys++;

        if (!cleanDb[canonical]) cleanDb[canonical] = {};

        for (const category of Object.keys(db[letter])) {
            if (!VALID_CATEGORIES.has(category)) continue;

            const words = db[letter][category];
            if (!cleanDb[canonical][category]) cleanDb[canonical][category] = [];
            const seenNormalized = new Set(
                cleanDb[canonical][category].map(w => normalizeArabic(w))
            );

            for (const word of words) {
                totalOriginal++;
                const processedWord = word.trim();

                if (isComplexWord(processedWord)) continue;
                if (isBlacklisted(processedWord, category)) continue;
                if (!startsWithLetter(processedWord, canonical)) continue;

                const normKey = normalizeArabic(processedWord);
                if (seenNormalized.has(normKey)) continue;
                seenNormalized.add(normKey);
                cleanDb[canonical][category].push(processedWord);
                totalClean++;
            }

            if (cleanDb[canonical][category].length > 0) {
                cleanDb[canonical][category].sort();
            } else {
                delete cleanDb[canonical][category];
            }
        }

        if (Object.keys(cleanDb[canonical]).length === 0) {
            delete cleanDb[canonical];
        }
    }

    const crossRemoved = dedupeCrossCategory(cleanDb);

    // Ensure every game letter has a bucket (supplement from core arabicWords)
    for (const letter of availableLetters) {
        if (!cleanDb[letter]) cleanDb[letter] = {};
        const core = arabicWords[letter];
        if (!core) continue;
        for (const [category, words] of Object.entries(core)) {
            if (!VALID_CATEGORIES.has(category)) continue;
            if (!cleanDb[letter][category]) cleanDb[letter][category] = [];
            const seen = new Set(cleanDb[letter][category].map(w => normalizeArabic(w)));
            for (const word of words) {
                const norm = normalizeArabic(word);
                if (!seen.has(norm) && startsWithLetter(word, letter)) {
                    seen.add(norm);
                    cleanDb[letter][category].push(word);
                    totalClean++;
                }
            }
            cleanDb[letter][category].sort();
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(cleanDb, null, 2), 'utf-8');

    console.log('--------------------------------------------------');
    console.log('Cleaning Complete.');
    console.log(`Dropped non-game keys: ${droppedKeys}`);
    console.log(`Merged alias keys (e.g. ا→أ): ${mergedKeys}`);
    console.log(`Canonical letter keys: ${Object.keys(cleanDb).length}`);
    console.log(`Total Words Processed: ${totalOriginal}`);
    console.log(`Total Words Retained:  ${totalClean}`);
    console.log(`Cross-category removed: ${crossRemoved}`);
    console.log(`Removed:               ${totalOriginal - totalClean}`);
    console.log(`Saved to: ${outputPath}`);
    console.log('--------------------------------------------------');
}

cleanDatabase();
