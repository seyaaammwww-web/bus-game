
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:5001';

// Answer Dictionary
const DICT = {
    'أ': ['أحمد', 'أمل', 'أمريكا', 'أسد', 'ألوان'],
    'ب': ['باسم', 'بسمة', 'برازيل', 'بطة', 'باب'],
    'ت': ['تامر', 'تهاني', 'تونس', 'تمساح', 'تليفزيون'],
    'ث': ['ثامر', 'ثراء', 'ثمود', 'ثعبان', 'ثلاجة'],
    'ج': ['جمال', 'جميلة', 'جزائر', 'جمل', 'جرس'],
    'ح': ['حسن', 'حنان', 'حلب', 'حصان', 'حبر'],
    'خ': ['خالد', 'خلود', 'خرطوم', 'خروف', 'خاتم'],
    'د': ['داليا', 'دينا', 'دبي', 'دب', 'دولاب'],
    'ذ': ['ذياب', 'ذكريات', 'ذمار', 'ذئب', 'ذهب'],
    'ر': ['رامي', 'رنا', 'روسيا', 'رمان', 'رمل'],
    'ز': ['زياد', 'زينب', 'زيمبابوي', 'زرافة', 'نرد'],
    'س': ['سامي', 'سارة', 'سوريا', 'سمكة', 'ساعة'],
    'ش': ['شادي', 'شادية', 'شيلي', 'شمبانزي', 'شباك'],
    'ص': ['صابر', 'صباح', 'صومال', 'صقر', 'صندوق'],
    'ض': ['ضياء', 'ضحى', 'ضفة', 'ضفدع', 'ضرس'],
    'ط': ['طارق', 'طماطم', 'طنطا', 'طاووس', 'طبلة'],
    'ظ': ['ظافر', 'ظظظ', 'ظبي', 'ظبي', 'ظرف'],
    'ع': ['علي', 'علا', 'عمان', 'عنكبوت', 'علم'],
    'غ': ['غالي', 'غادة', 'غانا', 'غوريلا', 'غسالة'],
    'ف': ['فادي', 'فاتن', 'فرنسا', 'فيل', 'فانوس'],
    'ق': ['قاسم', 'قمر', 'قطر', 'قطة', 'قلم'],
    'ك': ['كريم', 'كريمة', 'كويت', 'كلب', 'كتاب'],
    'ل': ['لامي', 'لمياء', 'لبنان', 'ليمون', 'لمبة'],
    'م': ['محمد', 'منى', 'مصر', 'ماعز', 'مكتب'],
    'ن': ['نادر', 'نادية', 'نيجيريا', 'نمر', 'نظارة'],
    'ه': ['هاني', 'هبة', 'الهند', 'هدهد', 'هرم'],
    'و': ['وليد', 'ولاء', 'واشنطن', 'وطواط', 'ورقة'],
    'ي': ['ياسر', 'ياسمين', 'يابان', 'يمامة', 'يقطين']
};

async function runTest() {
    console.log('🚀 Starting "Full Game Loop" Stress Test (3 Rounds)...');

    // Launch Browser 1 (Host)
    const browser1 = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: false,
        args: ['--window-size=1024,800', '--window-position=0,0'],
        defaultViewport: null
    });
    const page1 = await browser1.newPage();

    // Launch Browser 2 (Joiner)
    const browser2 = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: false,
        args: ['--window-size=1024,800', '--window-position=800,0'],
        defaultViewport: null
    });
    const page2 = await browser2.newPage();

    [page1, page2].forEach((p, i) => {
        const name = i === 0 ? 'HOST' : 'JOINER';
        p.on('console', msg => console.log(`[${name}] ${msg.type()}: ${msg.text()}`));
        p.on('pageerror', err => console.log(`[${name}] 💥 PAGE ERROR:`, err));
    });

    try {
        // --- LOBBY PHASE ---
        console.log('\n--- PHASE 1: LOBBY & SETUP ---');

        // Host Create
        await page1.goto(URL);
        const createBtn = await page1.waitForSelector('button ::-p-text(غرفة جديدة)');
        await createBtn.click();

        const nameInput = await page1.waitForSelector('input[placeholder="اكتب اسمك هنا"]');
        await nameInput.type('HOST_Mo');
        const confirmCreate = await page1.waitForSelector('button ::-p-text(أنشئ الغرفة)');
        await confirmCreate.click();

        await page1.waitForSelector('div[dir="ltr"]');
        const roomCode = await page1.$eval('div[dir="ltr"]', el => el.innerText.replace(/\s/g, ''));
        console.log(`🏠 Room Code: ${roomCode}`);

        // Joiner Join
        await page2.goto(URL);
        const joinBtn = await page2.waitForSelector('button ::-p-text(انضم لغرفة)');
        await joinBtn.click();

        await page2.waitForSelector('input[placeholder="اكتب اسمك هنا"]');
        await page2.type('input[placeholder="اكتب اسمك هنا"]', 'JOINER_Ali');
        await page2.type('input[placeholder="XXXX"]', roomCode);
        const confirmJoin = await page2.waitForSelector('button ::-p-text(انضم للغرفة)');
        await confirmJoin.click();
        console.log('JOINER: Joined!');

        // Ready Up
        console.log('Waiting for players to get READY...');
        const readyBtn1 = await page1.waitForSelector('button ::-p-text(أنا جاهز!)');
        await readyBtn1.click();
        const readyBtn2 = await page2.waitForSelector('button ::-p-text(أنا جاهز!)');
        await readyBtn2.click();

        // Start Game
        console.log('HOST: Starting Game...');
        await page1.waitForFunction(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('ابدأ اللعبة'));
            return btn && !btn.disabled;
        });
        const startBtn = await page1.waitForSelector('button ::-p-text(ابدأ اللعبة!)');
        await startBtn.click();

        // --- GAME LOOP (3 Rounds) ---
        for (let round = 1; round <= 3; round++) {
            console.log(`\n--- ROUND ${round} START ---`);

            // Wait for Letter
            await page1.waitForSelector('.text-6xl.font-bold', { timeout: 60000 });
            await page2.waitForSelector('.text-6xl.font-bold', { timeout: 60000 });
            const letter = await page1.$eval('.text-6xl.font-bold', el => el.textContent?.trim());
            console.log(`🔤 Round ${round} Letter: ${letter}`);

            // Fill inputs with VALID answers first to test results screen
            if (round === 1) {
                await fillAnswers(page1, letter, 'HOST', false);
                await fillAnswers(page2, letter, 'JOINER', false);
            } else if (round === 2) {
                await fillAnswers(page1, letter, 'HOST', false);
                await fillAnswers(page2, letter, 'JOINER', true); // Joiner Invalid
            } else {
                await fillAnswers(page1, letter, 'HOST', false);
                await fillAnswers(page2, letter, 'JOINER', false);
            }

            if (round === 3) {
                console.log('Round 3: TIMEOUT TEST. Not clicking bus complete.');
                // Do nothing, wait for timer
            } else {
                await submitAnswers(page1);
            }

            // Handle Flow: Voting OR Results
            console.log(`Round ${round}: Waiting for outcome (Voting or Results)...`);

            // Race condition: might see Voting or Results
            let landedOnResults = false;
            while (!landedOnResults) {
                try {
                    const outcome = await Promise.race([
                        // Look for "مراجعة إجابة" which is the text in the h2
                        page1.waitForSelector('h2 ::-p-text(مراجعة إجابة)', { timeout: 45000 }).then(() => 'voting'),
                        page1.waitForSelector('button[data-testid="button-next-round"]', { timeout: 65000 }).then(() => 'results_next'),
                        // Final results might appear instead of next round if last round
                        page1.waitForSelector('button[data-testid="button-end-game"]', { timeout: 65000 }).then(() => 'results_end')
                    ]);

                    if (outcome === 'voting') {
                        console.log('🗳️ Voting triggered! Voting YES...');
                        await handleVoting(page1, 'HOST', true);
                        // Loop continues to check what happens next (more votes or results)
                    } else if (outcome === 'results_next') {
                        console.log('✅ Round Results reached (Next Round available).');
                        await new Promise(r => setTimeout(r, 2000));
                        const nextBtn = await page1.waitForSelector('button[data-testid="button-next-round"]');
                        await nextBtn.click();
                        console.log('⏳ Moving to next round...');
                        landedOnResults = true;
                    } else if (outcome === 'results_end') {
                        console.log('🏆 Final Results reached.');
                        landedOnResults = true;
                    }
                } catch (e) {
                    console.log('⚠️ Timeout waiting for outcome, checking if we missed it or lag.');
                    // Log HTML for debugging
                    const html = await page1.evaluate(() => document.body.innerHTML);
                    console.log('--- PAGE HTML DUMP ---');
                    console.log(html.substring(0, 2000)); // First 2000 chars
                    console.log('... (truncated) ...');
                    console.log('--- END HTML DUMP ---');
                    break;
                }
            }
        }

        console.log('🎉 FULL GAME TEST COMPLETE!');

    } catch (e) {
        console.error('💥 TEST FAILED:', e);
    }
}

// Helpers
async function fillAnswers(page, inputLetter, name, forceInvalid = false) {
    // Normalize letter to be safe
    let letter = inputLetter ? inputLetter.trim().charAt(0) : 'أ';
    console.log(`[DEBUG] Letter: '${letter}', Code: ${letter.charCodeAt(0)}`);

    // Simple mapping for variants
    if (['آ', 'أ', 'إ'].includes(letter)) letter = 'أ';

    // Get answers
    let answers = DICT[letter] || ['test', 'test', 'test', 'test', 'test'];
    if (forceInvalid) answers = ['خزعبلات', 'خزعبلات', 'خزعبلات', 'خزعبلات', 'خزعبلات'];

    const inputs = await page.$$('input[type="text"]');
    for (let i = 0; i < inputs.length; i++) {
        if (inputs[i]) {
            await inputs[i].type(answers[i] || (letter + 'test'));
        }
    }
    console.log(`[${name}] Filled answers (${forceInvalid ? 'INVALID' : 'VALID'}).`);
}

async function submitAnswers(page) {
    try {
        console.log('Looking for Bus Complete button...');
        await page.waitForFunction(
            () => {
                const btn = document.querySelector('button[data-testid="button-bus-complete"]');
                return btn && !btn.disabled && btn.offsetParent !== null;
            },
            { timeout: 10000 }
        );
        const btn = await page.$('button[data-testid="button-bus-complete"]');
        await btn.click();
        console.log('Clicked Bus Complete.');
    } catch (e) {
        console.log('Bus Complete button issue:', e.message);
    }
}

async function handleVoting(page, name, accept) {
    try {
        // Wait for YES/NO buttons
        const selector = accept ? 'button.bg-green-500' : 'button.bg-red-500';
        const btn = await page.waitForSelector(selector, { timeout: 5000 });
        await btn.click();
        console.log(`[${name}] Voted ${accept ? 'YES' : 'NO'}.`);

        // Wait for overlay to disappear loosely (match the h2 again)
        await page.waitForFunction(() => !document.querySelector('h2 ::-p-text(مراجعة إجابة)'), { timeout: 5000 }).catch(() => { });
    } catch (e) {
        console.log(`[${name}] Failed to vote or overlay gone.`);
    }
}

runTest();
