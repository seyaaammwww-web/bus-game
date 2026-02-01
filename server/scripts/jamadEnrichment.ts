
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

// 1. HARDCODED LISTS (From Research - High Quality)
const JAMAD_LISTS = [
    // Kitchen
    "ثلاجة", "موقد", "فرن", "ميكروويف", "غسالة", "خلاط", "محمصة", "غلاية", "وعاء", "قدر", "مقلاة", "طنجرة", "صينية",
    "شواية", "سكين", "ملعقة", "شوكة", "مغرفة", "مصفاة", "مبشرة", "فتاحة", "كوب", "لوح", "شوبك", "مخفقة", "منخل",
    "عصارة", "قمع", "ملقط", "هراسة", "طبق", "صحن", "كأس", "فنجان", "حوض", "طاولة", "سلة", "منشفة", "قفاز", "مريلة",
    "برطمان", "زجاجة",
    // Office
    "كتاب", "دفتر", "ورقة", "قلم", "ممحاة", "مبراة", "مسطرة", "ملف", "مجلد", "مشبك", "ظرف", "ختم", "شريط", "دباسة",
    "خزانة", "صمغ", "آلة", "حاسب", "كمبيوتر", "لابتوب", "شاشة", "لوحة", "فأرة", "طابعة", "ماسح", "مكتب", "كرسي",
    // Home/Furniture
    "أريكة", "كنبة", "سرير", "دولاب", "رف", "مصباح", "مرآة", "سجادة", "بساط", "مرتبة", "وسادة", "لحاف", "بطانية",
    "ستارة", "مروحة", "تكييف", "مدفأة", "نجفة", "اباجورة", "برواز", "تحفة",
    // Tools
    "جاكوش", "شاكوش", "مطرقة", "مفك", "كماشة", "زردية", "منشار", "فأس", "متر", "مسامير", "برغي", "صامولة", "مفتاح",
    "دريل", "شنيور", "سلم", "فرشاة", "دهان",
    // Electronics
    "تلفزيون", "راديو", "موبايل", "هاتف", "جوال", "تابلت", "سماعة", "شاحن", "كابل", "وصلة", "فلاشة", "باوربانك",
    "كاميرا", "عدسة", "مايك",
    // Clothing
    "قميص", "بنطلون", "تشرت", "فستان", "جيبة", "تنورة", "حذاء", "جورب", "شراب", "قبعة", "ايشارب", "حجاب", "نظارة",
    "ساعة", "خاتم", "سلسلة", "عقد", "اسورة", "حزام", "جاكيت", "بدلة", "بيجامة", "روب", "شبشب", "صندل",
    // Misc
    "سيارة", "عربية", "عجلة", "دراجة", "موتوسيكل", "طيارة", "مركب", "قطار", "مترو", "اتوبيس"
];

// 2. SPARQL QUERIES (Deep Dive)
const JAMAD_SPARQL = [
    {
        label: 'Artificial Objects (Recursive)',
        // Q8205328 = "Artificial Object" - Very broad, will get thousands of results
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P31/wdt:P279* wd:Q8205328; rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 5000`
    },
    {
        label: 'Food (Recursive)',
        // Q2095 = "Food" - Often used as Jamad in game ("Something you eat")
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P31/wdt:P279* wd:Q2095; rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 3000`
    },
    {
        label: 'Machines',
        // Q11019 = Machine
        query: `SELECT DISTINCT ?label WHERE { ?item wdt:P31/wdt:P279* wd:Q11019; rdfs:label ?label. FILTER(LANG(?label) = "ar") } LIMIT 2000`
    }
];

// --- Helpers ---
function normalizeArabic(text: string): string {
    return text
        .trim()
        .replace(/[^\u0600-\u06FF\s]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة$/g, 'ه')
        .replace(/ى$/g, 'ي')
        // Normalize commonly confused chars if needed, but basic should suffice
        ;
}

function isValidWord(word: string): boolean {
    if (word.includes(' ')) return false;
    if (word.length < 2 || word.length > 15) return false;
    if (!/^[\u0600-\u06FF]+$/.test(word)) return false;

    // Noise filters
    const badPrefixes = ['قائمة', 'تصنيف', 'بوابة', 'فهرس', 'قالب', 'مستخدم', 'ويكيبيديا'];
    if (badPrefixes.some(p => word.startsWith(p))) return false;

    return true;
}

// --- Fetchers ---

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

        if (!res.ok) throw new Error(res.statusText || 'Fetch failed');

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
    console.log('--- Starting JAMAD (Inanimate Object) Enrichment ---');

    let database: WildcardDatabase = {};
    if (fs.existsSync(DB_PATH)) {
        database = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }

    let addedCount = 0;

    // 1. Process Hardcoded List
    addedCount += processWords(JAMAD_LISTS, 'جماد', database);
    console.log(`✅ Hardcoded List: Processed ${JAMAD_LISTS.length} items.`);

    // 2. Process SPARQL
    for (const source of JAMAD_SPARQL) {
        const words = await fetchSparql(source.query, source.label);
        addedCount += processWords(words, 'جماد', database);
    }

    // Save
    for (const letter in database) {
        for (const cat in database[letter]) {
            database[letter][cat].sort();
        }
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2), 'utf-8');

    console.log('--------------------------------');
    console.log(`JAMAD ENRICHMENT COMPLETE.`);
    console.log(`Added ${addedCount} NEW Jamad items.`);
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
