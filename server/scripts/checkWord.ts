import { WildcardService } from '../services/wildcardService';

const service = WildcardService.getInstance();
const letter = 'أ';
const category = 'بنت';
const word = 'اميرة'; // User input (no Hamza)

console.log(`Checking '${word}' for Letter '${letter}' and Category '${category}'...`);

// 1. Direct Validation Check
const isValid = service.validateWord(letter, category, word);
console.log(`Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

// 2. Debugging Database Content
// Access private database via 'any' casting to see what's actually there
const db = (service as any).database;
const key = (service as any).getDatabaseKey(letter);
console.log(`Database Key for '${letter}': ${key}`);

if (key && db[key] && db[key][category]) {
    const list = db[key][category];
    console.log(`Found ${list.length} words in category.`);
    const found = list.find((w: string) => w.includes('ميرة')); // Search for partial match
    console.log(`Closest match in DB: ${found || 'NONE'}`);
} else {
    console.log("Category or Letter not found in DB.");
}
