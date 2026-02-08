import { WildcardService } from '../services/wildcardService';

const service = WildcardService.getInstance();

const variants = ['كنغر', 'كنجرو', 'كانغرو', 'كانجارو', 'كانجرو'];
const letter = 'ك';
const category = 'حيوان';

console.log(`🦘 Checking for Kangaroo variants in [${letter}][${category}]...`);

variants.forEach(word => {
    const isValid = service.validateWord(letter, category, word);
    if (!isValid) {
        console.log(`❌ Missing: ${word}`);
        const added = service.addWord(letter, category, word);
        if (added) console.log(`   ↳ ✅ Added '${word}' to database.`);
    } else {
        console.log(`✅ Present: ${word}`);
    }
});

console.log("Done.");
