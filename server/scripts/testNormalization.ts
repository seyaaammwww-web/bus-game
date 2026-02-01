
import { WildcardService } from '../services/wildcardService';

const service = WildcardService.getInstance();

// Mock adding the standard word to DB for testing if not present
// "يحيى" is standard.
service.addWord('ي', 'ولد', 'يحيى');

const cases = [
    { input: 'يحيى', expected: true, desc: 'Exact Match' },
    { input: 'يحى', expected: true, desc: 'Alef Maqsura instead of Yaa at end (Variant 1)' },
    { input: 'يحي', expected: true, desc: 'Yaa instead of Alef Maqsura (Common Misspelling)' },
    { input: 'يحيي', expected: true, desc: 'Double Yaa' }
];

console.log("--- Testing 'Yahya' Variants ---");
let passed = 0;
for (const c of cases) {
    const valid = service.validateWord('ي', 'ولد', c.input);
    const result = valid === c.expected ? "✅ PASS" : "❌ FAIL";
    if (valid === c.expected) passed++;
    console.log(`${result} | Input: ${c.input} | Expected: ${c.expected}`);
}

console.log(`\nResult: ${passed}/${cases.length} passed.`);
