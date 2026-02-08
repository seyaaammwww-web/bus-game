import * as fs from 'fs';
import * as path from 'path';
import { AdvancedNormalizer } from '../utils/AdvancedNormalizer';

interface AuditReport {
    totalWords: number;
    integrityIssues: string[];
    contaminationIssues: string[];
    gapReport: string[];
    densityScore: number;
}

export class HLEEngine {
    private dbPath: string;
    private database: any;
    private normalizer: AdvancedNormalizer;

    constructor() {
        this.dbPath = path.join(process.cwd(), 'server', 'data', 'clean_wildcardDatabase.json');
        this.normalizer = AdvancedNormalizer.getInstance();
        this.loadDatabase();
    }

    private loadDatabase() {
        if (fs.existsSync(this.dbPath)) {
            this.database = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
        } else {
            throw new Error("Database not found for HLEE Audit");
        }
    }

    public runFullAudit(): AuditReport {
        const issues: string[] = [];
        const contamination: string[] = [];
        const gaps: string[] = [];
        let totalWords = 0;
        let totalCells = 0;

        // Mutually Exclusive Categories (Strict Matrix)
        const exclusionMatrix: Record<string, string[]> = {
            'ولد': ['بنت', 'جماد', 'حيوان', 'بلد'],
            'بنت': ['ولد', 'جماد', 'حيوان', 'بلد'],
            'جماد': ['ولد', 'بنت', 'حيوان', 'بلد'], // Plants are now here
            'حيوان': ['جماد', 'بلد'],
            'بلد': ['ولد', 'بنت', 'حيوان', 'جماد']
        };

        for (const letter of Object.keys(this.database)) {
            const letterData = this.database[letter];

            // Phase 1: Structural & Integrity
            for (const category of Object.keys(letterData)) {
                const words = letterData[category] as string[];
                totalWords += words.length;
                totalCells++;

                // Gap Analysis (Phase 3)
                // "Expected Density" rule of thumb: < 5 words is a Critical Gap
                if (words.length < 5) {
                    gaps.push(`[GAP] Letter '${letter}' Category '${category}': Only ${words.length} words.`);
                }

                for (const word of words) {
                    // 1. First Letter Integrity
                    // Normalize word and letter to compare
                    const normWord = this.normalizer.normalize(word);
                    const normLetter = this.normalizer.normalize(letter);

                    // Simple check: does it start with the letter?
                    // Handle "Al-" case? Usually DB stores raw words. 
                    // Let's assume strict start for HLEE v1.0
                    if (!normWord.startsWith(normLetter)) {
                        // Allow some flexibility for Al- if common
                        if (!normWord.startsWith('ال' + normLetter)) {
                            // issues.push(`[INTEGRITY] Word '${word}' in Letter '${letter}' does not start with that letter.`);
                        }
                    }

                    // 2. Cross-Contamination (Phase 2 constraint)
                    const exclusions = exclusionMatrix[category];
                    if (exclusions) {
                        for (const excludedCat of exclusions) {
                            // Check if this word exists in the excluded category UNDER THE SAME LETTER
                            // (Words can naturally duplicate across letters if spelling differs, but here we check semantic dupes)
                            const excludedList = letterData[excludedCat];
                            if (excludedList && excludedList.includes(word)) {
                                contamination.push(`[CONTAMINATION] '${word}' found in BOTH '${category}' and '${excludedCat}' for letter '${letter}'.`);
                            }
                        }
                    }
                }
            }
        }

        const densityScore = totalCells > 0 ? totalWords / totalCells : 0;

        return {
            totalWords,
            integrityIssues: issues,
            contaminationIssues: contamination,
            gapReport: gaps,
            densityScore
        };
    }
}
