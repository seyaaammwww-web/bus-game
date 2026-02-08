
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
    if (word.startsWith('بوابة')) return false;
    if (word.includes('(')) return false;
    return true;
}

// --- Fetcher with Pagination ---
async function fetchSparqlPaginated(baseQuery: string, label: string, category: string, database: WildcardDatabase) {
    console.log(`\n🚀 Fetching: ${label}...`);

    const BATCH_SIZE = 500;
    let offset = 0;
    let totalAdded = 0;
    let hasMore = true;

    while (hasMore && offset < 10000) { // Max 10k per query
        const paginatedQuery = `${baseQuery} LIMIT ${BATCH_SIZE} OFFSET ${offset}`;
        const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(paginatedQuery)}&format=json`;

        try {
            const res = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'EgyptianBusGame/MassiveExpansion'
                }
            });

            if (!res.ok) {
                if (res.status === 429) {
                    await new Promise(r => setTimeout(r, 5000));
                    continue;
                }
                break;
            }

            const data: any = await res.json();
            const results = data.results.bindings.map((b: any) => b.label.value);

            if (results.length === 0) {
                hasMore = false;
            } else {
                const added = processWords(results, category, database);
                totalAdded += added;
                console.log(`   Batch ${offset}: +${added} words`);
                offset += BATCH_SIZE;
                await new Promise(r => setTimeout(r, 500));
            }

        } catch (e: any) {
            console.error(`   Error:`, e.message);
            break;
        }
    }
    console.log(`✅ ${label}: Total +${totalAdded}`);
    return totalAdded;
}

async function fetchWikipedia(categoryName: string): Promise<string[]> {
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
        return results;
    } catch (e) {
        return [];
    }
}

// --- Main ---

async function main() {
    console.log('='.repeat(60));
    console.log('🚀 MASSIVE DATABASE EXPANSION - ALL CATEGORIES');
    console.log('='.repeat(60));

    let database: WildcardDatabase = {};
    if (fs.existsSync(DB_PATH)) {
        database = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }

    let globalAdded = 0;

    // ========== BOYS (ولد) ==========
    console.log('\n📘 EXPANDING: BOYS (ولد)');
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P31 wd:Q12308941. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Male Names (Wikidata)',
        'ولد',
        database
    );

    // ========== GIRLS (بنت) ==========
    console.log('\n📗 EXPANDING: GIRLS (بنت)');
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P31 wd:Q11879590. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Female Names (Wikidata)',
        'بنت',
        database
    );

    // ========== ANIMALS (حيوان) ==========
    console.log('\n🦁 EXPANDING: ANIMALS (حيوان)');

    // Mammals
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q7377. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Mammals',
        'حيوان',
        database
    );

    // Birds
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q5113. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Birds',
        'حيوان',
        database
    );

    // Fish
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q152. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Fish',
        'حيوان',
        database
    );

    // Reptiles
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q10811. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Reptiles',
        'حيوان',
        database
    );

    // Insects
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q1390. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Insects',
        'حيوان',
        database
    );

    // ========== INANIMATE (جماد) ==========
    console.log('\n🏺 EXPANDING: INANIMATE (جماد)');

    // Tools
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q39546. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Tools',
        'جماد',
        database
    );

    // Vehicles
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q42889. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Vehicles',
        'جماد',
        database
    );

    // Clothing
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q11460. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Clothing',
        'جماد',
        database
    );

    // Furniture
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q14745. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Furniture',
        'جماد',
        database
    );

    // Musical Instruments
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q34379. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Musical Instruments',
        'جماد',
        database
    );

    // Electronics/Devices
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P279* wd:Q1183543. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Devices',
        'جماد',
        database
    );

    // ========== COUNTRIES/CITIES (بلد) ==========
    console.log('\n🌍 EXPANDING: COUNTRIES/CITIES (بلد)');

    // Countries
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P31 wd:Q6256. ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Countries',
        'بلد',
        database
    );

    // Cities > 10k population (MORE coverage)
    globalAdded += await fetchSparqlPaginated(
        `SELECT DISTINCT ?label WHERE { ?item wdt:P31/wdt:P279* wd:Q515; wdt:P1082 ?pop. FILTER(?pop > 10000). ?item rdfs:label ?label. FILTER(LANG(?label) = "ar") }`,
        'Cities (>10k)',
        'بلد',
        database
    );

    // Wikipedia Categories for MORE coverage
    console.log('\n📚 Adding Wikipedia Categories...');
    const wikiCategories = [
        { cat: 'تصنيف:مدن_مصر', target: 'بلد' },
        { cat: 'تصنيف:محافظات_مصر', target: 'بلد' },
        { cat: 'تصنيف:مدن_السعودية', target: 'بلد' },
        { cat: 'تصنيف:مدن_المغرب', target: 'بلد' },
        { cat: 'تصنيف:مدن_الجزائر', target: 'بلد' },
        { cat: 'تصنيف:ثدييات', target: 'حيوان' },
        { cat: 'تصنيف:طيور', target: 'حيوان' },
        { cat: 'تصنيف:أسماك', target: 'حيوان' }
    ];

    for (const { cat, target } of wikiCategories) {
        const words = await fetchWikipedia(cat);
        const added = processWords(words, target, database);
        console.log(`   ${cat}: +${added}`);
        globalAdded += added;
    }

    // Final Save
    console.log('\n💾 Saving database...');
    for (const letter in database) {
        for (const cat in database[letter]) {
            database[letter][cat] = [...new Set(database[letter][cat])].sort();
        }
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2), 'utf-8');

    console.log('\n' + '='.repeat(60));
    console.log(`🎉 EXPANSION COMPLETE!`);
    console.log(`Total New Words Added: ${globalAdded}`);

    // Final Stats
    const stats: Record<string, number> = {};
    for (const letter in database) {
        for (const cat in database[letter]) {
            stats[cat] = (stats[cat] || 0) + database[letter][cat].length;
        }
    }
    console.log('\n📊 FINAL DATABASE STATISTICS:');
    Object.entries(stats).sort(([, a], [, b]) => b - a).forEach(([k, v]) => {
        console.log(`   ${k}: ${v.toLocaleString()} words`);
    });
    console.log('='.repeat(60));
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

            if (!list.some(existing => normalizeArabic(existing) === normalizedItem)) {
                list.push(p);
                added++;
            }
        }
    }
    return added;
}

main().catch(console.error);
