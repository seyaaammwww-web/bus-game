
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
    // Allow spaces but not excessive
    if (word.length < 2 || word.length > 25) return false;

    // Arabic + spaces only check (loose)
    // if (!/^[\u0600-\u06FF\s]+$/.test(word)) return false; 

    // Wiki noise
    if (word.startsWith('قائمة')) return false;
    if (word.startsWith('تصنيف')) return false;
    if (word.startsWith('فهرس')) return false;
    if (word.startsWith('بوابة')) return false;
    if (word.startsWith('مشروع')) return false;
    if (word.startsWith('قالب')) return false;
    if (word.includes('(')) return false;

    return true;
}

async function main() {
    console.log('--- FINAL POLISH & STATISTICS ---');

    if (!fs.existsSync(DB_PATH)) {
        console.error('Database file not found!');
        return;
    }

    const db: WildcardDatabase = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    let totalWords = 0;
    let removedCount = 0;

    // Standard Categories
    const letters = 'abeiothjzxrsdqkglmnwy'.split(''); // Needs Arabic letters actually
    // Arabic Alphabet:
    const arabicLetters = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('');

    // Ensure all letters exist
    for (const char of arabicLetters) {
        if (!db[char]) db[char] = {};
    }

    // Process
    for (const letter in db) {
        // Merge 'بلاد' into 'بلد' if exists
        if (db[letter]['بلاد']) {
            if (!db[letter]['بلد']) db[letter]['بلد'] = [];
            db[letter]['بلد'].push(...db[letter]['بلاد']);
            delete db[letter]['بلاد'];
        }

        // Clean categories
        for (const cat in db[letter]) {
            const originalList = db[letter][cat];
            const uniqueSet = new Set<string>();
            const cleanedList: string[] = [];

            for (const word of originalList) {
                let cleanWord = word.trim();

                // Remove trailing dots etc
                cleanWord = cleanWord.replace(/[.,;]$/, '');

                if (isValidWord(cleanWord)) {
                    // Check for near-duplicates?
                    // For now, let's just use exact match to preserve variations if meaningful
                    if (!uniqueSet.has(cleanWord)) {
                        uniqueSet.add(cleanWord);
                        cleanedList.push(cleanWord);
                    } else {
                        removedCount++;
                    }
                } else {
                    removedCount++;
                }
            }

            // Sort
            cleanedList.sort((a, b) => a.localeCompare(b, 'ar'));
            db[letter][cat] = cleanedList;
            totalWords += cleanedList.length;
        }
    }

    // Totals per category
    const catStats: Record<string, number> = {};
    for (const letter in db) {
        for (const cat in db[letter]) {
            catStats[cat] = (catStats[cat] || 0) + db[letter][cat].length;
        }
    }

    // Save
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');

    console.log('--------------------------------');
    console.log(`Final Database Polish Complete.`);
    console.log(`Total Valid Words: ${totalWords}`);
    console.log(`Removed Invalid/Duplicate: ${removedCount}`);
    console.log('\n--- Statistics per Category ---');
    Object.entries(catStats)
        .sort(([, a], [, b]) => b - a)
        .forEach(([cat, count]) => {
            console.log(`${cat}: ${count}`);
        });
    console.log('--------------------------------');
}

main().catch(console.error);
