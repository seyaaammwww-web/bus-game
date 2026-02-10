
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:5001';
const SCREENSHOT_DIR = 'voting-test-screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function votingTest() {
    console.log('🗳️ اختبار نظام التصويت المخصص (Dedicated Voting System Test)...\n');

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
        console.log('📋 إعداد اللوبي (Setting up Lobby)...');

        // Host creates room
        await page1.goto(URL);
        await page1.click('button ::-p-text(غرفة جديدة)');
        await page1.waitForSelector('input[placeholder="اكتب اسمك هنا"]');
        await page1.type('input[placeholder="اكتب اسمك هنا"]', 'المضيف');
        await page1.click('button ::-p-text(أنشئ الغرفة)');

        await page1.waitForSelector('div[dir="ltr"]');
        const roomCode = await page1.$eval('div[dir="ltr"]', el => el.innerText.replace(/\s/g, ''));
        console.log(`✅ الغرفة: ${roomCode}`);

        // Joiner joins
        await page2.goto(URL);
        await page2.click('button ::-p-text(انضم لغرفة)');
        await page2.waitForSelector('input[placeholder="اكتب اسمك هنا"]');
        await page2.type('input[placeholder="اكتب اسمك هنا"]', 'اللاعب 2');
        await page2.type('input[placeholder="XXXX"]', roomCode);
        await page2.click('button ::-p-text(انضم للغرفة)');

        // Ready and start
        await page1.waitForSelector('button ::-p-text(أنا جاهز!)');
        await page1.click('button ::-p-text(أنا جاهز!)');
        await page2.waitForSelector('button ::-p-text(أنا جاهز!)');
        await page2.click('button ::-p-text(أنا جاهز!)');

        await page1.waitForFunction(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('ابدأ اللعبة'));
            return btn && !btn.disabled;
        });
        await page1.click('button ::-p-text(ابدأ اللعبة!)');
        console.log('✅ بدء اللعبة (Game started)\n');

        // ==================== VOTING TRIGGER TEST ====================
        console.log('🎯 استراتيجية التصويت (Voting Strategy):');
        console.log('   المضيف: إجابات صحيحة (Host: Valid answers)');
        console.log('   اللاعب 2: إجابات واضحة الخطأ (Player 2: Clearly invalid)');
        console.log('   الطريقة: حرف واحد فقط "ء" في كل خانة\n');

        await page1.waitForSelector('.text-6xl.font-bold', { timeout: 60000 });
        const letter = await page1.$eval('.text-6xl.font-bold', el => el.textContent?.trim());
        console.log(`🔤 الحرف: ${letter}`);
        await sleep(1000);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/01_round_start.png` });

        // Host fills VALID answers - use the letter from the round
        const validAnswers = [
            letter + 'حمد',  // Will likely be invalid but formatted
            letter + 'ليا',
            letter + 'مريكا',
            letter + 'سد',
            letter + 'لوان'
        ];

        const inputs1 = await page1.$$('input[type="text"]');
        for (let i = 0; i < inputs1.length; i++) {
            await inputs1[i].type(validAnswers[i]);
        }
        console.log('✅ المضيف ملأ الإجابات (Host filled answers)');

        // Joiner fills CLEARLY INVALID - single letter that doesn't match
        const inputs2 = await page2.$$('input[type="text"]');
        for (let i = 0; i < inputs2.length; i++) {
            await inputs2[i].type('ء'); // Hamza - clearly wrong for any category
        }
        console.log('✅ اللاعب 2 ملأ "ء" في كل خانة (Player 2 filled "ء" everywhere)');
        await sleep(500);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/02_invalid_answers.png` });

        // Submit
        await page1.waitForFunction(() => {
            const btn = document.querySelector('button[data-testid="button-bus-complete"]');
            return btn && !btn.disabled && btn.offsetParent !== null;
        }, { timeout: 10000 });
        await page1.click('button[data-testid="button-bus-complete"]');
        console.log('✅ إرسال الإجابات (Submitted)\n');

        // Wait for voting or results
        console.log('⏳ انتظار التصويت أو النتائج (Waiting for voting or results)...');
        await sleep(5000); // Give AI time to process

        // Check for voting overlay
        try {
            // Look for voting heading
            await page1.waitForSelector('h2', { timeout: 15000 });

            // Check if it's the voting overlay by looking for voting-specific elements
            const hasVotingOverlay = await page1.evaluate(() => {
                const headings = [...document.querySelectorAll('h2')];
                return headings.some(h => h.textContent.includes('مراجعة') || h.textContent.includes('تصويت'));
            });

            if (hasVotingOverlay) {
                console.log('✅ ظهرت نافذة التصويت! (Voting overlay appeared!)\n');
                await sleep(1000);
                await page1.screenshot({ path: `${SCREENSHOT_DIR}/03_voting_overlay.png` });

                // Verify button colors
                console.log('🎨 فحص ألوان الأزرار (Checking button colors)...');

                const buttonData = await page1.evaluate(() => {
                    const yesBtn = document.querySelector('button.bg-green-500');
                    const noBtn = document.querySelector('button.bg-red-500');

                    if (!yesBtn || !noBtn) {
                        return { error: 'Buttons not found' };
                    }

                    const yesStyle = window.getComputedStyle(yesBtn);
                    const noStyle = window.getComputedStyle(noBtn);

                    return {
                        yes: {
                            bg: yesStyle.backgroundColor,
                            color: yesStyle.color,
                            text: yesBtn.textContent.trim(),
                            visible: yesBtn.offsetParent !== null
                        },
                        no: {
                            bg: noStyle.backgroundColor,
                            color: noStyle.color,
                            text: noBtn.textContent.trim(),
                            visible: noBtn.offsetParent !== null
                        }
                    };
                });

                if (buttonData.error) {
                    console.log('❌ خطأ: الأزرار غير موجودة (Error: Buttons not found)');
                } else {
                    console.log('━'.repeat(60));
                    console.log('📊 نتائج فحص الأزرار (Button Inspection Results):');
                    console.log('');
                    console.log('✅ زر "موافقة" (YES Button):');
                    console.log(`   النص: "${buttonData.yes.text}"`);
                    console.log(`   الخلفية: ${buttonData.yes.bg}`);
                    console.log(`   لون النص: ${buttonData.yes.color}`);
                    console.log(`   مرئي: ${buttonData.yes.visible ? '✅ نعم' : '❌ لا'}`);
                    console.log('');
                    console.log('❌ زر "رفض" (NO Button):');
                    console.log(`   النص: "${buttonData.no.text}"`);
                    console.log(`   الخلفية: ${buttonData.no.bg}`);
                    console.log(`   لون النص: ${buttonData.no.color}`);
                    console.log(`   مرئي: ${buttonData.no.visible ? '✅ نعم' : '❌ لا'}`);
                    console.log('━'.repeat(60));
                    console.log('');

                    // Verify colors are correct
                    const yesIsGreen = buttonData.yes.bg.includes('34, 197, 94') || buttonData.yes.bg.includes('rgb(34, 197, 94)');
                    const noIsRed = buttonData.no.bg.includes('239, 68, 68') || buttonData.no.bg.includes('rgb(239, 68, 68)');
                    const yesTextWhite = buttonData.yes.color.includes('255, 255, 255') || buttonData.yes.color.includes('rgb(255, 255, 255)');
                    const noTextWhite = buttonData.no.color.includes('255, 255, 255') || buttonData.no.color.includes('rgb(255, 255, 255)');

                    if (yesIsGreen && noIsRed && yesTextWhite && noTextWhite) {
                        console.log('✅✅✅ الألوان صحيحة! (Colors are correct!)');
                        console.log('   ✅ زر موافقة: أخضر + أبيض');
                        console.log('   ✅ زر رفض: أحمر + أبيض\n');
                    } else {
                        console.log('⚠️ الألوان قد لا تكون صحيحة (Colors may not be correct):');
                        console.log(`   زر موافقة أخضر؟ ${yesIsGreen ? '✅' : '❌'}`);
                        console.log(`   زر رفض أحمر؟ ${noIsRed ? '✅' : '❌'}`);
                        console.log(`   نص موافقة أبيض؟ ${yesTextWhite ? '✅' : '❌'}`);
                        console.log(`   نص رفض أبيض؟ ${noTextWhite ? '✅' : '❌'}\n`);
                    }
                }

                // Take detailed screenshot
                await page1.screenshot({ path: `${SCREENSHOT_DIR}/04_voting_buttons_detailed.png` });

                // Vote YES
                await page1.click('button.bg-green-500');
                console.log('✅ تم التصويت بـ "موافقة" (Voted YES)');
                await sleep(2000);
                await page1.screenshot({ path: `${SCREENSHOT_DIR}/05_after_vote.png` });

            } else {
                console.log('⚠️ لم تظهر نافذة التصويت - انتقلت مباشرة للنتائج');
                console.log('   (Voting overlay did not appear - went directly to results)');
                await page1.screenshot({ path: `${SCREENSHOT_DIR}/03_no_voting_results.png` });
            }

        } catch (e) {
            console.log('⚠️ خطأ في انتظار التصويت (Error waiting for voting):', e.message);
            await page1.screenshot({ path: `${SCREENSHOT_DIR}/03_error_state.png` });
        }

        console.log('');
        console.log('━'.repeat(60));
        console.log('✅ انتهى الاختبار (Test completed)');
        console.log(`📸 اللقطات في: ${SCREENSHOT_DIR}`);
        console.log('━'.repeat(60));

        await sleep(10000); // Keep browsers open

    } catch (error) {
        console.error('❌ خطأ (Error):', error);
        await page1.screenshot({ path: `${SCREENSHOT_DIR}/error.png` });
    }
}

votingTest();
