
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

// --- Normalizer (Embedded) ---
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
    if (word.includes(' ')) return false;
    if (word.length < 2 || word.length > 20) return false;
    if (!/^[\u0600-\u06FF]+$/.test(word)) return false;

    if (word.startsWith('قائمة')) return false;
    if (word.startsWith('تصنيف')) return false;
    if (word.startsWith('فهرس')) return false;
    if (word.startsWith('بوابة')) return false;
    if (word.startsWith('مشروع')) return false;
    if (word.startsWith('قالب')) return false;
    if (word.includes('(')) return false;

    return true;
}

// --- Sources ---
// 1. GitHub Text lists
const GITHUB_TEXT_SOURCES = [
    { category: 'ولد', urls: ['https://raw.githubusercontent.com/mdanok/Arabic-Names/master/People-Names/Boys.txt'] },
    { category: 'بنت', urls: ['https://raw.githubusercontent.com/mdanok/Arabic-Names/master/People-Names/Girls.txt'] },
    { category: 'ولد', urls: ['https://raw.githubusercontent.com/arabic-names/arabic-names-list/master/boys.txt'] },
    { category: 'بنت', urls: ['https://raw.githubusercontent.com/arabic-names/arabic-names-list/master/girls.txt'] }
];

// 2. GitHub JSON Vocabulary API (High Quality)
const GITHUB_JSON_SOURCES = [
    { category: 'حيوان', url: 'https://raw.githubusercontent.com/selmetwa/arabic-vocab-api/main/json/animals.json' },
    { category: 'نبات', url: 'https://raw.githubusercontent.com/selmetwa/arabic-vocab-api/main/json/food.json' }, // Fruit/Veg
    { category: 'نبات', url: 'https://raw.githubusercontent.com/selmetwa/arabic-vocab-api/main/json/nature__and__weather.json' }, // Trees, nature
    { category: 'جماد', url: 'https://raw.githubusercontent.com/selmetwa/arabic-vocab-api/main/json/vocabulary_from_around_the_house.json' },
    { category: 'جماد', url: 'https://raw.githubusercontent.com/selmetwa/arabic-vocab-api/main/json/clothing.json' },
    { category: 'جماد', url: 'https://raw.githubusercontent.com/selmetwa/arabic-vocab-api/main/json/technology.json' },
    { category: 'جماد', url: 'https://raw.githubusercontent.com/selmetwa/arabic-vocab-api/main/json/city_and_transportation.json' },
    { category: 'جماد', url: 'https://raw.githubusercontent.com/selmetwa/arabic-vocab-api/main/json/work_and_money.json' },
    { category: 'جماد', url: 'https://raw.githubusercontent.com/selmetwa/arabic-vocab-api/main/json/sports__and__hobbies.json' },
    { category: 'جماد', url: 'https://raw.githubusercontent.com/selmetwa/arabic-vocab-api/main/json/school_and_education.json' },
    { category: 'بلد', url: 'https://raw.githubusercontent.com/selmetwa/arabic-vocab-api/main/json/geography.json' }, // Countries/cities
    { category: 'جماد', url: 'https://raw.githubusercontent.com/selmetwa/arabic-vocab-api/main/json/music.json' } // If exists? Or just fallback.
];

// 3. Wikipedia Categories
const WIKIPEDIA_CATEGORIES = [
    { category: 'حيوان', wikiCategory: 'تصنيف:ثدييات' },
    { category: 'حيوان', wikiCategory: 'تصنيف:طيور' },
    { category: 'حيوان', wikiCategory: 'تصنيف:زواحف' },
    { category: 'حيوان', wikiCategory: 'تصنيف:أسماك' },
    { category: 'نبات', wikiCategory: 'تصنيف:فواكه' },
    { category: 'نبات', wikiCategory: 'تصنيف:خضراوات' },
    { category: 'نبات', wikiCategory: 'تصنيف:أشجار' },
    { category: 'جماد', wikiCategory: 'تصنيف:أثاث' },
    { category: 'جماد', wikiCategory: 'تصنيف:أدوات' },
    { category: 'جماد', wikiCategory: 'تصنيف:أجهزة_منزلية' },
    { category: 'جماد', wikiCategory: 'تصنيف:مركبات' },
    { category: 'بلد', wikiCategory: 'تصنيف:دول_العالم' },
    { category: 'بلد', wikiCategory: 'تصنيف:عواصم' },
    { category: 'بلد', wikiCategory: 'تصنيف:مدن_عربية' }
];

// 4. Wikidata SPARQL
const SPARQL_QUERIES = [
    // --- JAMAD (INANIMATE) - High Volume ---
    {
        category: 'جماد', label: 'Tools',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q39546. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000`
    },
    {
        category: 'جماد', label: 'Clothing',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q11460. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000`
    },
    {
        category: 'جماد', label: 'Vehicles',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q42889. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000`
    },
    {
        category: 'جماد', label: 'Electronics',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q11650. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000`
    },
    {
        category: 'بلد', label: 'Cities > 50k',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P31/wdt:P279* wd:Q515; wdt:P1082 ?pop. FILTER(?pop > 50000). ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 5000`
    },
    {
        category: 'ولد', label: 'Male Given Names',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P31 wd:Q12308941. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 5000`
    },
    {
        category: 'بنت', label: 'Female Given Names',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P31 wd:Q11879590. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 5000`
    }
];

// --- Fetchers ---

async function fetchGitHubText(urls: string[]): Promise<string[]> {
    let allLines: string[] = [];
    for (const url of urls) {
        try {
            console.log(`Trying GitHub Text: ${url}`);
            const res = await fetch(url);
            if (res.ok) {
                const text = await res.text();
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                console.log(`✅ Success: Fetched ${lines.length} items from GitHub Text.`);
                allLines = allLines.concat(lines);
            }
        } catch (e) {
            console.log(`Failed URL ${url}`);
        }
    }
    return allLines;
}

async function fetchGitHubJson(url: string): Promise<string[]> {
    console.log(`Fetching GitHub JSON: ${url}`);
    try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data: any = await res.json();
        const words: string[] = [];

        if (Array.isArray(data)) {
            for (const item of data) {
                if (item.standardArabic) words.push(item.standardArabic);
                if (item.egyptianArabic) words.push(item.egyptianArabic);
            }
        }
        console.log(`✅ Success: Fetched ${words.length} items from JSON.`);
        return words;
    } catch (e) {
        console.error(`Failed JSON ${url}:`, e);
        return [];
    }
}

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

async function fetchSparql(query: string, label: string): Promise<string[]> {
    console.log(`Fetching SPARQL: ${label}...`);
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;

    try {
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'EgyptianBusGame/ultimate (mo@example.com)'
            }
        });

        if (!res.ok) throw new Error(res.statusText + ' ' + res.status);

        const data: any = await res.json();
        const results = data.results.bindings.map((b: any) => b.label.value);
        console.log(`✅ Wikidata ${label}: Found ${results.length} items.`);
        return results;
    } catch (e: any) {
        console.error(`❌ SPARQL Failed for ${label}:`, e.message);
        return [];
    }
}

// --- Main ---

async function main() {
    console.log('--- Starting ULTIMATE EXPANSION V2 ---');

    let database: WildcardDatabase = {};
    if (fs.existsSync(DB_PATH)) {
        database = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } else {
        console.log('Creating new database file...');
    }

    let addedCount = 0;

    // 1. GitHub Text
    for (const source of GITHUB_TEXT_SOURCES) {
        const words = await fetchGitHubText(source.urls);
        addedCount += processWords(words, source.category, database);
    }

    // 2. GitHub JSON (New & Powerful)
    for (const source of GITHUB_JSON_SOURCES) {
        const words = await fetchGitHubJson(source.url);
        addedCount += processWords(words, source.category, database);
    }

    // 3. Wikipedia
    for (const source of WIKIPEDIA_CATEGORIES) {
        const words = await fetchWikipedia(source.wikiCategory);
        addedCount += processWords(words, source.category, database);
    }

    // 4. Wikidata
    for (const source of SPARQL_QUERIES) {
        const words = await fetchSparql(source.query, source.label);
        addedCount += processWords(words, source.category, database);
        await new Promise(r => setTimeout(r, 1000));
    }

    // Save
    for (const letter in database) {
        for (const cat in database[letter]) {
            database[letter][cat] = [...new Set(database[letter][cat])].sort();
        }
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2), 'utf-8');

    console.log('--------------------------------');
    console.log(`ULTIMATE EXPANSION COMPLETE.`);
    console.log(`Added ${addedCount} (approx) new words before deduping.`);
    console.log(`Database saved to ${DB_PATH}`);
}

function processWords(rawWords: string[], category: string, database: WildcardDatabase): number {
    let added = 0;
    for (const raw of rawWords) {
        let word = raw;
        if (word.includes('(')) word = word.split('(')[0];
        // Handle common delimiters in raw data like " / " or "،"
        const parts = word.split(/[\/،,]/);

        for (let part of parts) {
            part = part.trim();
            if (!isValidWord(part)) continue;

            const firstLetter = normalizeArabic(part.charAt(0));
            if (!firstLetter) continue;

            if (!database[firstLetter]) database[firstLetter] = {};
            if (!database[firstLetter][category]) database[firstLetter][category] = [];

            const list = database[firstLetter][category];
            const normalizedItem = normalizeArabic(part);

            if (!list.some(existing => normalizeArabic(existing) === normalizedItem)) {
                list.push(part);
                added++;
            }
        }
    }
    return added;
}

main().catch(console.error);
