
const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'server/data/clean_wildcardDatabase.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

function check(letter, category, word) {
    const letterData = db[letter];
    if (!letterData) return `Letter ${letter} not found`;
    const catData = letterData[category];
    if (!catData) return `Category ${category} not found for ${letter}`;
    return catData.includes(word) ? "✅ Found" : "❌ Not Found";
}

console.log("Checking 'خروب' in 'بلد' (Letter خ):", check('خ', 'بلد', 'خروب'));
console.log("Checking 'خلل' in 'جماد' (Letter خ):", check('خ', 'جماد', 'خلل'));
