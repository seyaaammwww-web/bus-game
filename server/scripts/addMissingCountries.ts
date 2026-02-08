import * as fs from 'fs';
import * as path from 'path';

interface WildcardDatabase {
    [letter: string]: {
        [category: string]: string[];
    };
}

// Add missing countries
const dbPath = path.join(process.cwd(), 'server/data/clean_wildcardDatabase.json');
const database: WildcardDatabase = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

console.log('📝 Adding missing countries to database...\n');

// Add الجزائر to letter ج
if (!database['ج']) database['ج'] = {};
if (!database['ج']['بلاد']) database['ج']['بلاد'] = [];
if (!database['ج']['بلاد'].includes('الجزائر')) {
    database['ج']['بلاد'].push('الجزائر');
    console.log('✅ Added: الجزائر to letter ج');
}

// Add المغرب to letter م
if (!database['م']) database['م'] = {};
if (!database['م']['بلاد']) database['م']['بلاد'] = [];
if (!database['م']['بلاد'].includes('المغرب')) {
    database['م']['بلاد'].push('المغرب');
    console.log('✅ Added: المغرب to letter م');
}

// Add السعودية to letter س
if (!database['س']) database['س'] = {};
if (!database['س']['بلاد']) database['س']['بلاد'] = [];
if (!database['س']['بلاد'].includes('السعودية')) {
    database['س']['بلاد'].push('السعودية');
    console.log('✅ Added: السعودية to letter س');
}

// Sort all arrays
for (const letter of Object.keys(database)) {
    if (database[letter]['بلاد']) {
        database[letter]['بلاد'].sort();
    }
}

// Save
fs.writeFileSync(dbPath, JSON.stringify(database, null, 2), 'utf-8');
console.log('\n💾 Database updated successfully!');
