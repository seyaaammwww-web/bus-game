
import { WildcardService } from '../services/wildcardService';

async function testValidation() {
    const service = WildcardService.getInstance();

    console.log("--- Starting Validation Tests ---");

    const testCases = [
        // 1. Basic Valid Words (Clean DB Check)
        { letter: 'أ', category: 'ولد', word: 'أحمد', expected: true, desc: "Basic Name" },
        { letter: 'م', category: 'بلد', word: 'مصر', expected: true, desc: "Basic Country" },

        // 2. Synonyms / Flexible Matching (Jamad)
        { letter: 'ر', category: 'جماد', word: 'ريموت', expected: true, desc: "Jamad: Remote (Common)" },
        { letter: 'غ', category: 'جماد', word: 'غطا', expected: true, desc: "Jamad Synonym: GhoTa (for Ghataa)" },
        { letter: 'ب', category: 'جماد', word: 'براية', expected: true, desc: "Jamad Synonym: Baraya" },

        // 3. Normalization
        { letter: 'ا', category: 'ولد', word: 'احمد', expected: true, desc: "Normalization: Ahmed (No Hamza)" },
        { letter: 'ف', category: 'بنت', word: 'فاطمة', expected: true, desc: "Normalization: Fatma (Taa Marbuta)" },
        { letter: 'ف', category: 'بنت', word: 'فاطمه', expected: true, desc: "Normalization: Fatma (Haa)" },

        // 4. Invalid Cases
        { letter: 'ا', category: 'ولد', word: 'م', expected: false, desc: "Too short" },
        { letter: 'ا', category: 'ولد', word: 'سعيد', expected: false, desc: "Wrong Letter" },
        { letter: 'خ', category: 'حيوان', word: 'كرسي', expected: false, desc: "Wrong Category" },

        // 5. Letter Variant Check (Bug Fix Test)
        { letter: 'ا', category: 'ولد', word: 'إبراهيم', expected: true, desc: "Letter Variant: Alif/Ibrahim" },
        { letter: 'أ', category: 'ولد', word: 'إبراهيم', expected: true, desc: "Letter Variant: Alif/Ibrahim 2" },
    ];

    let passed = 0;
    for (const test of testCases) {
        const result = service.validateWord(test.letter, test.category, test.word);
        const status = result === test.expected ? "PASS" : `FAIL (Expected ${test.expected}, got ${result})`;
        console.log(`[${status}] ${test.desc} | ${test.letter}:${test.category} => ${test.word}`);
        if (result === test.expected) passed++;
    }

    console.log(`\nTests Completed: ${passed}/${testCases.length} Passed`);

    // Check Stats
    console.log("\nDatabase Stats:");
    console.log(service.getStats());
}

testValidation();
