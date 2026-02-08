import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(process.cwd(), 'server', 'data', 'clean_wildcardDatabase.json');

function mergePlants() {
    console.log("🌿 Initiating Plant -> Inanimate Merge Protocol...");

    if (!fs.existsSync(DB_PATH)) {
        console.error("❌ Database file not found!");
        return;
    }

    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    let movedCount = 0;
    let deletedCategories = 0;

    for (const letter of Object.keys(db)) {
        const letterData = db[letter];

        if (letterData['نبات']) {
            const plants = letterData['نبات'];

            if (!letterData['جماد']) {
                letterData['جماد'] = [];
            }

            // Merge uniqueness check
            const currentInanimate = new Set(letterData['جماد']);
            let addedForLetter = 0;

            for (const p of plants) {
                if (!currentInanimate.has(p)) {
                    letterData['جماد'].push(p);
                    addedForLetter++;
                }
            }

            // Sort
            letterData['جماد'].sort();

            // Delete original Plant category
            delete letterData['نبات'];

            movedCount += addedForLetter;
            deletedCategories++;
        }
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`✅ Merge Complete.`);
    console.log(`- Moved ${movedCount} words to 'جماد'.`);
    console.log(`- Removed 'نبات' from ${deletedCategories} letters.`);
}

mergePlants();
