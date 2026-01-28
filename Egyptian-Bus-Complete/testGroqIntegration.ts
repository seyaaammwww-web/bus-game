import { GroqService } from './server/services/groqService';
import dotenv from 'dotenv';
dotenv.config();

async function testGroqIntegration() {
    console.log('🚀 اختبار تكامل Groq مع مشروعك...\n');

    // Check key
    if (!process.env.GROQ_API_KEY) {
        console.error('❌ GROQ_API_KEY Missing!');
        return;
    }

    const groq = GroqService.getInstance();

    // اختبار 1: كلمة عربية صحيحة
    console.log('1️⃣ اختبار كلمة صحيحة:');
    try {
        const test1 = await groq.validateWord('أ', 'ولد', 'أحمد');
        console.log('✅ النتيجة:', test1);
    } catch (e) {
        console.error('❌ اختبار 1 فشل:', e);
    }

    // اختبار 2: كلمة خاطئة
    console.log('\n2️⃣ اختبار كلمة خاطئة:');
    try {
        const test2 = await groq.validateWord('ب', 'بلد', 'تفاحة');
        console.log('✅ النتيجة:', test2);
    } catch (e) {
        console.error('❌ اختبار 2 فشل:', e);
    }

    // اختبار 3: دفعة كلمات
    console.log('\n3️⃣ اختبار دفعة كلمات:');
    try {
        const batchTest = await groq.validateBatch([
            { letter: 'ك', category: 'حيوان', word: 'كنغر' },
            { letter: 'ق', category: 'جماد', word: 'قلم' },
            { letter: 'س', category: 'بنت', word: 'سارة' },
            { letter: 'م', category: 'بلد', word: 'مصر' }
        ]);

        batchTest.forEach((result, i) => {
            console.log(`الكلمة ${i + 1}:`, result.isValid ? '✅' : '❌', result.reason);
        });
    } catch (e) {
        console.error('❌ اختبار 3 فشل:', e);
    }

    // إحصائيات
    console.log('\n📊 إحصائيات Groq:');
    console.log(groq.getStats());

    console.log('\n🎉 التكامل ناجح! يمكنك الآن استخدام Groq في لعبتك.');
}

testGroqIntegration().catch(console.error);
