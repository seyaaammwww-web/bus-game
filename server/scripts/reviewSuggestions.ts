
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { WildcardService } from '../services/wildcardService';

const SUGGESTIONS_PATH = path.join(process.cwd(), 'server/data/suggestions.json');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const service = WildcardService.getInstance();

async function main() {
    console.log("--- Community Suggestion Reviewer ---");

    if (!fs.existsSync(SUGGESTIONS_PATH)) {
        console.log("No suggestions file found.");
        process.exit(0);
    }

    const suggestions = JSON.parse(fs.readFileSync(SUGGESTIONS_PATH, 'utf-8'));
    if (suggestions.length === 0) {
        console.log("No pending suggestions.");
        process.exit(0);
    }

    // Sort by popularity (count)
    suggestions.sort((a: any, b: any) => b.count - a.count);

    let processedCount = 0;
    let acceptedCount = 0;
    const remainingSuggestions = [];

    for (const item of suggestions) {
        console.log('\n--------------------------------');
        console.log(`Word:     ${item.word}  (Count: ${item.count})`);
        console.log(`Category: ${item.category}`);
        console.log(`Seen:     ${new Date(item.lastSeen).toLocaleDateString()}`);

        const answer = await askQuestion("Action? (y=Accept / n=Delete / s=Skip / q=Quit): ");

        if (answer.toLowerCase() === 'q') {
            remainingSuggestions.push(item);
            // Push rest
            const currentIdx = suggestions.indexOf(item);
            for (let i = currentIdx + 1; i < suggestions.length; i++) {
                remainingSuggestions.push(suggestions[i]);
            }
            break;
        }

        if (answer.toLowerCase() === 'y') {
            service.addWord(item.letter, item.category, item.word);
            acceptedCount++;
            console.log("✅ Added to Database.");
        } else if (answer.toLowerCase() === 'n') {
            console.log("❌ Deleted from suggestions.");
        } else {
            console.log("⏭️ Skipped.");
            remainingSuggestions.push(item);
        }
        processedCount++;
    }

    // Save remaining
    fs.writeFileSync(SUGGESTIONS_PATH, JSON.stringify(remainingSuggestions, null, 2), 'utf-8');

    console.log('\n--- Review Session Complete ---');
    console.log(`Processed: ${processedCount}`);
    console.log(`Accepted:  ${acceptedCount}`);
    console.log(`Remaining: ${remainingSuggestions.length}`);

    process.exit(0);
}

function askQuestion(query: string): Promise<string> {
    return new Promise(resolve => rl.question(query, resolve));
}

main();
