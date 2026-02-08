import { WildcardService } from '../services/wildcardService';

/**
 * Comprehensive Validation Test Suite
 * Tests all advanced features of the new validation system
 */

async function runTests() {
    console.log('🧪 Starting Advanced Validation Tests\n');
    console.log('=' .repeat(60));

    const service = WildcardService.getInstance();
    let passed = 0;
    let failed = 0;

    // Test helper
    function test(description: string, letter: string, category: string, word: string, expected: boolean) {
        const result = service.validateWord(letter, category, word);
        const status = result === expected ? '✅ PASS' : '❌ FAIL';
        
        if (result === expected) {
            passed++;
        } else {
            failed++;
            console.log(`${status}: ${description}`);
            console.log(`  Word: "${word}" | Letter: "${letter}" | Category: "${category}"`);
            console.log(`  Expected: ${expected}, Got: ${result}\n`);
        }
    }

    console.log('\n📋 Test Suite 1: Article Tolerance (ال)\n');
    test('Accept word WITH article', 'ج', 'بلاد', 'الجزائر', true);
    test('Accept word WITHOUT article', 'ج', 'بلاد', 'جزائر', true);
    test('Accept word WITH article', 'م', 'بلاد', 'المغرب', true);
    test('Accept word WITHOUT article', 'م', 'بلاد', 'مغرب', true);
    test('Accept word WITH article', 'س', 'بلاد', 'السعودية', true);
    test('Accept word WITHOUT article', 'س', 'بلاد', 'سعودية', true);

    console.log('\n📋 Test Suite 2: Common Spelling Variations\n');
    test('Accept يحيى (canonical)', 'ي', 'ولد', 'يحيى', true);
    test('Accept يحيي (variation)', 'ي', 'ولد', 'يحيي', true);
    test('Accept يحي (variation)', 'ي', 'ولد', 'يحي', true);
    test('Accept موسى (canonical)', 'م', 'ولد', 'موسى', true);
    test('Accept موسي (variation)', 'م', 'ولد', 'موسي', true);
    test('Accept مصطفى (canonical)', 'م', 'ولد', 'مصطفى', true);
    test('Accept مصطفي (variation)', 'م', 'ولد', 'مصطفي', true);

    console.log('\n📋 Test Suite 3: Normalization (Hamza, Taa Marbuta)\n');
    test('Accept أحمد with hamza', 'ا', 'ولد', 'أحمد', true);
    test('Accept احمد without hamza', 'ا', 'ولد', 'احمد', true);
    test('Accept إبراهيم with hamza', 'ا', 'ولد', 'إبراهيم', true);
    test('Accept ابراهيم without hamza', 'ا', 'ولد', 'ابراهيم', true);
    test('Accept فاطمة with taa marbuta', 'ف', 'بنت', 'فاطمة', true);
    test('Accept فاطمه with haa', 'ف', 'بنت', 'فاطمه', true);

    console.log('\n📋 Test Suite 4: Fuzzy Matching (Typos)\n');
    test('Accept محمد (correct)', 'م', 'ولد', 'محمد', true);
    test('Accept محمذ (1 typo)', 'م', 'ولد', 'محمذ', true);
    test('Accept سيارة (correct)', 'س', 'جماد', 'سيارة', true);
    test('Accept سياره (taa marbuta typo)', 'س', 'جماد', 'سياره', true);

    console.log('\n📋 Test Suite 5: Synonyms\n');
    test('Accept سيارة', 'س', 'جماد', 'سيارة', true);
    test('Accept عربية (synonym)', 'ع', 'جماد', 'عربية', true);
    test('Accept قط', 'ق', 'حيوان', 'قط', true);
    test('Accept قطة (synonym)', 'ق', 'حيوان', 'قطة', true);

    console.log('\n📋 Test Suite 6: Letter Validation\n');
    test('Reject wrong letter', 'م', 'ولد', 'أحمد', false);
    test('Reject wrong letter', 'ا', 'ولد', 'محمد', false);
    test('Accept correct letter', 'م', 'ولد', 'محمد', true);
    test('Accept correct letter', 'ا', 'ولد', 'أحمد', true);

    console.log('\n📋 Test Suite 7: Real Game Scenarios\n');
    test('Accept مصر', 'م', 'بلاد', 'مصر', true);
    test('Accept أسد', 'ا', 'حيوان', 'أسد', true);
    test('Accept تفاح', 'ت', 'نبات', 'تفاح', true);
    test('Accept كرسي', 'ك', 'جماد', 'كرسي', true);
    test('Accept علي', 'ع', 'ولد', 'علي', true);
    test('Accept مريم', 'م', 'بنت', 'مريم', true);

    console.log('\n📋 Test Suite 8: Edge Cases\n');
    test('Reject empty string', 'م', 'ولد', '', false);
    test('Reject single character', 'م', 'ولد', 'م', false);
    test('Reject non-Arabic', 'م', 'ولد', 'Mohamed', false);
    test('Accept with diacritics', 'م', 'ولد', 'مُحَمَّد', true);

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Test Results:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

    if (failed === 0) {
        console.log('🎉 All tests passed! The validation system is working perfectly!\n');
    } else {
        console.log('⚠️  Some tests failed. Review the output above for details.\n');
    }

    // Display database stats
    console.log('=' .repeat(60));
    console.log('\n📊 Database Statistics:\n');
    const stats = service.getStats();
    console.log(`Letters: ${stats.letters}`);
    console.log(`Categories per letter: ${stats.categoriesPerLetter}`);
    console.log(`Total words: ${stats.totalAnswers}`);
    console.log(`Average per category: ${stats.averagePerCategory}`);
    console.log(`Cache size: ${stats.cacheSize}\n`);
}

// Run tests
runTests().catch(console.error);
