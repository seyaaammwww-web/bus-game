
import * as fs from 'fs';
import * as path from 'path';

function countWords(filePath: string) {
    if (!fs.existsSync(filePath)) return { total: 0, sample: [] };
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let total = 0;
    const sample: string[] = [];
    for (const l in data) {
        for (const c in data[l]) {
            total += data[l][c].length;
            if (sample.length < 5) sample.push(data[l][c][0]);
        }
    }
    return { total, sample };
}

const oldDb = countWords(path.join(process.cwd(), 'server/data/wildcardDatabase.json.bak'));
const newDb = countWords(path.join(process.cwd(), 'server/data/clean_wildcardDatabase.json'));

console.log("--- Comparison ---");
console.log(`OLD Database: ${oldDb.total} words`);
console.log(`NEW Database: ${newDb.total} words`);
console.log("------------------");
console.log("Difference:", newDb.total - oldDb.total);
