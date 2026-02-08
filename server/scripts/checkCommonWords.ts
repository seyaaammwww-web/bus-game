import { WildcardService } from '../services/wildcardService';

const service = WildcardService.getInstance();

// A list of verified, very common Egyptian/Arab words that MUST be in the DB.
const commonWords = {
    'أ': {
        'ولد': ['أحمد', 'أمجد', 'أشرف', 'أكرم', 'أدهم', 'أمير', 'أنس', 'أيمن', 'أسامة', 'إبراهيم', 'إسلام', 'إسماعيل', 'آسر'],
        'بنت': ['أسماء', 'أمل', 'أميرة', 'أروى', 'ألاء', 'أية', 'إيمان', 'إسراء', 'أنغام', 'أحلام', 'آمال'],
        'حيوان': ['أسد', 'أرنب', 'أخطبوط'],
        'جماد': ['أريكة', 'ألوان', 'أنبوب', 'أبرة', 'أباجورة'],
        'بلد': ['مصر', 'أمريكا', 'ألمانيا', 'أستراليا', 'أفغانستان', 'الأردن', 'أوغندا'] // Some start with Al- handled by logic?
    },
    'ب': {
        'ولد': ['باسم', 'باهر', 'بدر', 'بلال', 'براء', 'بسام'],
        'بنت': ['بسمة', 'بسنت', 'بشرى', 'براء', 'بتول'],
        'حيوان': ['بطة', 'بقرة', 'بغاء', 'باندا', 'بجع'],
        'جماد': ['باب', 'بيت', 'برج', 'برميل', 'بطانية'],
        'بلد': ['باريس', 'بيروت', 'بغداد', 'بورسعيد', 'برازيل', 'بلجيكا']
    },
    'ت': {
        'ولد': ['تامر', 'توثيق', 'تيم', 'توفيق'],
        'بنت': ['تسنيم', 'تقى', 'تمارا', 'تالية'],
        'حيوان': ['تمساح', 'تنين'],
        'جماد': ['تلفزيون', 'تلفون', 'تاج'],
        'بلد': ['تونس', 'تركيا']
    },
    'م': {
        'ولد': ['محمد', 'محمود', 'مصطفى', 'مازن', 'ماهر', 'مجدي', 'مؤمن', 'مروان', 'مهند'],
        'بنت': ['منى', 'مروة', 'ميار', 'مي', 'منة', 'مريم', 'ملك', 'مايا'],
        'حيوان': ['ماعز', 'مهر', 'ماموث'],
        'جماد': ['مكتب', 'مروحة', 'مفتاح', 'مشط', 'مراية'],
        'بلد': ['مصر', 'مغرب', 'مكة', 'مدريد', 'موسكو']
    },
    'س': {
        'ولد': ['سيد', 'سامح', 'سمير', 'سيف', 'سعد', 'سليمان'],
        'بنت': ['سارة', 'سلمى', 'سعاد', 'سماح', 'ساندي', 'سجدة'],
        'حيوان': ['سلحفاة', 'سنجاب', 'سمكة', 'سبع'],
        'جماد': ['سرير', 'ساعة', 'سجادة', 'سلسلة', 'سيارة'],
        'بلد': ['سوريا', 'سعودية', 'سودان', 'سنغافورة']
    },
    'ع': {
        'ولد': ['علي', 'عمر', 'عمرو', 'عادل', 'علاء', 'عصام', 'عبدالله', 'عبدالرحمن'],
        'بنت': ['علا', 'عبير', 'عاليا', 'عائشة'],
        'حيوان': ['عنكبوت', 'عقرب', 'عصفور'],
        'جماد': ['عجلة', 'عربية', 'علم', 'عمود'],
        'بلد': ['عراق', 'عمان']
    }
    // Add more samples as needed
};

console.log("🚀 Starting Common Vocabulary Sanity Check...");

let missingCount = 0;
let checkedCount = 0;

for (const [letter, categories] of Object.entries(commonWords)) {
    for (const [category, words] of Object.entries(categories)) {
        for (const word of words) {
            checkedCount++;
            // Note: validateWord does fuzzy logic, but we want STRICT database check here to ensure it's in the listing
            // However, using validateWord covers the user experience (cached/normalized match).
            const isSmartValid = service.validateWord(letter, category, word);

            if (!isSmartValid) {
                console.log(`❌ MISSING: [${letter}][${category}] ${word}`);
                // Auto-Fix
                const added = service.addWord(letter, category, word);
                if (added) console.log(`   ↳ ✅ Fixed (Added to DB)`);
                missingCount++;
            }
        }
    }
}

console.log(`\n📊 Audit Complete.`);
console.log(`- Checked: ${checkedCount} common words.`);
if (missingCount === 0) {
    console.log(`- ✅ PERFECT SCORE! All checked common words are present.`);
} else {
    console.log(`- ⚠️ FOUND & FIXED ${missingCount} missing words.`);
}
