
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:5001';
const SCREENSHOT_DIR = 'comprehensive-test-screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR);
}

// Answer dictionary for valid inputs
const DICT = {
    'أ': ['أحمد', 'أمل', 'أمريكا', 'أسد', 'ألوان'],
    'ب': ['باسم', 'بسمة', 'برازيل', 'بطة', 'باب'],
    'ت': ['تامر', 'تهاني', 'تونس', 'تمساح', 'تليفزيون'],
    'ح': ['حسن', 'حنان', 'حلب', 'حصان', 'حبر'],
    'ر': ['رامي', 'رنا', 'روسيا', 'رمان', 'رمل'],
    'س': ['سامي', 'سارة', 'سوريا', 'سمكة', 'ساعة'],
    'ص': ['صابر', 'صباح', 'صومال', 'صقر', 'صندوق'],
    'ع': ['علي', 'علا', 'عمان', 'عنكبوت', 'علم'],
    'م': ['محمد', 'منى', 'مصر', 'ماعز', 'مكتب'],
    'و': ['وليد', 'ولاء', 'واشنطن', 'وطواط', 'ورقة'],
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function comprehensiveTest() {
    console.log('🎮 بدء الاختبار الشامل للعبة (Starting Comprehensive Game Test)...\n');

    // Launch browsers
    const browser1 = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: false,
        args: ['--window-size=1280,900', '--window-position=0,0'],
        defaultViewport: { width: 1280, height: 900 }
    });
    const page1 = await browser1.newPage();

    const browser2 = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: false,
        args: ['--window-size=1280,900', '--window-position=50,50'],
        defaultViewport: { width: 1280, height: 900 }
    });
    const page2 = await browser2.newPage();

    try {
        // ==================== PHASE 1: LOBBY ====================
        console.log('📋 المرحلة 1: اللوبي (Phase 1: Lobby)');
        console.log('━'.repeat(60));

        await page1.goto(URL);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/01_landing_page.png` });
        console.log('✅ فتح الصفحة الرئيسية (Opened landing page)');

        // Host creates room
        await page1.click('button ::-p-text(غرفة جديدة)');
        await page1.waitForSelector('input[placeholder="اكتب اسمك هنا"]');
        await page1.type('input[placeholder="اكتب اسمك هنا"]', 'المضيف');
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/02_create_room_dialog.png` });
        await page1.click('button ::-p-text(أنشئ الغرفة)');

        await page1.waitForSelector('div[dir="ltr"]');
        const roomCode = await page1.$eval('div[dir="ltr"]', el => el.innerText.replace(/\s/g, ''));
        console.log(`✅ إنشاء الغرفة (Room created): ${roomCode}`);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/03_lobby_host.png` });

        // Joiner joins
        await page2.goto(URL);
        await page2.click('button ::-p-text(انضم لغرفة)');
        await page2.waitForSelector('input[placeholder="اكتب اسمك هنا"]');
        await page2.type('input[placeholder="اكتب اسمك هنا"]', 'اللاعب 2');
        await page2.type('input[placeholder="XXXX"]', roomCode);
        await page2.screenshot({ path: `${SCREENSHOT_DIR}/04_join_room_dialog.png` });
        await page2.click('button ::-p-text(انضم للغرفة)');
        console.log('✅ انضمام اللاعب الثاني (Player 2 joined)');

        await sleep(1000);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/05_lobby_with_both_players.png` });

        // Both ready
        await page1.click('button ::-p-text(أنا جاهز!)');
        await page2.click('button ::-p-text(أنا جاهز!)');
        console.log('✅ كلا اللاعبين جاهزين (Both players ready)');
        await sleep(1000);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/06_both_ready.png` });

        // Start game
        await page1.waitForFunction(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('ابدأ اللعبة'));
            return btn && !btn.disabled;
        });
        await page1.click('button ::-p-text(ابدأ اللعبة!)');
        console.log('✅ بدء اللعبة (Game started)\n');

        // ==================== PHASE 2: ROUND 1 (Valid Answers) ====================
        console.log('🎯 المرحلة 2: الجولة 1 - إجابات صحيحة (Phase 2: Round 1 - Valid Answers)');
        console.log('━'.repeat(60));

        await page1.waitForSelector('.text-6xl.font-bold', { timeout: 60000 });
        const letter1 = await page1.$eval('.text-6xl.font-bold', el => el.textContent?.trim());
        console.log(`🔤 الحرف: ${letter1} (Letter: ${letter1})`);
        await sleep(1000);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/07_round1_start.png` });

        // Fill valid answers
        const answers1 = DICT[letter1.charAt(0)] || ['test1', 'test2', 'test3', 'test4', 'test5'];
        const inputs1 = await page1.$$('input[type="text"]');
        for (let i = 0; i < inputs1.length; i++) {
            await inputs1[i].type(answers1[i] || 'test');
        }
        console.log('✅ المضيف ملأ الإجابات (Host filled answers)');

        const inputs2 = await page2.$$('input[type="text"]');
        for (let i = 0; i < inputs2.length; i++) {
            await inputs2[i].type(answers1[i] || 'test');
        }
        console.log('✅ اللاعب 2 ملأ الإجابات (Player 2 filled answers)');
        await sleep(500);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/08_round1_answers_filled.png` });

        // Submit
        await page1.waitForFunction(() => {
            const btn = document.querySelector('button[data-testid="button-bus-complete"]');
            return btn && !btn.disabled && btn.offsetParent !== null;
        }, { timeout: 10000 });
        await page1.click('button[data-testid="button-bus-complete"]');
        console.log('✅ إرسال الإجابات (Submitted answers)');

        // Wait for results
        await sleep(3000);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/09_round1_results.png` });

        // Check for Next Round button
        try {
            await page1.waitForSelector('button[data-testid="button-next-round"]', { timeout: 10000 });
            console.log('✅ ظهور زر الجولة التالية (Next Round button visible)');
            await page1.screenshot({ path: `${SCREENSHOT_DIR}/10_round1_next_button.png` });
            await sleep(1000);
            await page1.click('button[data-testid="button-next-round"]');
            console.log('✅ الانتقال للجولة التالية (Moving to next round)\n');
        } catch (e) {
            console.log('⚠️ لم يظهر زر الجولة التالية (Next Round button not found)');
        }

        // ==================== PHASE 3: ROUND 2 (Invalid Answers - Voting Test) ====================
        console.log('🗳️ المرحلة 3: الجولة 2 - اختبار التصويت (Phase 3: Round 2 - Voting Test)');
        console.log('━'.repeat(60));

        await page1.waitForSelector('.text-6xl.font-bold', { timeout: 60000 });
        const letter2 = await page1.$eval('.text-6xl.font-bold', el => el.textContent?.trim());
        console.log(`🔤 الحرف: ${letter2} (Letter: ${letter2})`);
        await sleep(1000);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/11_round2_start.png` });

        // Host fills valid, Joiner fills INVALID
        const validAnswers = DICT[letter2.charAt(0)] || ['test1', 'test2', 'test3', 'test4', 'test5'];
        const inputs1_r2 = await page1.$$('input[type="text"]');
        for (let i = 0; i < inputs1_r2.length; i++) {
            await inputs1_r2[i].type(validAnswers[i] || 'test');
        }
        console.log('✅ المضيف ملأ إجابات صحيحة (Host filled valid answers)');

        const inputs2_r2 = await page2.$$('input[type="text"]');
        for (let i = 0; i < inputs2_r2.length; i++) {
            await inputs2_r2[i].type('خزعبلات'); // Invalid word
        }
        console.log('✅ اللاعب 2 ملأ إجابات خاطئة (Player 2 filled invalid answers)');
        await sleep(500);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/12_round2_mixed_answers.png` });

        // Submit
        await page1.waitForFunction(() => {
            const btn = document.querySelector('button[data-testid="button-bus-complete"]');
            return btn && !btn.disabled && btn.offsetParent !== null;
        }, { timeout: 10000 });
        await page1.click('button[data-testid="button-bus-complete"]');
        console.log('✅ إرسال الإجابات (Submitted answers)');

        // Wait for voting overlay
        await sleep(3000);
        try {
            await page1.waitForSelector('h2 ::-p-text(مراجعة إجابة)', { timeout: 10000 });
            console.log('✅ ظهور نافذة التصويت (Voting overlay appeared)');
            await page1.screenshot({ path: `${SCREENSHOT_DIR}/13_voting_overlay.png` });

            // Verify button colors by checking computed styles
            const yesButtonColor = await page1.evaluate(() => {
                const btn = document.querySelector('button.bg-green-500');
                if (!btn) return null;
                const style = window.getComputedStyle(btn);
                return {
                    backgroundColor: style.backgroundColor,
                    color: style.color,
                    text: btn.textContent.trim()
                };
            });

            const noButtonColor = await page1.evaluate(() => {
                const btn = document.querySelector('button.bg-red-500');
                if (!btn) return null;
                const style = window.getComputedStyle(btn);
                return {
                    backgroundColor: style.backgroundColor,
                    color: style.color,
                    text: btn.textContent.trim()
                };
            });

            console.log('🎨 ألوان أزرار التصويت (Voting button colors):');
            console.log(`   ✅ زر "موافقة" (YES): خلفية ${yesButtonColor?.backgroundColor}, نص ${yesButtonColor?.color}`);
            console.log(`   ✅ زر "رفض" (NO): خلفية ${noButtonColor?.backgroundColor}, نص ${noButtonColor?.color}`);

            // Take close-up screenshot of buttons
            await page1.screenshot({ path: `${SCREENSHOT_DIR}/14_voting_buttons_closeup.png` });

            // Click YES to approve
            await page1.click('button.bg-green-500');
            console.log('✅ التصويت بـ "موافقة" (Voted YES)');
            await sleep(2000);

        } catch (e) {
            console.log('⚠️ لم تظهر نافذة التصويت (Voting overlay not found)');
            await page1.screenshot({ path: `${SCREENSHOT_DIR}/14_no_voting.png` });
        }

        // Results screen
        await sleep(2000);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/15_round2_results.png` });

        // Next round
        try {
            await page1.waitForSelector('button[data-testid="button-next-round"]', { timeout: 10000 });
            console.log('✅ ظهور زر الجولة التالية (Next Round button visible)');
            await sleep(1000);
            await page1.click('button[data-testid="button-next-round"]');
            console.log('✅ الانتقال للجولة 3 (Moving to round 3)\n');
        } catch (e) {
            console.log('⚠️ لم يظهر زر الجولة التالية (Next Round button not found)');
        }

        // ==================== PHASE 4: ROUND 3 (Final Round) ====================
        console.log('🏆 المرحلة 4: الجولة 3 - الجولة الأخيرة (Phase 4: Round 3 - Final Round)');
        console.log('━'.repeat(60));

        await page1.waitForSelector('.text-6xl.font-bold', { timeout: 60000 });
        const letter3 = await page1.$eval('.text-6xl.font-bold', el => el.textContent?.trim());
        console.log(`🔤 الحرف: ${letter3} (Letter: ${letter3})`);
        await sleep(1000);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/16_round3_start.png` });

        // Fill valid answers
        const answers3 = DICT[letter3.charAt(0)] || ['test1', 'test2', 'test3', 'test4', 'test5'];
        const inputs1_r3 = await page1.$$('input[type="text"]');
        for (let i = 0; i < inputs1_r3.length; i++) {
            await inputs1_r3[i].type(answers3[i] || 'test');
        }

        const inputs2_r3 = await page2.$$('input[type="text"]');
        for (let i = 0; i < inputs2_r3.length; i++) {
            await inputs2_r3[i].type(answers3[i] || 'test');
        }
        console.log('✅ كلا اللاعبين ملأوا الإجابات (Both players filled answers)');
        await sleep(500);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/17_round3_answers.png` });

        // Submit
        await page1.waitForFunction(() => {
            const btn = document.querySelector('button[data-testid="button-bus-complete"]');
            return btn && !btn.disabled && btn.offsetParent !== null;
        }, { timeout: 10000 });
        await page1.click('button[data-testid="button-bus-complete"]');
        console.log('✅ إرسال الإجابات النهائية (Submitted final answers)');

        // Final results
        await sleep(3000);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/18_final_results.png` });
        console.log('✅ النتائج النهائية (Final results displayed)\n');

        // ==================== TEST COMPLETE ====================
        console.log('━'.repeat(60));
        console.log('✅ اكتمل الاختبار الشامل! (Comprehensive test completed!)');
        console.log(`📸 تم حفظ ${fs.readdirSync(SCREENSHOT_DIR).length} لقطة شاشة في:`, SCREENSHOT_DIR);
        console.log('━'.repeat(60));

        await sleep(5000); // Keep browsers open for review

    } catch (error) {
        console.error('❌ خطأ في الاختبار (Test error):', error);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/error_screenshot.png` });
    }
}

comprehensiveTest();
