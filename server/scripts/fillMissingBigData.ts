
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
    if (word.includes(' ')) return false;
    if (word.length < 2 || word.length > 20) return false;
    if (!/^[\u0600-\u06FF]+$/.test(word)) return false;

    // Wiki noise filter
    if (word.startsWith('قائمة')) return false;
    if (word.startsWith('تصنيف')) return false;
    if (word.startsWith('فهرس')) return false;
    if (word.startsWith('بوابة')) return false;

    return true;
}

// --- Fetcher with Pagination ---

async function fetchSparqlPaginated(baseQuery: string, label: string, category: string, database: WildcardDatabase) {
    console.log(`\n🚀 Fetching SPARQL (Paginated): ${label}...`);

    const BATCH_SIZE = 500; // Safe batch size
    let offset = 0;
    let totalAdded = 0;
    let hasMore = true;

    while (hasMore) {
        // Construct query with LIMIT and OFFSET
        const paginatedQuery = `${baseQuery} LIMIT ${BATCH_SIZE} OFFSET ${offset}`;
        const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(paginatedQuery)}&format=json`;

        try {
            console.log(`   - Batch offset ${offset}...`);
            const res = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'EgyptianBusGame/ultimate-v2 (mo@example.com)'
                }
            });

            if (!res.ok) {
                console.error(`   ❌ Failed batch: ${res.statusText}`);
                if (res.status === 429) { // Too Many Requests
                    console.log('   ⚠️ Rate limited. Waiting 5s...');
                    await new Promise(r => setTimeout(r, 5000));
                    continue; // Retry same offset
                }
                break; // Stop on other errors
            }

            const data: any = await res.json();
            const results = data.results.bindings.map((b: any) => b.label.value);

            if (results.length === 0) {
                hasMore = false;
                console.log(`   ✅ Finished ${label}. No more results.`);
            } else {
                const added = processWords(results, category, database);
                totalAdded += added;
                console.log(`     -> Fetched ${results.length}, Added ${added} new words.`);

                offset += BATCH_SIZE;
                await new Promise(r => setTimeout(r, 500)); // Gentle delay
            }

        } catch (e: any) {
            console.error(`   ❌ Error in batch:`, e.message);
            // If JSON parse error, maybe retry with smaller batch? Or skip?
            // For now, let's break to be safe, or just skip this batch
            offset += BATCH_SIZE; // Skip forward potentially? Or break.
            // Let's break to avoid infinite loops on broken queries
            break;
        }
    }
    console.log(`✅ ${label} Complete. Total Added: ${totalAdded}`);
    return totalAdded;
}

// --- Main Logic ---

async function main() {
    let database: WildcardDatabase = {};
    if (fs.existsSync(DB_PATH)) {
        database = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }

    let globalAdded = 0;

    // 1. Male Names (Big Query)
    // wd:Q12308941 = male given name
    // wd:Q11879590 = female given name
    // wd:Q515 = city

    // Male Names - DONE
    /*
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P31 wd:Q12308941. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Male Names',
        'ولد',
        database
    );
    */

    // Female Names
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P31 wd:Q11879590. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Female Names',
        'بنت',
        database
    );

    // Cities (Worldwide > 20k pop for MORE volume)
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P31/wdt:P279* wd:Q515; wdt:P1082 ?pop. FILTER(?pop > 20000). ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Major & Medium Cities (>20k)',
        'بلد',
        database
    );

    // Plants (Flora) - wd:Q756 (Plant) - Use subclass
    // Flowering plant (Q25314), Tree (Q10884)
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q25314. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Flowering Plants',
        'نبات',
        database
    );

    // Inanimate - "Man-made object" (Q11032) -> Too broad?
    // "Tool" (Q39546), "Device" (Q1183543), "Container" (Q11442)
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q1183543. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Devices',
        'جماد',
        database
    );
    // Cities (Arab World specially - no pop limit)
    // subquery for Arab countries? Or just rely on "ar" label for now?
    // Let's use specific list of Arab organizations or just search "city in Egypt/Saudi/etc"?
    // Simpler: Cities with Arabic label in general usually covers Arab world well.
    // Let's add "Towns" specifically?
    // Maybe "Governorates of Egypt" etc.

    // Save
    console.log('\n💾 Saving Database...');
    for (const letter in database) {
        for (const cat in database[letter]) {
            database[letter][cat] = [...new Set(database[letter][cat])].sort();
        }
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2), 'utf-8');
    console.log(`🎉 DONE! Added ${globalAdded} total new entries.`);
}

function processWords(rawWords: string[], category: string, database: WildcardDatabase): number {
    let added = 0;
    for (const raw of rawWords) {
        let word = raw;
        if (word.includes('(')) word = word.split('(')[0];
        // Handle comma sep
        if (word.includes('،')) {
            const parts = word.split('،');
            for (const p of parts) processSingleWord(p, category, database, () => added++);
            continue;
        }
        processSingleWord(word, category, database, () => added++);
    }
    return added;
}

function processSingleWord(raw: string, category: string, database: WildcardDatabase, onAdd: () => void) {
    const word = raw.trim();
    if (!isValidWord(word)) return;

    const firstLetter = normalizeArabic(word.charAt(0));
    if (!firstLetter) return;

    if (!database[firstLetter]) database[firstLetter] = {};
    if (!database[firstLetter][category]) database[firstLetter][category] = [];

    const list = database[firstLetter][category];
    const normalizedItem = normalizeArabic(word);

    if (!list.some(existing => normalizeArabic(existing) === normalizedItem)) {
        list.push(word);
        onAdd();
    }
}

main().catch(console.error);
