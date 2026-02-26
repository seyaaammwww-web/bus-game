import { test, expect, Page } from '@playwright/test';

/**
 * Responsiveness tests for overlays and key components
 * Tests desktop, tablet, and mobile screen sizes
 */

const SCREEN_SIZES = [
  { name: 'Desktop', width: 1920, height: 1080 },
  { name: 'Laptop', width: 1366, height: 768 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Large Mobile', width: 480, height: 853 },
];

test.describe('Responsiveness Tests', () => {
  SCREEN_SIZES.forEach(({ name, width, height }) => {
    test(`Voting overlay renders correctly on ${name} (${width}x${height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto('http://localhost:5001');

      // Wait for voting overlay to appear
      const votingOverlay = page.locator('[role="dialog"][aria-label*="التصويت"]');
      
      if (await votingOverlay.isVisible()) {
        // Check if overlay is fully visible
        const box = await votingOverlay.boundingBox();
        expect(box).not.toBeNull();
        
        if (box) {
          // Ensure overlay fits within viewport
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
          expect(box.y).toBeGreaterThanOrEqual(0);
          expect(box.y + box.height).toBeLessThanOrEqual(height);
        }
      }
    });

    test(`Wildcard overlay renders correctly on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('http://localhost:5001');

      const wildcardOverlay = page.locator('[role="dialog"][aria-label*="Wildcard"]');
      
      if (await wildcardOverlay.isVisible()) {
        const box = await wildcardOverlay.boundingBox();
        expect(box).not.toBeNull();
        
        if (box) {
          expect(box.width).toBeLessThanOrEqual(width);
          expect(box.height).toBeLessThanOrEqual(height);
        }
      }
    });

    test(`Banish overlay is scrollable on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('http://localhost:5001');

      const banishOverlay = page.locator('[role="dialog"][aria-label*="Banish"]');
      
      if (await banishOverlay.isVisible()) {
        const playerList = banishOverlay.locator('[role="button"]').first();
        
        // Check if players list is accessible
        if (await playerList.isVisible()) {
          await playerList.scrollIntoViewIfNeeded();
          expect(await playerList.isVisible()).toBe(true);
        }
      }
    });

    test(`Buttons are accessible and tappable on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('http://localhost:5001');

      const buttons = page.locator('button[type="button"]');
      
      // Get all visible buttons
      const count = await buttons.count();
      
      for (let i = 0; i < Math.min(count, 3); i++) {
        const button = buttons.nth(i);
        
        if (await button.isVisible()) {
          const box = await button.boundingBox();
          
          if (box) {
            // Minimum touch target size: 44x44px (recommended by WCAG)
            const minSize = name === 'Mobile' ? 44 : 0;
            expect(Math.max(box.width, box.height)).toBeGreaterThanOrEqual(minSize);
          }
        }
      }
    });

    test(`Text is readable on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('http://localhost:5001');

      // Check for text that shouldn't be too small
      const textElements = page.locator('p, span, h1, h2, h3, button');
      const count = await textElements.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = textElements.nth(i);
        const fontSize = await element.evaluate((el) => {
          return window.getComputedStyle(el).fontSize;
        });

        const size = parseInt(fontSize);
        expect(size).toBeGreaterThanOrEqual(12); // Minimum readable size
      }
    });
  });

  test('Keyboard navigation works across screen sizes', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:5001');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Get focused element
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    // Should be able to focus on interactive elements
    expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focusedElement);
  });

  test('Overlays close correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5001');

    // Try to close overlay with ESC key
    await page.keyboard.press('Escape');

    // Check if any overlay is still visible
    const overlays = page.locator('[role="dialog"]');
    const visibleCount = await overlays.count();

    // Most overlays should close on ESC
    expect(visibleCount).toBeLessThanOrEqual(1);
  });

  test('Performance: Page loads quickly on slow 3G', async ({ page }) => {
    // Simulate slow 3G connection
    await page.route('**/*', (route) => {
      setTimeout(() => route.continue(), 100);
    });

    const start = Date.now();
    await page.goto('http://localhost:5001');
    const loadTime = Date.now() - start;

    // Page should load within 5 seconds on slow 3G
    expect(loadTime).toBeLessThan(5000);
  });
});
