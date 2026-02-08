import fs from 'fs';
const db = JSON.parse(fs.readFileSync('server/data/clean_wildcardDatabase.json', 'utf8'));
const categories = new Set();

Object.keys(db).forEach(letter => {
    Object.keys(db[letter]).forEach(cat => categories.add(cat));
});

console.log("Found Categories:", Array.from(categories));
