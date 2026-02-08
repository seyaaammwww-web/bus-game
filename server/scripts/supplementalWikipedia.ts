
import * as fs from 'fs';
import * as path from 'path';

// --- Types ---
interface WildcardDatabase {
    [letter: string]: {
        [category: string]: string[];
    };
}

const DB_PATH = path.join(process.cwd(), 'server/data/clean_wildcardDatabase.json');

// --- Normalizer ---
function normalizeArabic(text: string): string {
    if (!text) return '';
    let normalized = text.trim();
    normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');
    normalized = normalized.replace(/[أإآٱ]/g, 'ا');
    normalized = normalized.replace(/ة/g, 'ه');
    normalized = normalized.replace(/ى/g, 'ي');
    normalized = normalized.replace(/[ءؤئ]/g, 'ا');
    normalized = normalized.replace(/[^\u0600-\u06FF\s]/g, '');
    return normalized;
}

function isValidWord(word: string): boolean {
    if (!word) return false;
    if (word.length < 2 || word.length > 30) return false;

    // Wiki noise
    if (word.startsWith('قائمة')) return false;
    if (word.startsWith('تصنيف')) return false;
    if (word.startsWith('فهرس')) return false;
    if (word.startsWith('بوابة')) return false;
    if (word.startsWith('مشروع')) return false;
    if (word.startsWith('قالب')) return false;
    if (word.includes('(')) return false;
    if (word.includes(':')) return false;

    return true;
}

// --- Fetcher ---

async function fetchWikipedia(categoryName: string): Promise<string[]> {
    console.log(`Fetching Wikipedia: ${categoryName}...`);
    const results: string[] = [];
    let continueToken: string | null = null;
    const baseUrl = 'https://ar.wikipedia.org/w/api.php';

    try {
        do {
            const params = new URLSearchParams({
                action: 'query',
                list: 'categorymembers',
                cmtitle: categoryName,
                format: 'json',
                cmlimit: '500',
                origin: '*'
            });
            if (continueToken) params.append('cmcontinue', continueToken);

            const res = await fetch(`${baseUrl}?${params.toString()}`);
            const data: any = await res.json();

            if (data.query && data.query.categorymembers) {
                const titles = data.query.categorymembers.map((m: any) => m.title);
                results.push(...titles);
            }

            continueToken = data.continue ? data.continue.cmcontinue : null;
            await new Promise(r => setTimeout(r, 200));

        } while (continueToken && results.length < 2000);

        console.log(`✅ Wikipedia: Found ${results.length} items.`);
        return results;
    } catch (e) {
        console.error(`❌ Wikipedia Failed:`, e);
        return [];
    }
}

// --- Config ---

const WIKIPEDIA_CATEGORIES = [
    // --- PLANTS ---
    { category: 'نبات', wikiCategory: 'تصنيف:زهور' },
    { category: 'نبات', wikiCategory: 'تصنيف:أعشاب' },
    { category: 'نبات', wikiCategory: 'تصنيف:حبوب' },
    { category: 'نبات', wikiCategory: 'تصنيف:بقوليات' },
    { category: 'نبات', wikiCategory: 'تصنيف:نباتات_طبية' },
    { category: 'نبات', wikiCategory: 'تصنيف:توابل' },
    { category: 'نبات', wikiCategory: 'تصنيف:نباتات_زينة' },

    // --- INANIMATE ---
    { category: 'جماد', wikiCategory: 'تصنيف:آلات' },
    { category: 'جماد', wikiCategory: 'تصنيف:معدات' },
    { category: 'جماد', wikiCategory: 'تصنيف:أدوات_مطبخ' },
    { category: 'جماد', wikiCategory: 'تصنيف:أجهزة_كهربائية' },
    { category: 'جماد', wikiCategory: 'تصنيف:أثاث_منزلي' },
    { category: 'جماد', wikiCategory: 'تصنيف:مواد_بناء' },
    { category: 'جماد', wikiCategory: 'تصنيف:ألعاب' },
    { category: 'جماد', wikiCategory: 'تصنيف:آلات_موسيقية' },

    // --- FOOD ---
    { category: 'أكل', wikiCategory: 'تصنيف:حلويات' },
    { category: 'أكل', wikiCategory: 'تصنيف:مشروبات' },
    { category: 'أكل', wikiCategory: 'تصنيف:أطباق_مصرية' },
    { category: 'أكل', wikiCategory: 'تصنيف:أطباق_شامية' },
    { category: 'أكل', wikiCategory: 'تصنيف:فطائر' },
    { category: 'أكل', wikiCategory: 'تصنيف:جبن' },

    // --- JOBS ---
    { category: 'مهنة', wikiCategory: 'تصنيف:مهن_صحية' },
    { category: 'مهنة', wikiCategory: 'تصنيف:مهن_هندسية' },
    { category: 'مهنة', wikiCategory: 'تصنيف:مهن_قانونية' },
    { category: 'مهنة', wikiCategory: 'تصنيف:مهن_تعليمية' },
    { category: 'مهنة', wikiCategory: 'تصنيف:مهن_فنية' },

    // --- SPORTS ---
    { category: 'رياضة', wikiCategory: 'تصنيف:رياضات_أولمبية' },
    { category: 'رياضة', wikiCategory: 'تصنيف:رياضات_جماعية' },
    { category: 'رياضة', wikiCategory: 'تصنيف:فنون_قتالية' },

    // --- CITIES (Specific Regions) ---
    { category: 'بلد', wikiCategory: 'تصنيف:مدن_مصر' },
    { category: 'بلد', wikiCategory: 'تصنيف:محافظات_مصر' },
    { category: 'بلد', wikiCategory: 'تصنيف:مدن_السعودية' },
    { category: 'بلد', wikiCategory: 'تصنيف:مدن_الإمارات' },
    { category: 'بلد', wikiCategory: 'تصنيف:مدن_المغرب' },
    { category: 'بلد', wikiCategory: 'تصنيف:مدن_الجزائر' },
    { category: 'بلد', wikiCategory: 'تصنيف:مدن_تونس' },
    { category: 'بلد', wikiCategory: 'تصنيف:مدن_سوريا' }
];

async function main() {
    console.log('--- Supplemental Wikipedia Expansion ---');

    let database: WildcardDatabase = {};
    if (fs.existsSync(DB_PATH)) {
        database = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }

    let addedCount = 0;

    for (const source of WIKIPEDIA_CATEGORIES) {
        const words = await fetchWikipedia(source.wikiCategory);
        addedCount += processWords(words, source.category, database);
    }

    // Save
    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2), 'utf-8');

    console.log('--------------------------------');
    console.log(`Supplemental Expansion Complete.`);
    console.log(`Added ${addedCount} (approx) new words.`);
}

function processWords(rawWords: string[], category: string, database: WildcardDatabase): number {
    let added = 0;
    for (const raw of rawWords) {
        let word = raw;
        if (word.includes('(')) word = word.split('(')[0];
        // Split by punctuation
        const parts = word.split(/[،\/,]/);

        for (let p of parts) {
            p = p.trim();
            if (!isValidWord(p)) continue;

            const firstLetter = normalizeArabic(p.charAt(0));
            if (!firstLetter) continue;

            if (!database[firstLetter]) database[firstLetter] = {};
            if (!database[firstLetter][category]) database[firstLetter][category] = [];

            const list = database[firstLetter][category];
            const normalizedItem = normalizeArabic(p);

            // Check against existing (normalized)
            if (!list.some(existing => normalizeArabic(existing) === normalizedItem)) {
                list.push(p);
                added++;
            }
        }
    }
    return added;
}

main().catch(console.error);
