
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { availableLetters } from '../../shared/arabicWords';
import { categories } from '../../shared/schema';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_KEY = process.env.GEMINI_API_KEY || process.env.GEMINIAPIKEY;
if (!API_KEY) {
    console.error("❌ Error: GEMINI_API_KEY not found in .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const OUTPUT_FILE = path.resolve(__dirname, '../../server/data/wildcardDatabase.json');

async function generateWordsFor(letter: string, category: string): Promise<string[]> {
    const prompt = `
    أنت خبير لغوي وموسوعة.
    المهمة: أعطني قائمة بـ 20 كلمة (أو أكثر) حقيقية ومشهورة للفئة: "${category}" تبدأ بالحرف: "${letter}".
    
    القواعد:
    1. الكلمات يجب أن تكون بالعربية الفصحى أو العامية المشهورة جداً.
    2. لا تكرر الكلمات.
    3. أخرج القائمة بتنسيق JSON array of strings فقط.
    4. بالنسبة للبلاد، اذكر دولاً أو مدناً كبرى.
    5. بالنسبة للأولاد والبنات، اذكر أسماء شائعة.
    
    مثال للإخراج:
    ["أحمد", "أمجد", "أشرف", ...]
  `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json|```/g, '').trim();
        // Find array brackets
        const start = jsonStr.indexOf('[');
        const end = jsonStr.lastIndexOf(']');
        if (start === -1 || end === -1) return [];

        const json = JSON.parse(jsonStr.substring(start, end + 1));
        return Array.isArray(json) ? json : [];
    } catch (e) {
        console.error(`❌ Failed for ${letter} - ${category}:`, e);
        return [];
    }
}

async function main() {
    console.log("🚀 Starting Dataset Generation...");
    console.log(`Target: ${availableLetters.length} letters x ${categories.length} categories`);

    // Ensure output dir
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const database: Record<string, Record<string, string[]>> = {};

    for (const letter of availableLetters) {
        database[letter] = {};
        console.log(`\nProcessing Letter: ${letter}`);

        for (const category of categories) {
            process.stdout.write(`  - ${category}: `);

            // Retry logic
            let words: string[] = [];
            let attempts = 0;
            while (words.length === 0 && attempts < 3) {
                words = await generateWordsFor(letter, category);
                attempts++;
                if (words.length === 0) await new Promise(r => setTimeout(r, 2000));
            }

            database[letter][category] = words;
            process.stdout.write(`✅ ${words.length} words\n`);

            // Rate limit protection
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2), 'utf-8');
    console.log(`\n✨ DONE! Database saved to: ${OUTPUT_FILE}`);
}

main();
