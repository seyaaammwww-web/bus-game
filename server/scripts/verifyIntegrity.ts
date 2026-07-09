
import * as fs from 'fs';
import * as path from 'path';
import { availableLetters } from '../../shared/arabicWords';
import { AdvancedNormalizer } from '../utils/AdvancedNormalizer';

const DB_PATH = path.join(process.cwd(), 'server/data/clean_wildcardDatabase.json');
const VALID_CATEGORIES = new Set(['ولد', 'بنت', 'بلد', 'حيوان', 'جماد']);
const normalizer = AdvancedNormalizer.getInstance();

function startsWithLetter(word: string, letter: string): boolean {
    const normWord = normalizer.normalize(word);
    const normLetter = normalizer.normalize(letter);
    if (normWord.startsWith(normLetter)) return true;
    if (normWord.startsWith('ال' + normLetter)) return true;
    return false;
}

function verifyIntegrity() {
    console.log('--- Starting Integrity Check ---');

    if (!fs.existsSync(DB_PATH)) {
        console.error('Database file missing!');
        process.exit(1);
    }

    try {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        console.log('JSON is valid.');

        let issues = 0;
        let totalWords = 0;
        const canonicalSet = new Set(availableLetters);

        for (const letter of Object.keys(db)) {
            if (!canonicalSet.has(letter)) {
                console.warn(`Invalid letter key: '${letter}'`);
                issues++;
            }

            for (const category of Object.keys(db[letter])) {
                if (!VALID_CATEGORIES.has(category)) {
                    console.warn(`Invalid category ${letter}:${category}`);
                    issues++;
                }

                const words = db[letter][category];
                if (!Array.isArray(words)) {
                    console.error(`Category ${letter}:${category} is not an array!`);
                    issues++;
                    continue;
                }

                const seen = new Set<string>();
                for (const word of words) {
                    totalWords++;

                    if (typeof word !== 'string' || word.trim() === '') {
                        console.warn(`Empty/invalid word in ${letter}:${category}`);
                        issues++;
                        continue;
                    }

                    if (!startsWithLetter(word, letter)) {
                        console.warn(`Letter mismatch ${letter}:${category}: ${word}`);
                        issues++;
                    }

                    const norm = normalizer.normalize(word);
                    if (seen.has(norm)) {
                        console.warn(`Duplicate (normalized) in ${letter}:${category}: ${word}`);
                        issues++;
                    }
                    seen.add(norm);
                }
            }
        }

        const missingLetters = availableLetters.filter(l => !db[l]);
        if (missingLetters.length > 0) {
            console.warn(`Missing letter buckets: ${missingLetters.join(', ')}`);
            issues += missingLetters.length;
        }

        if (issues === 0) {
            console.log(`Integrity check passed. ${totalWords} words across ${Object.keys(db).length} letters.`);
        } else {
            console.log(`Investigation complete. Found ${issues} issues.`);
            process.exit(1);
        }
    } catch (e) {
        console.error('CRITICAL: Corrupt JSON file.', e);
        process.exit(1);
    }
}

verifyIntegrity();
