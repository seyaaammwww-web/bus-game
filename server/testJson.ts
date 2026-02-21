import { WildcardService } from './services/wildcardService';

function test() {
    console.log("CWD:", process.cwd());
    const service = WildcardService.getInstance();

    const result = service.validateWord('ص', 'ولد', 'صابر');
    console.log("Validate SABER with JSON DB:", result);

    const stats = service.getStats();
    console.log("Stats:", stats);
}

test();
