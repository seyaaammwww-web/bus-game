
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAIN_DB_PATH = path.join(__dirname, '../data/wildcardDatabase.json');
const ENRICHED_CHUNK_PATH = path.join(__dirname, '../data/ai_review_chunks/part_9_ن_هـ_و.txt');

async function mergeDatabase() {
    console.log('🔄 Starting merge process...');

    // 1. Read Main DB
    if (!fs.existsSync(MAIN_DB_PATH)) {
        console.error('❌ Main database file not found!');
        process.exit(1);
    }
    const mainDbRaw = fs.readFileSync(MAIN_DB_PATH, 'utf-8');
    let mainDb: any;
    try {
        mainDb = JSON.parse(mainDbRaw);
    } catch (e) {
        console.error('❌ Failed to parse main database JSON:', e);
        process.exit(1);
    }

    // 2. Read Enriched Chunk
    if (!fs.existsSync(ENRICHED_CHUNK_PATH)) {
        console.error('❌ Enriched chunk file not found:', ENRICHED_CHUNK_PATH);
        process.exit(1);
    }
    const chunkRaw = fs.readFileSync(ENRICHED_CHUNK_PATH, 'utf-8');
    let chunkDb: any;
    try {
        chunkDb = JSON.parse(chunkRaw);
    } catch (e) {
        console.error('❌ Failed to parse enriched chunk JSON:', e);
        process.exit(1);
    }

    // 3. Merge Strategies
    // The chunk contains keys like "أ", "ب", "ت". We simply overwrite these keys in the main DB with the new enriched data.
    const lettersToUpdate = Object.keys(chunkDb);
    console.log(`📝 Updating letters: ${lettersToUpdate.join(', ')}`);

    lettersToUpdate.forEach(letter => {
        mainDb[letter] = chunkDb[letter];
        // console.log(`   - Updated ${letter} with ${Object.keys(chunkDb[letter].ولد).length} names in 'ولد'`);
    });

    // 4. Write Back
    // Backup first
    fs.copyFileSync(MAIN_DB_PATH, MAIN_DB_PATH + '.bak');
    console.log('💾 Backup created: wildcardDatabase.json.bak');

    fs.writeFileSync(MAIN_DB_PATH, JSON.stringify(mainDb, null, 2), 'utf-8');

    console.log('✅ Merge complete! Database updated successfully.');
}

mergeDatabase();
