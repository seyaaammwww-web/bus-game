
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

const SOURCES_CONFIG = {
    github: [
        {
            category: 'ولد',
            urls: [
                'https://raw.githubusercontent.com/mdanok/Arabic-Names/master/People-Names/Boys.txt',
                'https://raw.githubusercontent.com/arabic-names/arabic-names-list/master/boys.txt',
                'https://raw.githubusercontent.com/ieee-ksu/Arabic-Names/master/Arabic_Names_Boys.txt'
            ]
        },
        {
            category: 'بنت',
            urls: [
                'https://raw.githubusercontent.com/mdanok/Arabic-Names/master/People-Names/Girls.txt',
                'https://raw.githubusercontent.com/arabic-names/arabic-names-list/master/girls.txt',
                'https://raw.githubusercontent.com/ieee-ksu/Arabic-Names/master/Arabic_Names_Girls.txt'
            ]
        }
    ],
    wikipedia: [
        { category: 'ولد', wikiCategory: 'تصنيف:أسماء_ذكور_عربية' },
        { category: 'بنت', wikiCategory: 'تصنيف:أسماء_إناث_عربية' }
    ],
    wikidata: [
        {
            category: 'حيوان',
            label: 'Animals',
            query: `SELECT DISTINCT ?label WHERE { ?item wdt:P31/wdt:P279* wd:Q729; rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 5000`
        },
        {
            category: 'نبات',
            label: 'Plants',
            query: `SELECT DISTINCT ?label WHERE { ?item wdt:P31/wdt:P279* wd:Q756; rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 3000`
        },
        {
            category: 'جماد',
            label: 'Vegetables',
            query: `SELECT DISTINCT ?label WHERE { ?item wdt:P31/wdt:P279* wd:Q11004; rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 1000`
        },
        {
            category: 'جماد',
            label: 'Tools',
            query: `SELECT DISTINCT ?label WHERE { ?item wdt:P31/wdt:P279* wd:Q39546; rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 3000`
        },
        {
            category: 'جماد',
            label: 'Furniture',
            // Use wdt:P279* (Subclass of Furniture) because items are usually subclasses like "Chair"
            query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q14733; rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000`
        },
        {
            category: 'جماد',
            label: 'Clothing',
            query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q11460; rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000`
        },
        {
            category: 'جماد',
            label: 'Musical Instruments',
            query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q34379; rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 1000`
        },
        {
            category: 'بلد',
            label: 'Countries',
            query: `SELECT DISTINCT ?label WHERE { ?item wdt:P31 wd:Q6256; rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 500`
        },
        {
            category: 'بلد',
            label: 'Capital Cities',
            query: `SELECT DISTINCT ?label WHERE { ?item wdt:P31/wdt:P279* wd:Q5119; rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 500`
        },
        {
            category: 'بلد',
            label: 'Major Cities', // Use a simpler query for cities to ensure hits
            query: `SELECT DISTINCT ?label WHERE { ?item wdt:P31/wdt:P279* wd:Q515; wdt:P1082 ?pop; rdfs:label ?label. FILTER(?pop > 500000 && LANG(?label) = "ar") } LIMIT 1000`
        }
    ]
};

// --- Helpers ---
function normalizeArabic(text: string): string {
    return text
        .trim()
        .replace(/[^\u0600-\u06FF\s]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة$/g, 'ه')
        .replace(/ى$/g, 'ي');
}

function isValidWord(word: string): boolean {
    if (word.includes(' ')) return false;
    if (word.length < 2 || word.length > 15) return false;
    if (!/^[\u0600-\u06FF]+$/.test(word)) return false;

    if (word.startsWith('قائمة')) return false;
    if (word.startsWith('تصنيف')) return false;
    if (word.startsWith('فهرس')) return false;
    if (word.startsWith('بوابة')) return false;

    return true;
}

// --- Fetchers ---

async function fetchGitHub(urls: string[]): Promise<string[]> {
    for (const url of urls) {
        try {
            console.log(`Trying GitHub: ${url}`);
            const res = await fetch(url);
            if (res.ok) {
                const text = await res.text();
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                console.log(`✅ Success: Fetched ${lines.length} items from GitHub.`);
                return lines;
            }
        } catch (e) {
            console.log(`Failed URL ${url}`);
        }
    }
    console.warn(`❌ All GitHub URLs failed.`);
    return [];
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
            if (results.length > 2000) break; // Limit 2000 per wiki cat

        } while (continueToken);

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
                'User-Agent': 'EgyptianBusGame/1.0 (mo@example.com) Node/18'
            }
        });

        if (!res.ok) throw new Error(res.statusText);

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
    console.log('--- Starting FINAL MASSIVE Enrichment ---');

    let database: WildcardDatabase = {};
    if (fs.existsSync(DB_PATH)) {
        database = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }

    let addedCount = 0;

    // 1. GitHub
    for (const source of SOURCES_CONFIG.github) {
        const words = await fetchGitHub(source.urls);
        addedCount += processWords(words, source.category, database);
    }

    // 2. Wikipedia (Fallback for Names)
    for (const source of SOURCES_CONFIG.wikipedia) {
        const words = await fetchWikipedia(source.wikiCategory);
        addedCount += processWords(words, source.category, database);
    }

    // 3. Wikidata
    for (const source of SOURCES_CONFIG.wikidata) {
        const words = await fetchSparql(source.query, source.label);
        addedCount += processWords(words, source.category, database);
    }

    // Save
    for (const letter in database) {
        for (const cat in database[letter]) {
            database[letter][cat].sort();
        }
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2), 'utf-8');

    console.log('--------------------------------');
    console.log(`FINAL ENRICHMENT COMPLETE.`);
    console.log(`Added ${addedCount} UNIQUE new words.`);
    console.log(`Database saved to ${DB_PATH}`);
}

function processWords(rawWords: string[], category: string, database: WildcardDatabase): number {
    let added = 0;
    for (const raw of rawWords) {
        let word = raw.split('(')[0].trim();
        word = word.split(',')[0].trim();

        if (!isValidWord(word)) continue;

        const firstLetter = normalizeArabic(word.charAt(0));
        if (!firstLetter) continue;

        if (!database[firstLetter]) database[firstLetter] = {};
        if (!database[firstLetter][category]) database[firstLetter][category] = [];

        const list = database[firstLetter][category];
        const normalizedItem = normalizeArabic(word);

        if (!list.some(existing => normalizeArabic(existing) === normalizedItem)) {
            list.push(word);
            added++;
        }
    }
    return added;
}

main();
