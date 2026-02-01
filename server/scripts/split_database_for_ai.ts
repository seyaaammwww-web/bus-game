
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_PATH = path.join(__dirname, '../data/wildcardDatabase.json');
const OUTPUT_DIR = path.join(__dirname, '../data/ai_review_chunks');

interface WildcardDB {
    [letter: string]: {
        [category: string]: string[];
    };
}

async function splitDatabase() {
    console.log('📖 Reading source database...');

    if (!fs.existsSync(SOURCE_PATH)) {
        console.error(`❌ Source file not found: ${SOURCE_PATH}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(SOURCE_PATH, 'utf-8');
    let fullDb: WildcardDB = {};

    try {
        fullDb = JSON.parse(rawData);
    } catch (error) {
        console.error('❌ Failed to parse source JSON:', error);
        process.exit(1);
    }

    // Create output directory if not exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        console.log(`📂 Creating output directory: ${OUTPUT_DIR}`);
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Get all letters and group them
    const letters = Object.keys(fullDb); // No sort, keep original order if possible, or sort?
    // Sorting generic ar-EG letters might be better for organization
    // Standard Arabic Order: abjad... no, commonly alif ba ta...

    const chunkSize = 3; // 3 letters per file seems manageable for an LLM prompt context window

    let chunkIndex = 1;
    for (let i = 0; i < letters.length; i += chunkSize) {
        const chunkLetters = letters.slice(i, i + chunkSize);
        const chunkData: WildcardDB = {};

        chunkLetters.forEach(letter => {
            chunkData[letter] = fullDb[letter];
        });

        // Create a filename safe letters string (some OS don't like Arabic in filenames, but Windows usually fine, 
        // better to use numeric index + generic name or try to map)
        // To be safe and clean: "part_01_letters.json" and put the letters in content, 
        // OR "part_01.json".
        // User wants "Smart split". Let's name it part_X_letters.json

        // Sanitize letters for filename just in case (though Windows usually handles utf8)
        // We'll stick to "chunk_01.json", "chunk_02.json" etc. and add a generated text file describing what's in inside if needed,
        // OR just trust utf8. Let's try utf8 filenames for clarity "part_1_أ_ب_ت.json"

        const lettersStr = chunkLetters.join('_');

        // User requested .txt extension
        const fileName = `part_${chunkIndex}_${lettersStr}.txt`.replace(/[^a-zA-Z0-9_\u0600-\u06FF.]/g, '');
        const filePath = path.join(OUTPUT_DIR, fileName);

        fs.writeFileSync(filePath, JSON.stringify(chunkData, null, 2), 'utf-8');
        console.log(`✅ Created: ${fileName} (${chunkLetters.length} letters)`);
        chunkIndex++;
    }

    // Cleanup old json files if any
    const oldFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json'));
    oldFiles.forEach(f => fs.unlinkSync(path.join(OUTPUT_DIR, f)));
    if (oldFiles.length > 0) console.log(`🧹 Cleaned up ${oldFiles.length} old .json files.`);

    console.log(`\n🎉 Done! Split ${letters.length} letters into ${chunkIndex - 1} text files in '${OUTPUT_DIR}'.`);
}

splitDatabase();
