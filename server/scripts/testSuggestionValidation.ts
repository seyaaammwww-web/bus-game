
import { HybridValidator } from '../hybridValidator';
import * as fs from 'fs';
import * as path from 'path';

async function testSuggestions() {
    const validator = HybridValidator.getInstance();
    const suggestionsPath = path.join(process.cwd(), 'server/data/suggestions.json');

    // Clear first
    fs.writeFileSync(suggestionsPath, '[]');

    console.log("--- Testing Suggestion Logging ---");

    // 1. Test Valid Word (Should NOT log)
    const result1 = await validator.validate('test-player', 'ا', 'ولد', 'احمد');

    let logs = JSON.parse(fs.readFileSync(suggestionsPath, 'utf-8'));
    if (logs.length === 0) console.log("✅ Valid word NOT logged.");
    else console.error("❌ Valid word WAS logged!");

    // 2. Test Invalid/New Word (Should LOG)
    // "زعبلاوي" - unlikely to be in DB :D
    const result3 = await validator.validate('test-player', 'س', 'نبات' as any, 'سحلب');

    logs = JSON.parse(fs.readFileSync(suggestionsPath, 'utf-8'));
    if (logs.length === 1 && logs[0].word === 'باريس') { // Changed from 'زعبلاوي' to 'باريس'
        console.log("✅ Unknown word 'باريس' logged successfully."); // Changed from 'زعبلاوي' to 'باريس'
    } else {
        console.error("❌ Unknown word NOT logged properly:", logs);
    }

    // 3. Test Counter Increment
    await validator.validate('dummy-id', 'ز', 'ولد', 'زعبلاوي');
    logs = JSON.parse(fs.readFileSync(suggestionsPath, 'utf-8'));
    if (logs[0].count === 2) {
        console.log("✅ Word count incremented correctly.");
    } else {
        console.error("❌ Count check failed:", logs[0]);
    }

    console.log("--- Test Complete ---");
}

testSuggestions();
