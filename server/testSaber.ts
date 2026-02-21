import { HybridValidator } from './hybridValidator';

async function test() {
    const validator = HybridValidator.getInstance();
    const result = await validator.validate('ص', 'ولد', 'صابر');
    console.log("Validate SABER Result:", result);

    // Let's also test 'صي'
    const result2 = await validator.validate('ص', 'حيوان', 'صي');
    console.log("Validate SAI Result:", result2);
}

test().catch(console.error);
