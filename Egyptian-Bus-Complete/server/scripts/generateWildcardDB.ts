import { GroqService } from '../services/groqService';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to generate a comprehensive wildcard database
 * 28 letters × 5 categories × 10 answers = 1,400 answers
 */

const ARABIC_LETTERS = [
    'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض',
    'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'
];

const CATEGORIES = ['ولد', 'بنت', 'بلد', 'حيوان', 'جماد'];

interface WildcardDatabase {
    [letter: string]: {
        [category: string]: string[];
    };
}

async function generateForLetter(letter: string): Promise<any> {
    const groq = GroqService.getInstance();
    const prompt = `أنت خبير في لعبة "باص كامل". قدم 10 إجابات مختلفة وصحيحة ومشهورة لكل فئة:

**الحرف:** ${letter}
**الفئات:** ولد، بنت، بلد، حيوان، جماد

**قواعد:**
1. كل كلمة يجب أن تبدأ بالحرف "${letter}"
2. استخدم كلمات مشهورة وشائعة فقط
3. لا تكرر نفس الكلمة
4. 10 إجابات مختلفة لكل فئة

**أمثلة للحرف "م":**
- ولد: محمد، مصطفى، مازن، ماجد، مراد، منصور، معاذ، ممدوح، مهند، ميلاد
- بنت: مريم، ملك، منى، ماجدة، مها، منال، ميرا، ميرنا، مياسة، ميسون

**أجب بـ JSON:**
{
  "ولد": ["اسم1", "اسم2", ..., "اسم10"],
  "بنت": ["اسم1", "اسم2", ..., "اسم10"],
  "بلد": ["بلد1", "بلد2", ..., "بلد10"],
  "حيوان": ["حيوان1", "حيوان2", ..., "حيوان10"],
  "جماد": ["شيء1", "شيء2", ..., "شيء10"]
}`;

    try {
        const chatCompletion = await groq['groq'].chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "أنت خبير في اللغة العربية. أجب دائماً بـ JSON صحيح."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5, // Creative for variety
            max_completion_tokens: 1000,
            response_format: { type: "json_object" },
            stream: false,
        });

        const content = chatCompletion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response');
        }

        const result = JSON.parse(content);

        // Validate: each category should have 10 answers
        for (const cat of CATEGORIES) {
            if (!Array.isArray(result[cat]) || result[cat].length !== 10) {
                console.warn(`⚠️ ${letter} - ${cat} has ${result[cat]?.length || 0} answers, expected 10`);
            }
        }

        return result;

    } catch (error) {
        console.error(`❌ Failed for letter ${letter}:`, error);
        return null;
    }
}

async function generateDatabase() {
    console.log('🚀 Starting Wildcard Database Generation...');
    console.log(`📊 Target: ${ARABIC_LETTERS.length} letters × ${CATEGORIES.length} categories × 10 answers = ${ARABIC_LETTERS.length * CATEGORIES.length * 10} total answers\n`);

    const database: WildcardDatabase = {};
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < ARABIC_LETTERS.length; i++) {
        const letter = ARABIC_LETTERS[i];
        console.log(`\n[${i + 1}/${ARABIC_LETTERS.length}] Generating for letter: ${letter}...`);

        const result = await generateForLetter(letter);

        if (result) {
            database[letter] = result;
            successCount++;
            console.log(`✅ ${letter} completed`);
        } else {
            failCount++;
            console.log(`❌ ${letter} failed`);
        }

        // Rate limiting: wait 2 seconds between requests (30 RPM = 2s interval)
        if (i < ARABIC_LETTERS.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Save to file
    const outputPath = path.join(__dirname, '../data/wildcardDatabase.json');
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(database, null, 2), 'utf-8');

    console.log(`\n\n✅ Database Generation Complete!`);
    console.log(`📁 Saved to: ${outputPath}`);
    console.log(`📊 Success: ${successCount}/${ARABIC_LETTERS.length}`);
    console.log(`❌ Failed: ${failCount}/${ARABIC_LETTERS.length}`);

    // Calculate total answers
    let totalAnswers = 0;
    for (const letter in database) {
        for (const cat in database[letter]) {
            totalAnswers += database[letter][cat].length;
        }
    }
    console.log(`🎯 Total Answers: ${totalAnswers}`);
}

// Run
generateDatabase().catch(console.error);
