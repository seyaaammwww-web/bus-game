
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(process.cwd(), 'server/data/clean_wildcardDatabase.json');

function fixDatabase() {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

    // Fix 'هـ' -> 'ه'
    if (data['هـ']) {
        console.log("Found suspicious key 'هـ'. Merging into 'ه'...");

        if (!data['ه']) data['ه'] = {};

        for (const cat in data['هـ']) {
            if (!data['ه'][cat]) data['ه'][cat] = [];
            // Merge arrays
            data['ه'][cat].push(...data['هـ'][cat]);
        }

        // Delete bad key
        delete data['هـ'];
    }

    // sort and de-dup
    for (const letter in data) {
        for (const cat in data[letter]) {
            const unique = [...new Set(data[letter][cat])];
            data[letter][cat] = unique.sort();
        }
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log("✅ Database repaired and saved.");
}

fixDatabase();
