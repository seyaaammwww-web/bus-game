import { WildcardService } from '../services/wildcardService';

/**
 * Comprehensive Validation Test Suite
 * Tests all advanced features with 100+ test cases
 */

async function runTests() {
    console.log('🧪 Starting Comprehensive Validation Tests (100+ Cases)\n');
    console.log('='.repeat(80));

    const service = WildcardService.getInstance();
    let passed = 0;
    let failed = 0;

    // Test helper
    function test(description: string, letter: string, category: string, word: string, expected: boolean) {
        const result = service.validateWord(letter, category, word);
        const status = result === expected ? '✅' : '❌';

        if (result === expected) {
            passed++;
        } else {
            failed++;
            console.log(`${status} FAIL: ${description}`);
            console.log(`  Word: "${word}" | Letter: "${letter}" | Category: "${category}"`);
            console.log(`  Expected: ${expected}, Got: ${result}\n`);
        }
    }

    // ========== TEST SUITE 1: Article Tolerance (ال) ==========
    console.log('\n📋 Test Suite 1: Article Tolerance (ال) - 15 tests\n');

    test('Accept الجزائر with article', 'ج', 'بلد', 'الجزائر', true);
    test('Accept جزائر without article', 'ج', 'بلد', 'جزائر', true);
    test('Accept المغرب with article', 'م', 'بلد', 'المغرب', true);
    test('Accept مغرب without article', 'م', 'بلد', 'مغرب', true);
    test('Accept السعودية with article', 'س', 'بلد', 'السعودية', true);
    test('Accept سعودية without article', 'س', 'بلد', 'سعودية', true);
    test('Accept الأسد with article', 'ا', 'حيوان', 'الأسد', true);
    test('Accept أسد without article', 'ا', 'حيوان', 'أسد', true);
    test('Accept القط with article', 'ق', 'حيوان', 'القط', true);
    test('Accept قط without article', 'ق', 'حيوان', 'قط', true);
    test('Accept السيارة with article', 'س', 'جماد', 'السيارة', true);
    test('Accept سيارة without article', 'س', 'جماد', 'سيارة', true);
    test('Accept الكرسي with article', 'ك', 'جماد', 'الكرسي', true);
    test('Accept كرسي without article', 'ك', 'جماد', 'كرسي', true);
    test('Reject wrong letter with article', 'م', 'حيوان', 'الأسد', false);

    // ========== TEST SUITE 2: Hamza Normalization ==========
    console.log('\n📋 Test Suite 2: Hamza Normalization - 20 tests\n');

    // Names with hamza
    test('Accept أحمد with hamza', 'ا', 'ولد', 'أحمد', true);
    test('Accept احمد without hamza', 'ا', 'ولد', 'احمد', true);
    test('Accept إبراهيم with kasra hamza', 'ا', 'ولد', 'إبراهيم', true);
    test('Accept ابراهيم without hamza', 'ا', 'ولد', 'ابراهيم', true);
    test('Accept إسماعيل with hamza', 'ا', 'ولد', 'إسماعيل', true);
    test('Accept اسماعيل without hamza', 'ا', 'ولد', 'اسماعيل', true);
    test('Accept أمين with hamza', 'ا', 'ولد', 'أمين', true);
    test('Accept امين without hamza', 'ا', 'ولد', 'امين', true);
    test('Accept إيمان with hamza', 'ا', 'بنت', 'إيمان', true);
    test('Accept ايمان without hamza', 'ا', 'بنت', 'ايمان', true);
    test('Accept آمنة with mad hamza', 'ا', 'بنت', 'آمنة', true);
    test('Accept امنة without hamza', 'ا', 'بنت', 'امنة', true);

    // Places with hamza
    test('Accept الإسكندرية with hamza', 'ا', 'بلد', 'الإسكندرية', true);
    test('Accept اسكندرية without hamza', 'ا', 'بلد', 'اسكندرية', true);
    test('Accept أسوان with hamza', 'ا', 'بلد', 'أسوان', true);
    test('Accept اسوان without hamza', 'ا', 'بلد', 'اسوان', true);
    test('Accept الأردن with hamza', 'ا', 'بلد', 'الأردن', true);
    test('Accept اردن without hamza', 'ا', 'بلد', 'اردن', true);
    test('Accept الإمارات with hamza', 'ا', 'بلد', 'الإمارات', true);
    test('Accept امارات without hamza', 'ا', 'بلد', 'امارات', true);

    // ========== TEST SUITE 3: Taa Marbuta (ة/ه) ==========
    console.log('\n📋 Test Suite 3: Taa Marbuta Normalization - 15 tests\n');

    test('Accept فاطمة with taa marbuta', 'ف', 'بنت', 'فاطمة', true);
    test('Accept فاطمه with haa', 'ف', 'بنت', 'فاطمه', true);
    test('Accept عائشة with taa marbuta', 'ع', 'بنت', 'عائشة', true);
    test('Accept عائشه with haa', 'ع', 'بنت', 'عائشه', true);
    test('Accept خديجة with taa marbuta', 'خ', 'بنت', 'خديجة', true);
    test('Accept خديجه with haa', 'خ', 'بنت', 'خديجه', true);
    test('Accept سيارة with taa marbuta', 'س', 'جماد', 'سيارة', true);
    test('Accept سياره with haa', 'س', 'جماد', 'سياره', true);
    test('Accept قطة with taa marbuta', 'ق', 'حيوان', 'قطة', true);
    test('Accept قطه with haa', 'ق', 'حيوان', 'قطه', true);
    test('Accept القاهرة with taa marbuta', 'ق', 'بلد', 'القاهرة', true);
    test('Accept قاهره with haa', 'ق', 'بلد', 'قاهره', true);
    test('Accept طاولة with taa marbuta', 'ط', 'جماد', 'طاولة', true);
    test('Accept طاوله with haa', 'ط', 'جماد', 'طاوله', true);
    test('Accept مدرسة with taa marbuta', 'م', 'جماد', 'مدرسة', true);

    // ========== TEST SUITE 4: Yaa/Alef Maqsura (ى/ي) ==========
    console.log('\n📋 Test Suite 4: Yaa/Alef Maqsura Variations - 15 tests\n');

    test('Accept يحيى canonical', 'ي', 'ولد', 'يحيى', true);
    test('Accept يحيي variation', 'ي', 'ولد', 'يحيي', true);
    test('Accept يحي short variation', 'ي', 'ولد', 'يحي', true);
    test('Accept موسى canonical', 'م', 'ولد', 'موسى', true);
    test('Accept موسي variation', 'م', 'ولد', 'موسي', true);
    test('Accept مصطفى canonical', 'م', 'ولد', 'مصطفى', true);
    test('Accept مصطفي variation', 'م', 'ولد', 'مصطفي', true);
    test('Accept سلمى canonical', 'س', 'بنت', 'سلمى', true);
    test('Accept سلمي variation', 'س', 'بنت', 'سلمي', true);
    test('Accept ليلى canonical', 'ل', 'بنت', 'ليلى', true);
    test('Accept ليلي variation', 'ل', 'بنت', 'ليلي', true);
    test('Accept منى canonical', 'م', 'بنت', 'منى', true);
    test('Accept مني variation', 'م', 'بنت', 'مني', true);
    test('Accept هدى canonical', 'ه', 'بنت', 'هدى', true);
    test('Accept هدي variation', 'ه', 'بنت', 'هدي', true);

    // ========== TEST SUITE 5: Compound Names (عبد) ==========
    console.log('\n📋 Test Suite 5: Compound Names - 10 tests\n');

    test('Accept عبدالله connected', 'ع', 'ولد', 'عبدالله', true);
    test('Accept عبد الله separated', 'ع', 'ولد', 'عبد الله', true);
    test('Accept عبدالرحمن connected', 'ع', 'ولد', 'عبدالرحمن', true);
    test('Accept عبد الرحمن separated', 'ع', 'ولد', 'عبد الرحمن', true);
    test('Accept عبدالعزيز connected', 'ع', 'ولد', 'عبدالعزيز', true);
    test('Accept عبد العزيز separated', 'ع', 'ولد', 'عبد العزيز', true);
    test('Accept عبدالكريم connected', 'ع', 'ولد', 'عبدالكريم', true);
    test('Accept عبد الكريم separated', 'ع', 'ولد', 'عبد الكريم', true);
    test('Accept عبدالله with hamza', 'ع', 'ولد', 'عبدالله', true);
    test('Accept عبدالرحمن with hamza', 'ع', 'ولد', 'عبدالرحمن', true);

    // ========== TEST SUITE 6: Synonyms - Animals ==========
    console.log('\n📋 Test Suite 6: Animal Synonyms - 15 tests\n');

    test('Accept قط', 'ق', 'حيوان', 'قط', true);
    test('Accept قطة synonym', 'ق', 'حيوان', 'قطة', true);
    test('Accept هر synonym', 'ه', 'حيوان', 'هر', true);
    test('Accept بس colloquial', 'ب', 'حيوان', 'بس', true);
    test('Accept أسد', 'ا', 'حيوان', 'أسد', true);
    test('Accept سبع synonym', 'س', 'حيوان', 'سبع', true);
    test('Accept ليث synonym', 'ل', 'حيوان', 'ليث', true);
    test('Accept حصان', 'ح', 'حيوان', 'حصان', true);
    test('Accept فرس synonym', 'ف', 'حيوان', 'فرس', true);
    test('Accept جواد synonym', 'ج', 'حيوان', 'جواد', true);
    test('Accept جمل', 'ج', 'حيوان', 'جمل', true);
    test('Accept ثعبان', 'ث', 'حيوان', 'ثعبان', true);
    test('Accept حية synonym', 'ح', 'حيوان', 'حية', true);
    test('Accept أفعى synonym', 'ا', 'حيوان', 'أفعى', true);
    test('Accept نمر', 'ن', 'حيوان', 'نمر', true);

    // ========== TEST SUITE 7: Synonyms - Objects ==========
    console.log('\n📋 Test Suite 7: Object Synonyms - 20 tests\n');

    test('Accept سيارة', 'س', 'جماد', 'سيارة', true);
    test('Accept عربية synonym', 'ع', 'جماد', 'عربية', true);
    test('Accept تلفاز', 'ت', 'جماد', 'تلفاز', true);
    test('Accept تلفزيون synonym', 'ت', 'جماد', 'تلفزيون', true);
    test('Accept تليفزيون synonym', 'ت', 'جماد', 'تليفزيون', true);
    test('Accept هاتف', 'ه', 'جماد', 'هاتف', true);
    test('Accept موبايل synonym', 'م', 'جماد', 'موبايل', true);
    test('Accept جوال synonym', 'ج', 'جماد', 'جوال', true);
    test('Accept كرسي', 'ك', 'جماد', 'كرسي', true);
    test('Accept مقعد synonym', 'م', 'جماد', 'مقعد', true);
    test('Accept طاولة', 'ط', 'جماد', 'طاولة', true);
    test('Accept منضدة synonym', 'م', 'جماد', 'منضدة', true);
    test('Accept ترابيزة colloquial', 'ت', 'جماد', 'ترابيزة', true);
    test('Accept ثلاجة', 'ث', 'جماد', 'ثلاجة', true);
    test('Accept براد synonym', 'ب', 'جماد', 'براد', true);
    test('Accept حاسوب', 'ح', 'جماد', 'حاسوب', true);
    test('Accept كمبيوتر synonym', 'ك', 'جماد', 'كمبيوتر', true);
    test('Accept مرآة', 'م', 'جماد', 'مرآة', true);
    test('Accept مراة variation', 'م', 'جماد', 'مراة', true);
    test('Accept مرايه variation', 'م', 'جماد', 'مرايه', true);

    // ========== TEST SUITE 8: Synonyms - Places ==========
    console.log('\n📋 Test Suite 8: Place Synonyms - 10 tests\n');

    test('Accept مصر', 'م', 'بلد', 'مصر', true);
    test('Accept القاهرة', 'ق', 'بلد', 'القاهرة', true);
    test('Accept قاهرة without article', 'ق', 'بلد', 'قاهرة', true);
    test('Accept الإسكندرية', 'ا', 'بلد', 'الإسكندرية', true);
    test('Accept اسكندرية variation', 'ا', 'بلد', 'اسكندرية', true);
    test('Accept السعودية', 'س', 'بلد', 'السعودية', true);
    test('Accept سعودية without article', 'س', 'بلد', 'سعودية', true);
    test('Accept الرياض', 'ر', 'بلد', 'الرياض', true);
    test('Accept دبي', 'د', 'بلد', 'دبي', true);
    test('Accept أبوظبي', 'ا', 'بلد', 'أبوظبي', true);

    // ========== TEST SUITE 9: Letter Validation ==========
    console.log('\n📋 Test Suite 9: Letter Validation - 10 tests\n');

    test('Reject wrong letter', 'م', 'ولد', 'أحمد', false);
    test('Reject wrong letter', 'ا', 'ولد', 'محمد', false);
    test('Accept correct letter', 'م', 'ولد', 'محمد', true);
    test('Accept correct letter', 'ا', 'ولد', 'أحمد', true);
    test('Reject wrong letter with article', 'ك', 'حيوان', 'الأسد', false);
    test('Accept correct letter with article', 'ا', 'حيوان', 'الأسد', true);
    test('Reject wrong letter', 'س', 'بلد', 'مصر', false);
    test('Accept correct letter', 'م', 'بلد', 'مصر', true);
    test('Reject wrong letter', 'ق', 'جماد', 'سيارة', false);
    test('Accept correct letter', 'س', 'جماد', 'سيارة', true);

    // ========== TEST SUITE 10: Edge Cases ==========
    console.log('\n📋 Test Suite 10: Edge Cases - 10 tests\n');

    test('Reject empty string', 'م', 'ولد', '', false);
    test('Reject single character', 'م', 'ولد', 'م', false);
    test('Reject non-Arabic', 'م', 'ولد', 'Mohamed', false);
    test('Accept with diacritics', 'م', 'ولد', 'مُحَمَّد', true);
    test('Accept with full diacritics', 'ا', 'ولد', 'أَحْمَد', true);
    test('Reject very long string', 'م', 'ولد', 'م'.repeat(50), false);
    test('Accept normal length', 'م', 'ولد', 'محمد', true);
    test('Reject mixed Arabic-English', 'م', 'ولد', 'محمدMohamed', false);
    test('Accept with spaces (compound)', 'ع', 'ولد', 'عبد الله', true);
    test('Reject only spaces', 'م', 'ولد', '   ', false);

    // ========== RESULTS ==========
    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Test Results:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

    if (failed === 0) {
        console.log('🎉 Perfect! All tests passed! The validation system is working flawlessly!\n');
    } else if (failed <= 5) {
        console.log('✨ Excellent! Only minor issues detected.\n');
    } else if (failed <= 10) {
        console.log('⚠️  Good, but some improvements needed.\n');
    } else {
        console.log('⚠️  Several tests failed. Review the output above for details.\n');
    }

    // Display database stats
    console.log('='.repeat(80));
    console.log('\n📊 Database Statistics:\n');
    const stats = service.getStats();
    console.log(`Letters: ${stats.letters}`);
    console.log(`Categories per letter: ${stats.categoriesPerLetter}`);
    console.log(`Total words: ${stats.totalAnswers.toLocaleString()}`);
    console.log(`Average per category: ${stats.averagePerCategory}`);
    console.log(`Cache size: ${stats.cacheSize}\n`);
    console.log('='.repeat(80));
}

// Run tests
runTests().catch(console.error);
