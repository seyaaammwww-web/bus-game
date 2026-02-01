
import * as fs from 'fs';
import * as path from 'path';

// Types
interface WildcardDatabase {
    [letter: string]: {
        [category: string]: string[];
    };
}

// Configuration
const CONFIG = {
    minLength: 2,
    maxLength: 15,
    blacklists: {
        'ولد': ['السيد', 'الطيب', 'الكبير', 'الصغير', 'ابو', 'أبو'],
        'بنت': ['السيدة', 'الحسناء', 'الجميلة', 'الست', 'ام', 'أم'],
        'بلد': ['المملكة', 'جمهورية', 'ولاية', 'إقليم', 'محافظة', 'قرية'],
        'حيوان': ['البحر', 'البر', 'الجبل', 'الصحراوي', 'النهري'],
        'جماد': ['الكهربائي', 'المنزلي', 'الحديث', 'الصغير', 'الكبير']
    },
    compoundPrefixes: ['أبو', 'أم', 'ابن', 'بنت', 'ذو', 'ذي', 'ال', 'وال', 'عبد']
};

function normalizeArabic(text: string): string {
    return text
        .trim()
        .replace(/[^\u0600-\u06FF\s]/g, '') // Keep only Arabic and spaces
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة$/g, 'ه')
        .replace(/ى$/g, 'ي');
}

function isComplexWord(word: string, category: string): boolean {
    // 1. Check for separators indicating multiple words or compound structure
    if (/[\s،\-_/]/.test(word)) {
        // Exception: Some valid names/cities have spaces (e.g., "أبو ظبي", "عبد الله")
        // But for a "simple" database, we might want to be strict or allow specific cases.
        // Let's implement the user's rule: "Reject words with more than one word" generally,
        // but maybe allow simple 2-part names if they are very common? 
        // For now, strict filter as per user request (filter_complex_words logic)

        // HOWEVER, "عبد الله" is very common. The user code in prompt suggested:
        // if len(parts) > 1 -> take first part if simple.
        // Let's stick to the "filter_complex_words" python logic provided:
        // "حذف الكلمات التي تحتوي على أكثر من كلمة" -> reject space.
        return true;
    }

    // 2. Length check
    if (word.length > CONFIG.maxLength || word.length < CONFIG.minLength) {
        return true;
    }

    // 3. Numbers check
    if (/\d/.test(word)) {
        return true;
    }

    // 4. Non-Arabic check
    if (!/^[\u0600-\u06FF\s]+$/.test(word)) {
        return true;
    }

    // 5. Compound prefixes check (heuristic)
    for (const prefix of CONFIG.compoundPrefixes) {
        if (word.startsWith(prefix) && word.length > prefix.length + 3) {
            // "أبو قردان" logic handled by space check above mostly, 
            // but handle cases like "أبوالهول" (no space)
            // If it starts with prefix and is long, it might be compound.
            // But "ال" is tricky. "البيت" is valid.
            if (prefix === 'ال' || prefix === 'وال') continue; // Skip definite article check here
            return true;
        }
    }

    return false;
}

function isBlacklisted(word: string, category: string): boolean {
    const list = CONFIG.blacklists[category as keyof typeof CONFIG.blacklists];
    if (!list) return false;

    // Check exact or partial match depending on strictness
    // User logic: "if word in blacklists"
    return list.some(bad => word.includes(bad));
}

function cleanDatabase() {
    const inputPath = path.join(process.cwd(), 'server', 'data', 'wildcardDatabase.json');
    const outputPath = path.join(process.cwd(), 'server', 'data', 'clean_wildcardDatabase.json');
    const backupPath = path.join(process.cwd(), 'server', 'data', 'wildcardDatabase.json.bak');

    console.log(`Reading from ${inputPath}...`);

    if (!fs.existsSync(inputPath)) {
        console.error("Input file not found!");
        return;
    }

    // Backup
    if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(inputPath, backupPath);
        console.log(`Backup created at ${backupPath}`);
    }

    const rawData = fs.readFileSync(inputPath, 'utf-8');
    const db: WildcardDatabase = JSON.parse(rawData);
    const cleanDb: WildcardDatabase = {};

    let totalOriginal = 0;
    let totalClean = 0;

    for (const letter in db) {
        cleanDb[letter] = {};
        for (const category in db[letter]) {
            const words = db[letter][category];
            const cleanWords = new Set<string>();

            for (const word of words) {
                totalOriginal++;

                // 1. Basic trim
                let processedWord = word.trim();

                // 2. Filter checks
                if (isComplexWord(processedWord, category)) continue;

                // 3. Blacklist check
                if (isBlacklisted(processedWord, category)) continue;

                // 4. "Simple word" extraction logic (from user prompt)
                // If it looks like a sentence or description, ignore.
                // If it's "الولد" -> "ولد" (Optional: Remove definite article? User didn't strictly ask, but often good)
                // User said: "حذف الكلمات التي تحتوي على أكثر من كلمة" -> done in isComplexWord

                // 5. Add to set (deduplication)
                // Normalize for deduplication check ONLY, but store original (or slightly cleaned)
                // Actually, let's store the "clean" looking version.
                // But we want to keep "أحمد" as "أحمد" not "احمد" for display?
                // User prompt: "normalize_arabic_word" removes hamzas.
                // Let's keep original spelling if valid, but dedup based on normalized.

                cleanWords.add(processedWord);
            }

            cleanDb[letter][category] = Array.from(cleanWords).sort();
            totalClean += cleanDb[letter][category].length;
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(cleanDb, null, 2), 'utf-8');

    console.log("--------------------------------------------------");
    console.log(`Cleaning Complete.`);
    console.log(`Total Words Processed: ${totalOriginal}`);
    console.log(`Total Words Retained:  ${totalClean}`);
    console.log(`Removed:               ${totalOriginal - totalClean}`);
    console.log(`Saved to: ${outputPath}`);
    console.log("--------------------------------------------------");
}

cleanDatabase();
