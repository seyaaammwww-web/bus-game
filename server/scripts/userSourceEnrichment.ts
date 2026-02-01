
import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---
const DB_PATH = path.join(process.cwd(), 'server/data/clean_wildcardDatabase.json');

// User Provided Links
const SOURCES = {
    boys: 'https://raw.githubusercontent.com/arabic-names/arabic-names-list/master/boys.txt',
    girls: 'https://raw.githubusercontent.com/arabic-names/arabic-names-list/master/girls.txt',
    countries: 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json'
};

interface WildcardDatabase {
    [letter: string]: {
        [category: string]: string[];
    };
}

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
    if (word.includes(' ')) return false; // Single words preferred
    // For names, we might allow spaces later, but simplified for now
    if (word.length < 2 || word.length > 15) return false;
    if (!/^[\u0600-\u06FF\s]+$/.test(word)) return false;
    return true;
}

// --- Main ---
async function main() {
    console.log('--- Starting User-Specific Source Enrichment ---');

    let database: WildcardDatabase = {};
    if (fs.existsSync(DB_PATH)) {
        database = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }

    let addedCount = 0;

    // 1. Fetch Boys
    try {
        console.log(`Fetching Boys Names from ${SOURCES.boys}...`);
        const res = await fetch(SOURCES.boys);
        if (res.ok) {
            const text = await res.text();
            const names = text.split('\n');
            addedCount += processWords(names, 'ولد', database);
        } else {
            console.error(`❌ Failed to fetch Boys list: ${res.status}`);
        }
    } catch (e) {
        console.error('❌ Error fetching Boys:', e);
    }

    // 2. Fetch Girls
    try {
        console.log(`Fetching Girls Names from ${SOURCES.girls}...`);
        const res = await fetch(SOURCES.girls);
        if (res.ok) {
            const text = await res.text();
            const names = text.split('\n');
            addedCount += processWords(names, 'بنت', database);
        } else {
            console.error(`❌ Failed to fetch Girls list: ${res.status}`);
        }
    } catch (e) {
        console.error('❌ Error fetching Girls:', e);
    }

    // 3. Fetch Countries (JSON)
    try {
        console.log(`Fetching Countries from ${SOURCES.countries}...`);
        const res = await fetch(SOURCES.countries);
        if (res.ok) {
            const data = await res.json() as any[];
            const countryNames = data
                .map((c: any) => c.translations?.ara?.common || '')
                .filter(n => n);

            addedCount += processWords(countryNames, 'بلد', database);
        } else {
            console.error(`❌ Failed to fetch Countries json: ${res.status}`);
        }
    } catch (e) {
        console.error('❌ Error fetching Countries:', e);
    }

    // Save
    for (const letter in database) {
        for (const cat in database[letter]) {
            database[letter][cat].sort();
        }
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2), 'utf-8');

    console.log('--------------------------------');
    console.log(`USER SOURCE ENRICHMENT COMPLETE.`);
    console.log(`Added ${addedCount} NEW items from your specific lists.`);
    console.log(`Database saved to ${DB_PATH}`);
}

function processWords(rawWords: string[], category: string, database: WildcardDatabase): number {
    let added = 0;
    for (const raw of rawWords) {
        let word = raw.trim();
        // handling potential weird encoding or invisible chars
        word = word.replace(/[\r\n]+/g, '');

        if (!isValidWord(word)) continue;

        const firstLetter = normalizeArabic(word.charAt(0));
        if (!firstLetter) continue;

        if (!database[firstLetter]) database[firstLetter] = {};
        if (!database[firstLetter][category]) database[firstLetter][category] = [];

        const list = database[firstLetter][category];
        const normalizedItem = normalizeArabic(word);

        // Strict de-dup
        if (!list.some(existing => normalizeArabic(existing) === normalizedItem)) {
            list.push(word);
            added++;
        }
    }
    return added;
}

main();
