
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(process.cwd(), 'server/data/clean_wildcardDatabase.json');

function verifyIntegrity() {
    console.log("--- Starting Integrity Check ---");

    if (!fs.existsSync(DB_PATH)) {
        console.error("❌ Database file missing!");
        process.exit(1);
    }

    try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        const db = JSON.parse(raw);
        console.log("✅ JSON is valid.");

        let issues = 0;
        let totalWords = 0;
        const validLetters = /^[\u0600-\u06FF]$/;

        for (const letter in db) {
            // Check Letter Key
            if (!validLetters.test(letter)) {
                console.warn(`⚠️ Suspicious Letter Key: '${letter}'`);
                issues++;
            }

            for (const category in db[letter]) {
                const words = db[letter][category];

                if (!Array.isArray(words)) {
                    console.error(`❌ Category ${letter}:${category} is not an array!`);
                    issues++;
                    continue;
                }

                // Check Duplicates in memory for this category
                const seen = new Set();
                for (const word of words) {
                    totalWords++;

                    if (typeof word !== 'string') {
                        console.error(`❌ Non-string value in ${letter}:${category}:`, word);
                        issues++;
                    } else if (word.trim() === '') {
                        console.warn(`⚠️ Empty word in ${letter}:${category}`);
                        issues++;
                    }

                    if (seen.has(word)) {
                        console.warn(`⚠️ Duplicate word in ${letter}:${category}: ${word}`);
                        issues++;
                    }
                    seen.add(word);
                }
            }
        }

        if (issues === 0) {
            console.log(`✅ Integrity Check Passed. Scanned ${totalWords} words. No issues found.`);
        } else {
            console.log(`⚠️ Investigation Complete. Found ${issues} potential issues.`);
        }

    } catch (e) {
        console.error("❌ CRITICAL: Corrupt JSON file.", e);
    }
}

verifyIntegrity();
