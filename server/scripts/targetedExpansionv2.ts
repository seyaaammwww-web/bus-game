
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
    return normalized;
}

function isValidWord(word: string): boolean {
    if (!word) return false;
    if (word.length < 2 || word.length > 30) return false;

    if (word.startsWith('قائمة')) return false;
    if (word.startsWith('تصنيف')) return false;
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
                'User-Agent': 'EgyptianBusGame/TargetedExpansion (mo@example.com)'
            }
        });

        if (!res.ok) {
            console.error(`❌ ${label} Failed: ${res.statusText}`);
            return [];
        }

        const data: any = await res.json();
        const results = data.results.bindings.map((b: any) => b.label.value);
        console.log(`✅ ${label}: Found ${results.length} items.`);
        return results;
    } catch (e: any) {
        console.error(`❌ ${label} Error:`, e.message);
        return [];
    }
}

// --- Queries ---

const QUERIES = [
    // --- FOOD (Expand drastically) ---
    // Q2095 = Food
    {
        category: 'أكل', label: 'Foods (General)',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q2095. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 3000`
    },
    // Q746549 = Dish (culinary)
    {
        category: 'أكل', label: 'Dishes',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P31/wdt:P279* wd:Q746549. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 3000`
    },
    // Q13276 = Dessert
    {
        category: 'أكل', label: 'Desserts',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q13276. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000`
    },
    // Q7802 = Bread
    {
        category: 'أكل', label: 'Breads',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q7802. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 500`
    },

    // --- ANIMALS (More specific families) ---
    // Q16521 = Taxon (Too broad, sticking to classes)

    // Q1390 = Insect
    {
        category: 'حيوان', label: 'Insects',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q1390. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000`
    },
    // Q5113 = Bird
    {
        category: 'حيوان', label: 'Birds',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q5113. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 3000`
    },
    // Q152 = Fish
    {
        category: 'حيوان', label: 'Fish',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q152. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000`
    },
    // Q7377 = Mammal
    {
        category: 'حيوان', label: 'Mammals',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q7377. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000`
    },

    // --- SPORTS (Expand) ---
    // Q349 = Sport
    {
        category: 'رياضة', label: 'Sports',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q349. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000`
    },
    // Q206229 = Team Sport
    {
        category: 'رياضة', label: 'Team Sports',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q206229. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 500`
    },

    // --- JOBS (Expand) ---
    // Q28640 = Profession
    {
        category: 'مهنة', label: 'Professions',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q28640. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 3000`
    },
    // Q4175466 = Occupation
    {
        category: 'مهنة', label: 'Occupations',
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q4175466. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 3000`
    }
];

async function main() {
    console.log('--- Targeted V2 Expansion ---');

    let database: WildcardDatabase = {};
    if (fs.existsSync(DB_PATH)) {
        database = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }

    let addedCount = 0;

    for (const source of QUERIES) {
        const words = await fetchSparql(source.query, source.label);
        addedCount += processWords(words, source.category, database);

        // Gentle rate limiting between queries
        await new Promise(r => setTimeout(r, 1000));
    }

    // Save
    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2), 'utf-8');

    console.log('--------------------------------');
    console.log(`Targeted Expansion V2 Complete.`);
    console.log(`Added ${addedCount} (approx) new words.`);
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
            // Ensure first letter is valid key
            if (!database[firstLetter]) database[firstLetter] = {};
            if (!database[firstLetter][category]) database[firstLetter][category] = [];

            const list = database[firstLetter][category];
            const normalizedItem = normalizeArabic(p);

            if (!list.some(existing => normalizeArabic(existing) === normalizedItem)) {
                list.push(p);
                added++;
            }
        }
    }
    return added;
}

main().catch(console.error);
