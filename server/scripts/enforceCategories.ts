
import * as fs from 'fs';
import * as path from 'path';

// --- Types ---
interface WildcardDatabase {
    [letter: string]: {
        [category: string]: string[];
    };
}

const DB_PATH = path.join(process.cwd(), 'server/data/clean_wildcardDatabase.json');

async function main() {
    console.log('--- STRICT CATEGORY ENFORCEMENT ---');

    if (!fs.existsSync(DB_PATH)) {
        console.error('Database file not found!');
        return;
    }

    const db: WildcardDatabase = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    let movedCount = 0;
    let deletedCount = 0;

    // Allowed Schema Categories:
    // 'ولد' (Boy), 'بنت' (Girl), 'حيوان' (Animal), 'جماد' (Inanimate), 'بلد' (Country)
    const allowed = new Set(['ولد', 'بنت', 'حيوان', 'جماد', 'بلد']);

    for (const letter in db) {
        // Init if missing
        if (!db[letter]['جماد']) db[letter]['جماد'] = [];

        // 1. Process 'أكل' (Food) -> Merge into 'جماد'
        if (db[letter]['أكل']) {
            const foods = db[letter]['أكل'];
            const destination = db[letter]['جماد'];
            for (const item of foods) {
                if (!destination.includes(item)) {
                    destination.push(item);
                    movedCount++;
                }
            }
            delete db[letter]['أكل'];
        }

        // 2. Process 'رياضة' (Sports) -> Merge into 'جماد'
        if (db[letter]['رياضة']) {
            const sports = db[letter]['رياضة'];
            const destination = db[letter]['جماد'];
            for (const item of sports) {
                if (!destination.includes(item)) {
                    destination.push(item);
                    movedCount++;
                }
            }
            delete db[letter]['رياضة'];
        }

        // 3. Process 'مهنة' (Jobs) -> Delete (People/Titles usually strict)
        if (db[letter]['مهنة']) {
            deletedCount += db[letter]['مهنة'].length;
            delete db[letter]['مهنة'];
        }

        // 4. Process 'نبات' (Plants) -> Delete (Strictly Nabat != Gamad in game rules usually)
        // If user wants Nabat, they must add it explicitly to schema.
        if (db[letter]['نبات']) {
            deletedCount += db[letter]['نبات'].length;
            delete db[letter]['نبات'];
        }

        // 5. Strictly remove any other unknown categories
        for (const cat in db[letter]) {
            if (!allowed.has(cat)) {
                console.log(`Removing unknown category: ${cat}`);
                deletedCount += db[letter][cat].length;
                delete db[letter][cat];
            }
        }

        // Sort standard categories
        for (const cat of allowed) {
            if (db[letter][cat]) {
                db[letter][cat] = [...new Set(db[letter][cat])].sort();
            }
        }
    }

    // Save
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');

    console.log('--------------------------------');
    console.log(`Category Enforcement Complete.`);
    console.log(`Merged (Food/Sports -> Inanimate): ${movedCount}`);
    console.log(`Deleted (Plants/Jobs/Other): ${deletedCount}`);

    // Stats
    const finalStats: Record<string, number> = {};
    for (const letter in db) {
        for (const cat in db[letter]) {
            finalStats[cat] = (finalStats[cat] || 0) + db[letter][cat].length;
        }
    }
    console.log('\n--- Final Categories ---');
    Object.entries(finalStats).forEach(([k, v]) => console.log(`${k}: ${v}`));
}

main().catch(console.error);
