
import * as fs from 'fs';
import * as path from 'path';

// --- Types ---
interface WildcardDatabase {
    [letter: string]: {
        [category: string]: string[];
    };
}

// --- Configuration ---
const DB_PATH = path.join(process.cwd(), 'server/data/clean_wildcardDatabase.json');

const SOURCES = [
    // 1. GitHub Raw Lists (High Quality Names)
    {
        type: 'github_text',
        url: 'https://raw.githubusercontent.com/arabic-names/arabic-names-list/master/boys.txt',
        category: 'ولد'
    },
    {
        type: 'github_text',
        url: 'https://raw.githubusercontent.com/arabic-names/arabic-names-list/master/girls.txt',
        category: 'بنت'
    },
    // 2. Wikipedia Categories
    {
        type: 'wikipedia_category',
        categoryName: 'تصنيف:أسماء_ذكور_عربية',
        targetCategory: 'ولد'
    },
    {
        type: 'wikipedia_category',
        categoryName: 'تصنيف:أسماء_إناث_عربية',
        targetCategory: 'بنت'
    },
    {
        type: 'wikipedia_category',
        categoryName: 'تصنيف:دول_العالم', // Countries
        targetCategory: 'بلد'
    },
    {
        type: 'wikipedia_category',
        categoryName: 'تصنيف:عواصم', // Capitals (Good for Balad)
        targetCategory: 'بلد'
    },
    {
        type: 'wikipedia_category',
        categoryName: 'تصنيف:حيوانات',
        targetCategory: 'حيوان'
    },
    {
        type: 'wikipedia_category',
        categoryName: 'تصنيف:ثدييات', // Mammals
        targetCategory: 'حيوان'
    },
    {
        type: 'wikipedia_category',
        categoryName: 'تصنيف:طيور', // Birds
        targetCategory: 'حيوان'
    },
    {
        type: 'wikipedia_category',
        categoryName: 'تصنيف:أدوات', // Tools/Objects
        targetCategory: 'جماد'
    },
    {
        type: 'wikipedia_category',
        categoryName: 'تصنيف:أثاث', // Furniture
        targetCategory: 'جماد'
    },
    {
        type: 'wikipedia_category',
        categoryName: 'تصنيف:أجهزة_منزلية', // Home appliances
        targetCategory: 'جماد'
    }
];

// --- Helpers ---

// Normalize standard (same as cleanDatabase)
function normalizeArabic(text: string): string {
    return text
        .trim()
        .replace(/[^\u0600-\u06FF\s]/g, '') // Keep only Arabic and spaces
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة$/g, 'ه')
        .replace(/ى$/g, 'ي');
}

function isValidWord(word: string): boolean {
    // 1. Remove compound words (spaces) -> Strict for game
    if (word.includes(' ')) return false;

    // 2. Length check
    if (word.length < 2 || word.length > 15) return false;

    // 3. Arabic only
    if (!/^[\u0600-\u06FF]+$/.test(word)) return false;

    // 4. Bad prefixes (optional)
    if (word.startsWith('قائمة_')) return false; // Wikipedia lists
    if (word.startsWith('تصنيف:')) return false;

    return true;
}

// --- Fetchers ---

async function fetchGitHubText(url: string): Promise<string[]> {
    console.log(`fetching ${url}...`);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
        const text = await res.text();
        return text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    } catch (e) {
        console.error(`Error fetching GitHub ${url}:`, e);
        return [];
    }
}

async function fetchWikipediaCategory(categoryName: string): Promise<string[]> {
    console.log(`fetching Wikipedia Category: ${categoryName}...`);
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

            // Limit to prevent infinite loops or huge fetches (e.g. max 5 pages = 2500 items)
            if (results.length > 2500) break;

        } while (continueToken);

        return results;
    } catch (e) {
        console.error(`Error fetching Wiki ${categoryName}:`, e);
        return [];
    }
}

// --- Main ---

async function main() {
    console.log('--- Starting Database Enrichment ---');

    // 1. Load existing DB
    let database: WildcardDatabase = {};
    if (fs.existsSync(DB_PATH)) {
        database = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }

    let addedCount = 0;

    // 2. Process Sources
    for (const source of SOURCES) {
        let words: string[] = [];
        let targetCategory = '';

        if (source.type === 'github_text') {
            words = await fetchGitHubText(source.url!);
            targetCategory = source.category!;
        } else if (source.type === 'wikipedia_category') {
            words = await fetchWikipediaCategory(source.categoryName!);
            targetCategory = source.targetCategory!;
        }

        // 3. Process Words
        for (const rawWord of words) {
            // Wikipedia often returns "Category:..." or "File:..." or "Template:..."
            if (rawWord.includes(':')) continue;

            const word = rawWord.trim();

            // Clean logic
            // Some specific cleaning related to Wikipedia titles
            let cleanWord = word;

            // Remove (text in brackets) often found in wiki titles e.g. "Name (City)"
            cleanWord = cleanWord.replace(/\s*\(.*\)/, '');

            if (!isValidWord(cleanWord)) continue;

            const firstLetter = normalizeArabic(cleanWord.charAt(0)); // Normalized key
            if (!firstLetter) continue;

            // Initialize structure
            // Use same key logic (try to find matching key or create new)
            // But here we might be strictly normalized. 
            // Let's stick to the key that matches the letter character exactly if possible.

            // Actually, we should store under the "letter" that matched. 
            // The DB keys are usually simple characters.

            if (!database[firstLetter]) database[firstLetter] = {};
            if (!database[firstLetter][targetCategory]) database[firstLetter][targetCategory] = [];

            // De-duplicate
            const categoryList = database[firstLetter][targetCategory];
            const normalizedClean = normalizeArabic(cleanWord);

            const exists = categoryList.some(w => normalizeArabic(w) === normalizedClean);
            if (!exists) {
                categoryList.push(cleanWord);
                addedCount++;
            }
        }
    }

    // 4. Save
    // Sort
    for (const letter in database) {
        for (const cat in database[letter]) {
            database[letter][cat].sort();
        }
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2), 'utf-8');

    console.log('--- Enrichment Complete ---');
    console.log(`Added ${addedCount} new words.`);
    console.log(`Database saved to ${DB_PATH}`);
}

main();
