import * as fs from 'fs';
import * as path from 'path';

// Quick script to check database content
const dbPath = path.join(process.cwd(), 'server/data/clean_wildcardDatabase.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

console.log('🔍 Checking database content for بلد category:\n');

// Check letter ج
console.log('Letter ج (بلد):');
if (db['ج'] && db['ج']['بلد']) {
    console.log(db['ج']['بلد'].slice(0, 10));
} else {
    console.log('NOT FOUND');
}

console.log('\nLetter م (بلد):');
if (db['م'] && db['م']['بلد']) {
    console.log(db['م']['بلد'].slice(0, 10));
} else {
    console.log('NOT FOUND');
}

console.log('\nLetter س (بلد):');
if (db['س'] && db['س']['بلد']) {
    console.log(db['س']['بلد'].slice(0, 10));
} else {
    console.log('NOT FOUND');
}

// Check all available letters
console.log('\n\n📋 All available letters in database:');
console.log(Object.keys(db).sort());
