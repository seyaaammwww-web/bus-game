import { WildcardService } from '../services/wildcardService';

const service = WildcardService.getInstance();

console.log("🛠️ Fixing missing word 'Amira'...");
const success = service.addWord('أ', 'بنت', 'أميرة');

if (success) {
    console.log("✅ Successfully added 'أميرة' to database.");
} else {
    console.log("⚠️ Failed to add 'أميرة'. It might already exist (check normalization).");
}

// Verify immediately
const check = service.validateWord('أ', 'بنت', 'اميرة');
console.log(`Verifying 'اميرة': ${check ? '✅ VALID' : '❌ INVALID'}`);
