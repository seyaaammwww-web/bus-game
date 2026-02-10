
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:5001';

async function openManualTest() {
    console.log('🎮 Opening browsers for MANUAL COMPREHENSIVE TEST...\n');
    console.log('📋 Test Checklist:');
    console.log('━'.repeat(60));
    console.log('1. ✓ Lobby Screen');
    console.log('   - Create Room button works');
    console.log('   - Room code displays');
    console.log('   - Join Room works');
    console.log('   - Ready button works');
    console.log('   - Start Game button works\n');

    console.log('2. ✓ Game Round');
    console.log('   - Letter displays clearly');
    console.log('   - Input fields work');
    console.log('   - Timer countdown visible');
    console.log('   - Draft auto-save working');
    console.log('   - Bus Complete button works\n');

    console.log('3. ✓ Power-ups Menu');
    console.log('   - Menu opens correctly');
    console.log('   - Wildcard button visible and works');
    console.log('   - Banish button visible and works');
    console.log('   - Power-up effects apply correctly\n');

    console.log('4. ✓ Voting System');
    console.log('   - Voting overlay appears for invalid answers');
    console.log('   - YES button (GREEN) is visible and clickable');
    console.log('   - NO button (RED) is visible and clickable');
    console.log('   - Vote counts update');
    console.log('   - Voting completes properly\n');

    console.log('5. ✓ Results Screen');
    console.log('   - Scores display correctly');
    console.log('   - Player rankings shown');
    console.log('   - Next Round button visible');
    console.log('   - Next Round button works\n');

    console.log('6. ✓ Final Results / End Game');
    console.log('   - Winner announcement');
    console.log('   - Final scores');
    console.log('   - Back to lobby option\n');

    console.log('━'.repeat(60));
    console.log('\n🔍 Please test ALL paths manually using the two browser windows.\n');
    console.log('⚠️  IMPORTANT: Check voting buttons - they should be:');
    console.log('   - YES button: GREEN background, WHITE text');
    console.log('   - NO button: RED background, WHITE text\n');
    console.log('Press Ctrl+C when done testing.\n');

    // Launch Host Browser
    const browser1 = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: false,
        args: ['--window-size=1280,900', '--window-position=0,0'],
        defaultViewport: null
    });
    const page1 = await browser1.newPage();
    await page1.goto(URL);

    // Launch Joiner Browser
    const browser2 = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: false,
        args: ['--window-size=1280,900', '--window-position=100,100'],
        defaultViewport: null
    });
    const page2 = await browser2.newPage();
    await page2.goto(URL);

    console.log('✅ Browsers opened. Start testing!\n');

    // Keep script running
    await new Promise(() => { });
}

openManualTest();
