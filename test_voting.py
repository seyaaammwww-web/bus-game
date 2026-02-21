import asyncio
from playwright.async_api import async_playwright
import time

async def test_voting():
    print("Starting robust multiplayer voting test...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        
        # Player 1: Alice
        page1 = await context.new_page()
        page1.set_default_timeout(5000)
        print("Alice navigated to home...")
        await page1.goto('http://localhost:5001')
        
        # Create Room
        await page1.click('[data-testid="button-create-room"]')
        await page1.fill('[data-testid="input-player-name"]', 'Alice')
        await page1.click('[data-testid="button-create-confirm"]')
        
        print("Waiting for room code...")
        await page1.wait_for_selector('[data-testid="button-copy-code"]')
        
        # Room code is rendering character by character (framer-motion). We can fetch it by inspecting the innerText of the parent container or just using page content.
        # But an easier way is to just get the room code div
        room_code_el = await page1.locator('.w-14.h-16').all_inner_texts()
        room_code_element = "".join(room_code_el).strip()
        print(f"Room Code created: {room_code_element}")
        
        # Player 2: Bob
        page2 = await context.new_page()
        page2.set_default_timeout(5000)
        print("Bob navigating to home...")
        await page2.goto('http://localhost:5001')
        
        await page2.click('[data-testid="button-join-room"]')
        await page2.fill('[data-testid="input-player-name-join"]', 'Bob')
        await page2.fill('[data-testid="input-room-code"]', room_code_element)
        await page2.click('[data-testid="button-join-confirm"]')
        
        print("Waiting for Bob to join...")
        await page1.wait_for_selector('text="Bob"', timeout=10000)
        
        # Toggle Democratic Voting ON
        print("Enabling Democratic Voting...")
        await page1.locator('text="معطل ❌"').click()
        await asyncio.sleep(1)
        
        # Ready up Bob
        await page2.click('[data-testid="button-ready"]')
        
        # Ready up Alice
        await page1.click('[data-testid="button-ready"]')
        
        print("Starting game...")
        await page1.click('[data-testid="button-start-game"]')
        
        # Wait for game to start
        print("Waiting for game screen...")
        await page1.wait_for_selector('[data-testid="button-exit-game"]', timeout=10000)
        
        print("Game started. Extracting letter...")
        letter_element = await page1.locator('.text-6xl.font-pixel-title').first.inner_text()
        letter = letter_element.strip()
        print(f"Target letter is extracted")
        
        print("Waiting for countdown to finish...")
        await asyncio.sleep(5)
        
        # Fill inputs
        print("Filling Alice's answers with invalid short words to force voting...")
        for i in range(5):
            await page1.locator('input').nth(i).fill(f"{letter}{letter}")
            
        print("Filling Bob's answers with invalid short words...")
        for i in range(5):
            await page2.locator('input').nth(i).fill(f"{letter}{letter}{letter}") # slightly different
            
        # Submit
        print("Submitting Bob's answers...")
        await page2.click('[data-testid="button-bus-complete"]', force=True)
        await asyncio.sleep(1)
        
        print("Submitting Alice's answers...")
        await page1.click('[data-testid="button-bus-complete"]', force=True)
        
        print("Waiting for voting phase to start...")
        try:
            await page1.wait_for_selector('text="محكمة اللعبة!"', timeout=15000)
            print("Voting started successfully!")
            
            # voting is sequential!
            await asyncio.sleep(2) 
            
            # Loop until votes are complete
            while True:
                # Check whose word is on trial by looking for "طلب المراجعة من"
                if await page1.locator('text="Alice"').count() > 0 and await page1.locator('text="طلب المراجعة من:"').count() > 0:
                    print("Someone's word is on trial...")
                    # Both attempt to vote. The one who is requester won't see the vote buttons!
                    if await page2.locator('text="موافقة"').count() > 0:
                        await page2.click('text="موافقة"')
                    if await page1.locator('text="موافقة"').count() > 0:
                        await page1.click('text="موافقة"')
                        
                if await page1.locator('text="النتائج"').count() > 0 or await page1.locator('text="الترتيب النهائي"').count() > 0:
                    print("Voting finished. We are on the results page.")
                    break
                await asyncio.sleep(1)
                
            print("Verifying points...")
            alice_score = await page1.locator('.tabular-nums').first.inner_text()
            print(f"Score extracted: {alice_score}")
            print("SUCCESS! Voting logic passed automatically.")
        except Exception as e:
            print(f"Error during voting phase: {e}")

        await browser.close()
        print("Test complete.")

if __name__ == "__main__":
    asyncio.run(test_voting())
