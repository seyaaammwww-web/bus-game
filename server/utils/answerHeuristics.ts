import type { Category } from '../../shared/schema';

const KEYBOARD_MASH_PATTERNS = [
    /^(شسي|شس|ثقف|ضصث|قثص|يسب|يس|صضث|فغعه)/,
    /^[a-z]{2,}$/i,
    /^[d]+$/i,
    /^[x]+$/i,
];

/** Minimum share of Arabic letters in the answer (rejects Latin / mixed garbage). */
const ARABIC_RATIO_MIN = 0.85;

function normalizeArabic(text: string): string {
    return text
        .trim()
        .replace(/[\u064B-\u065F]/g, '')
        .replace(/أ|إ|آ/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .toLowerCase();
}

export function isMostlyArabic(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    const arabicCount = (trimmed.match(/[\u0600-\u06FF]/g) || []).length;
    return arabicCount / trimmed.length >= ARABIC_RATIO_MIN;
}

/** Keyboard-adjacent letters common in random Arabic typing. */
const MASH_LETTERS = /[صضثقفغشسكءخحج]/g;

function hasSuspiciousMashCluster(text: string): boolean {
    const mash = text.match(MASH_LETTERS) || [];
    if (mash.length >= 3 && mash.length / text.length >= 0.5) return true;

    // Hamza with no long vowels — random key mash, not real words like إبراهيم
    if (/ء/.test(text) && !/[اويىأإآا]/.test(text.replace(/ء/g, ''))) return true;

    return false;
}

export function hasGarbagePattern(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return true;
    if (/(.)\1{2,}/.test(trimmed)) return true;
    if (KEYBOARD_MASH_PATTERNS.some(p => p.test(trimmed))) return true;
    if (hasSuspiciousMashCluster(trimmed)) return true;
    return false;
}

export function answerStartsWithLetter(letter: string, answer: string): boolean {
    const normalizedLetter = normalizeArabic(letter);
    const normalizedAnswer = normalizeArabic(answer);

    if (!normalizedAnswer) return false;

    const answerFirstChar = normalizedAnswer.startsWith('ال')
        ? normalizedAnswer.charAt(2)
        : normalizedAnswer.charAt(0);

    const letterFirstChar = normalizedLetter.charAt(0);
    const letterVariants: Record<string, string[]> = {
        'ا': ['ا', 'أ', 'إ', 'آ'],
        'أ': ['ا', 'أ', 'إ', 'آ'],
        'إ': ['ا', 'أ', 'إ', 'آ'],
        'آ': ['ا', 'أ', 'إ', 'آ'],
        'ه': ['ه', 'ة'],
        'ة': ['ه', 'ة'],
        'ي': ['ي', 'ى'],
        'ى': ['ي', 'ى'],
    };

    const validFirstChars = letterVariants[letterFirstChar] || [letterFirstChar];
    return validFirstChars.includes(answerFirstChar);
}

/**
 * Strict pre-check before an answer can be voted on or treated as plausible.
 * Dictionary miss + passes this = eligible for democratic voting only.
 */
export function passesAnswerHeuristics(letter: string, _category: Category, answer: string): boolean {
    const trimmed = answer.trim();
    if (!trimmed || trimmed.length < 2) return false;
    if (!isMostlyArabic(trimmed)) return false;
    if (hasGarbagePattern(trimmed)) return false;
    // Real dictionary words are almost always 3+ chars; 2-char fragments cause false DB matches
    if (trimmed.length < 3) return false;
    return answerStartsWithLetter(letter, trimmed);
}

/** @deprecated use passesAnswerHeuristics — kept for call-site migration */
export function validateAnswerLenient(letter: string, category: Category, answer: string): boolean {
    return passesAnswerHeuristics(letter, category, answer);
}
