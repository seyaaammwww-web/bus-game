import { SmartToleranceEngine } from '../utils/SmartToleranceEngine';
import { AdvancedNormalizer } from '../utils/AdvancedNormalizer';

const engine = SmartToleranceEngine.getInstance();
const normalizer = AdvancedNormalizer.getInstance();

const testCases = [
    // [Input, DB_Word, ExpectedResult, Description]
    ['كنجرو', 'كنغر', true, 'Phonetic: Kengar vs Kangro (Wait, specific case)'],
    ['كانغرو', 'كنغر', true, 'Phonetic/Fuzzy Mix'],
    ['سعبان', 'ثعبان', true, 'Phonetic: S vs Th'],
    ['زرة', 'ذرة', true, 'Phonetic: Z vs Dh'],
    ['ميكروباس', 'ميكروباص', true, 'Levenshtein: S vs Sad (1 edit)'],
    ['اميره', 'أميرة', true, 'Normalizer: E vs A (Standard)'],
    ['كاتب', 'كتب', false, 'Different words (Short length strictness)'],
    ['قطة', 'قطه', true, 'Taa Marbuta normalization'],
    ['موبيل', 'موبايل', true, 'Levenshtein: Missing Alef'],
    ['بكين', 'بكبن', true, 'Levenshtein: Y vs B typo (1 edit)'],
    ['غزال', 'جزال', true, 'Phonetic: G vs J (Egyptian G)'],
];

console.log("🪞 Project MIRROR Verification Suite");
console.log("===================================");

let passed = 0;

for (const [input, target, expected, desc] of testCases) {
    const isMatch = engine.isMatch(input as string, target as string);
    const skeleton1 = normalizer.getPhoneticSkeleton(input as string);
    const skeleton2 = normalizer.getPhoneticSkeleton(target as string);

    // Manual similarity check for debug
    // @ts-ignore
    const score = engine.getSimilarityScore(input, target);

    const status = isMatch === expected ? "✅ PASS" : "❌ FAIL";
    if (isMatch === expected) passed++;

    console.log(`Test: "${input}" vs "${target}"`);
    console.log(`   Desc: ${desc}`);
    console.log(`   Skeletons: ${skeleton1} vs ${skeleton2}`);
    console.log(`   Result: ${isMatch} (Expected: ${expected})`);
    console.log(`   Status: ${status}`);
    console.log("---");
}

console.log(`\nResults: ${passed}/${testCases.length} Passed.`);
console.log("===================================");
