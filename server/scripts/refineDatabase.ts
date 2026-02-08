
import * as fs from 'fs';
import * as path from 'path';

// --- Types ---
interface WildcardDatabase {
    [letter: string]: {
        [category: string]: string[];
    };
}

const DB_PATH = path.join(process.cwd(), 'server/data/clean_wildcardDatabase.json');

// --- Normalization ---
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
    if (word.includes(' ')) return false; // Strict single word? Or allow spaces? 
    // Game usually allows spaces for "Sun Flower" etc. But typically one word.
    // Let's allow spaces for extra categories like "Food" (e.g. "Koshary Masry") but maybe limit length.
    if (word.length < 2 || word.length > 25) return false;

    // Wiki noise
    if (word.startsWith('قائمة')) return false;
    if (word.startsWith('تصنيف')) return false;
    if (word.startsWith('بوابة')) return false;

    return true;
}

// --- Fetcher ---

async function fetchSparql(query: string, label: string): Promise<string[]> {
    console.log(`Fetching ${label}...`);
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
    try {
        const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'EgyptianBusGame/Refinement' } });
        if (!res.ok) throw new Error(res.statusText);
        const data: any = await res.json();
        const results = data.results.bindings.map((b: any) => b.label.value);
        console.log(`✅ ${label}: Found ${results.length}`);
        return results;
    } catch (e: any) {
        console.error(`❌ ${label} Failed:`, e.message);
        return [];
    }
}

// --- Main ---

async function main() {
    console.log('--- Cleaning and Refining Database ---');

    let db: WildcardDatabase = {};
    if (fs.existsSync(DB_PATH)) {
        db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }

    // 1. Merge 'بلاد' into 'بلد'
    console.log('Merging duplicate country categories...');
    let mergeCount = 0;
    for (const letter in db) {
        if (db[letter]['بلاد']) {
            if (!db[letter]['بلد']) db[letter]['بلد'] = [];

            for (const word of db[letter]['بلاد']) {
                if (!db[letter]['بلد'].includes(word)) { // Check typo in key? 'بلd'? No, 'بلد'
                    // Check existence in 'بلد'
                    if (!db[letter]['بلد'].some(w => normalizeArabic(w) === normalizeArabic(word))) {
                        db[letter]['بلد'].push(word);
                        mergeCount++;
                    }
                }
            }
            delete db[letter]['بلاد']; // Remove old key
        }
    }
    console.log(`Merged ${mergeCount} country entries.`);

    // 2. Add New Custom Categories
    let added = 0;

    // FOOD (أكل)
    // Dishes (Q746549), Foods (Q2095)
    // Filter by Arabic label
    const foods = await fetchSparql(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q2095. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 3000`,
        "Foods"
    );
    added += processWords(foods, 'أكل', db);

    // JOBS (مهنة)
    // Profession (Q28640)
    const jobs = await fetchSparql(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q28640. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000`,
        "Professions"
    );
    added += processWords(jobs, 'مهنة', db);

    // SPORTS (رياضة)
    // Sport (Q31629)
    const sports = await fetchSparql(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q31629. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 1000`,
        "Sports"
    );
    added += processWords(sports, 'رياضة', db);

    // 3. Enrich Inanimate (جماد) with broader queries
    // Artificial Object (Q8205328) -> Too broad?
    // Let's try "Household Goods" (Q11502446)
    const household = await fetchSparql(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q11502446. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000`,
        "Household Goods"
    );
    added += processWords(household, 'جماد', db);

    // 4. Enrich Plants (نبات)
    // Plant (Q756) - general query again?
    // Let's try "Spices" (Q262276)
    const spices = await fetchSparql(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q262276. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 1000`,
        "Spices"
    );
    added += processWords(spices, 'نبات', db); // Spices are plants usually

    // 5. Final Sort & Save
    for (const letter in db) {
        for (const cat in db[letter]) {
            db[letter][cat] = [...new Set(db[letter][cat])].sort();
        }
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`\nRefinement Complete. Added ${added} new entries.`);
    console.log(`Saved to ${DB_PATH}`);
}

function processWords(rawWords: string[], category: string, database: WildcardDatabase): number {
    let added = 0;
    for (const raw of rawWords) {
        let word = raw;
        if (word.includes('(')) word = word.split('(')[0];
        // Split by comma
        const parts = word.split('،');

        for (let p of parts) {
            p = p.trim();
            if (!isValidWord(p)) continue;

            const firstLetter = normalizeArabic(p.charAt(0));
            if (!firstLetter) continue;

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
