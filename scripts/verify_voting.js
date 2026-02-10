
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
    console.log('Launching Chrome...');
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: false,
        args: ['--start-maximized', '--auto-open-devtools-for-tabs'],
        defaultViewport: null
    });

    const page = await browser.newPage();

    try {
        console.log('Navigating to game...');
        await page.goto('http://localhost:5001');

        // Create Room
        console.log('Creating room...');
        await page.waitForSelector('input[placeholder="أدخل اسمك"]');
        await page.type('input[placeholder="أدخل اسمك"]', 'VoteMaster');
        await page.click('button:has-text("إنشاء غرفة")');

        // Start Game
        console.log('Starting game...');
        await page.waitForSelector('button:has-text("إبدأ اللعبة")');
        await page.click('button:has-text("إبدأ اللعبة")');

        // Wait for round start (letter)
        console.log('Waiting for round start...');
        await page.waitForSelector('.text-6xl.font-bold'); // The big letter display
        const letter = await page.$eval('.text-6xl.font-bold', el => el.textContent?.trim());
        console.log(`Current letter: ${letter}`);

        // Input answers
        console.log('Filling answers...');
        const inputs = await page.$$('input[type="text"]');
        if (inputs.length > 0) {
            // First input: Garbage word to force vote
            await inputs[0].type('كلمةغيرموجودة123');
            // Second input: Valid word if possible (or just skip/another garbage)
            if (inputs.length > 1) await inputs[1].type('كلمةتانية');
        }

        // Submit
        console.log('Submitting answers...');
        const submitBtn = await page.$('button:has-text("إرسال")');
        if (submitBtn) {
            await submitBtn.click();
        } else {
            // Or wait for timer
            console.log('Submit button not found, waiting for timer...');
        }

        // Wait for Voting Phase
        console.log('Waiting for voting overlay...');
        try {
            await page.waitForSelector('h2:has-text("تصويت ديمقراطي")', { timeout: 60000 });
            console.log('✅ Voting Overlay appeared!');

            // Approve
            console.log('Voting YES...');
            await page.click('button.bg-green-500'); // Assuming green button is approve

            // Wait a bit to see result
            await new Promise(r => setTimeout(r, 2000));
            console.log('✅ Vote cast successfully.');

        } catch (e) {
            console.error('❌ Voting overlay did not appear or timed out.');
            console.log('Current page content:', await page.content());
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        console.log('Test complete. Browser will remain open for inspection.');
        // await browser.close(); // Keep open for user
    }
})();
