import { HybridValidator } from './hybridValidator';

async function test() {
    const validator = HybridValidator.getInstance();
    const result1 = await validator.validate('test', 'ب', 'بلاد' as any, 'باريس');
    console.log("Validate SABER Result:", result1);

    // Let's also test 'صي'
    const result2 = await validator.validate('test', 'س', 'نبات' as any, 'سحلب');
    console.log("Validate SAI Result:", result2);
}

test().catch(console.error);
