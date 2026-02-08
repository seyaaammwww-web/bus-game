import { WildcardService } from '../services/wildcardService';

/**
 * Test to verify synonyms DON'T work across different letters
 */

async function testSynonymLetterValidation() {
    console.log('🧪 Testing Synonym Letter Validation\n');
    console.log('='.repeat(60));

    const service = WildcardService.getInstance();

    console.log('\n📋 Test: Synonyms should NOT work if letter is wrong\n');

    // Test 1: سيارة with letter س - should PASS
    const test1 = service.validateWord('س', 'جماد', 'سيارة');
    console.log(`Test 1: Letter س + Word "سيارة" → ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Expected: true, Got: ${test1}\n`);

    // Test 2: عربية with letter ع - should PASS
    const test2 = service.validateWord('ع', 'جماد', 'عربية');
    console.log(`Test 2: Letter ع + Word "عربية" → ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Expected: true, Got: ${test2}\n`);

    // Test 3: عربية with letter س - should FAIL (wrong letter!)
    const test3 = service.validateWord('س', 'جماد', 'عربية');
    console.log(`Test 3: Letter س + Word "عربية" → ${test3 ? '❌ FAIL (accepted wrong letter!)' : '✅ PASS (correctly rejected)'}`);
    console.log(`Expected: false, Got: ${test3}\n`);

    // Test 4: سيارة with letter ع - should FAIL (wrong letter!)
    const test4 = service.validateWord('ع', 'جماد', 'سيارة');
    console.log(`Test 4: Letter ع + Word "سيارة" → ${test4 ? '❌ FAIL (accepted wrong letter!)' : '✅ PASS (correctly rejected)'}`);
    console.log(`Expected: false, Got: ${test4}\n`);

    console.log('='.repeat(60));

    if (test1 && test2 && !test3 && !test4) {
        console.log('\n🎉 Perfect! Synonyms work correctly - they respect the letter requirement!\n');
        console.log('✅ سيارة accepted with letter س');
        console.log('✅ عربية accepted with letter ع');
        console.log('✅ عربية REJECTED with letter س (correct!)');
        console.log('✅ سيارة REJECTED with letter ع (correct!)\n');
    } else {
        console.log('\n⚠️ Issue detected! Synonyms are not respecting letter requirements.\n');
    }
}

testSynonymLetterValidation().catch(console.error);
