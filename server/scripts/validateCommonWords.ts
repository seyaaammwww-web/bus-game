/**
 * Script to validate that all common words are in the database
 * This ensures no common word is ever missing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../data/clean_wildcardDatabase.json');
const CHECKLIST_PATH = path.join(__dirname, '../data/common_words_checklist.json');

interface Database {
    [letter: string]: {
        [category: string]: string[];
    };
}

interface Checklist {
    [category: string]: {
        description: string;
        common_words: {
            [letter: string]: string[];
        };
    };
}

async function validateCommonWords() {
    console.log('🔍 Validating common words in database...\n');

    // Load database
    const db: Database = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

    // Load checklist
    const checklist: Checklist = JSON.parse(fs.readFileSync(CHECKLIST_PATH, 'utf8'));

    let totalMissing = 0;
    const missingWords: { category: string; letter: string; word: string }[] = [];

    // Check each category
    for (const [category, categoryData] of Object.entries(checklist)) {
        console.log(`📂 Checking category: ${category}`);
        console.log(`   ${categoryData.description}\n`);

        // Check each letter
        for (const [letter, words] of Object.entries(categoryData.common_words)) {
            if (words.length === 0) continue;

            const dbWords = db[letter]?.[category] || [];

            for (const word of words) {
                if (!dbWords.includes(word)) {
                    console.log(`   ❌ Missing: "${word}" (${category}, ${letter})`);
                    missingWords.push({ category, letter, word });
                    totalMissing++;
                }
            }
        }
        console.log('');
    }

    // Summary
    console.log('═'.repeat(60));
    if (totalMissing === 0) {
        console.log('✅ All common words are in the database!');
    } else {
        console.log(`❌ Found ${totalMissing} missing common words`);
        console.log('\nMissing words by category:');

        const byCategory = missingWords.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(`${item.word} (${item.letter})`);
            return acc;
        }, {} as Record<string, string[]>);

        for (const [category, words] of Object.entries(byCategory)) {
            console.log(`\n${category}:`);
            words.forEach(w => console.log(`  - ${w}`));
        }
    }
    console.log('═'.repeat(60));

    return { totalMissing, missingWords };
}

async function addMissingWords(missingWords: { category: string; letter: string; word: string }[]) {
    if (missingWords.length === 0) {
        console.log('\n✅ No words to add');
        return;
    }

    console.log(`\n📝 Adding ${missingWords.length} missing words to database...`);

    const db: Database = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

    for (const { category, letter, word } of missingWords) {
        if (!db[letter]) {
            db[letter] = {};
        }
        if (!db[letter][category]) {
            db[letter][category] = [];
        }
        if (!db[letter][category].includes(word)) {
            db[letter][category].push(word);
            console.log(`   ✅ Added: "${word}" to ${category}/${letter}`);
        }
    }

    // Sort all arrays
    for (const letter of Object.keys(db)) {
        for (const category of Object.keys(db[letter])) {
            db[letter][category].sort((a, b) => a.localeCompare(b, 'ar'));
        }
    }

    // Save database
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    console.log('\n✅ Database updated successfully!');

    // Also update wildcardDatabase.json
    const WILDCARD_DB_PATH = path.join(__dirname, '../data/wildcardDatabase.json');
    fs.writeFileSync(WILDCARD_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    console.log('✅ wildcardDatabase.json updated!');
}

// Main execution
(async () => {
    const { totalMissing, missingWords } = await validateCommonWords();

    if (totalMissing > 0) {
        console.log('\n❓ Do you want to add these words to the database? (y/n)');
        console.log('   Running in auto-mode: YES');
        await addMissingWords(missingWords);

        // Validate again
        console.log('\n🔄 Re-validating...\n');
        await validateCommonWords();
    }
})();
