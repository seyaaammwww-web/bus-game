
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

    if (word.startsWith('قائمة')) return false;
    if (word.startsWith('تصنيف')) return false;
    if (word.startsWith('فهرس')) return false;
    if (word.startsWith('بوابة')) return false;
    if (word.includes('(')) return false;

    return true;
}

// --- Fetcher ---

async function fetchSparql(query: string, label: string): Promise<string[]> {
    console.log(`Fetching SPARQL: ${label}...`);
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
    try {
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'EgyptianBusGame/RestorePlants (mo@example.com)'
            }
        });
        if (!res.ok) return [];
        const data: any = await res.json();
        const results = data.results.bindings.map((b: any) => b.label.value);
        console.log(`✅ ${label}: Found ${results.length} items.`);
        return results;
    } catch (e: any) {
        console.error(`❌ ${label} Error:`, e.message);
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

        } while (continueToken && results.length < 1000);

        console.log(`✅ Wikipedia: Found ${results.length} items.`);
        return results;
    } catch (e) {
        return [];
    }
}

// --- Sources ---

const SPARQL_QUERIES = [
    // Plants
    { label: 'Flowering Plants', query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q25314. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000` },
    { label: 'Trees', query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q10884. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000` },
    { label: 'Vegetables', query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q11004. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 1000` },
    // Professions (Merged into Jamad as per "and so on")
    { label: 'Professions', query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q28640. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 1500` }
];

const WIKI_CATEGORIES = [
    'تصنيف:زهور',
    'تصنيف:أعشاب',
    'تصنيف:فواكه',
    'تصنيف:مهن_صحية',
    'تصنيف:مهن_هندسية'
];

async function main() {
    console.log('--- RESTORING & MERGING INTO JAMAD ---');

    let database: WildcardDatabase = {};
    if (fs.existsSync(DB_PATH)) {
        database = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }

    let addedCount = 0;

    // 1. Fetch SPARQL
    for (const source of SPARQL_QUERIES) {
        const words = await fetchSparql(source.query, source.label);
        // FORCE CATEGORY: 'جماد'
        addedCount += processWords(words, 'جماد', database);
        await new Promise(r => setTimeout(r, 500));
    }

    // 2. Fetch Wikipedia
    for (const cat of WIKI_CATEGORIES) {
        const words = await fetchWikipedia(cat);
        // FORCE CATEGORY: 'جماد'
        addedCount += processWords(words, 'جماد', database);
    }

    // Save
    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2), 'utf-8');

    console.log('--------------------------------');
    console.log(`Restoration Complete.`);
    console.log(`Merged ${addedCount} (Plants/Jobs) into 'جماد'.`);
}

function processWords(rawWords: string[], category: string, database: WildcardDatabase): number {
    let added = 0;
    for (const raw of rawWords) {
        let word = raw;
        if (word.includes('(')) word = word.split('(')[0];
        const parts = word.split(/[،\/,]/);

        for (let p of parts) {
            p = p.trim();
            if (!isValidWord(p)) continue;

            const firstLetter = normalizeArabic(p.charAt(0));
            if (!database[firstLetter]) database[firstLetter] = {};
            if (!database[firstLetter][category]) database[firstLetter][category] = [];

            const list = database[firstLetter][category];
            const normalizedItem = normalizeArabic(p);

            // Deduplicate
            if (!list.some(existing => normalizeArabic(existing) === normalizedItem)) {
                list.push(p);
                added++;
            }
        }
    }
    return added;
}

main().catch(console.error);
