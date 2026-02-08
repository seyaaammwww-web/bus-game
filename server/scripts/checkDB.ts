import * as fs from 'fs';
import * as path from 'path';

// Quick script to check database content
const dbPath = path.join(process.cwd(), 'server/data/clean_wildcardDatabase.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

console.log('🔍 Checking database content for بلاد category:\n');

// Check letter ج
console.log('Letter ج (بلاد):');
if (db['ج'] && db['ج']['بلاد']) {
    console.log(db['ج']['بلاد'].slice(0, 10));
} else {
    console.log('NOT FOUND');
}

console.log('\nLetter م (بلاد):');
if (db['م'] && db['م']['بلاد']) {
    console.log(db['م']['بلاد'].slice(0, 10));
} else {
    console.log('NOT FOUND');
}

console.log('\nLetter س (بلاد):');
if (db['س'] && db['س']['بلاد']) {
    console.log(db['س']['بلاد'].slice(0, 10));
} else {
    console.log('NOT FOUND');
}

// Check all available letters
console.log('\n\n📋 All available letters in database:');
console.log(Object.keys(db).sort());
