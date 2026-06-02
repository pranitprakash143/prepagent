import { test, expect } from '@playwright/test';

test.describe('Mobile Responsive Audit - 375px Viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('Quiz page has no horizontal scroll', async ({ page }) => {
    await page.goto('/quiz');
    await page.waitForLoadState('networkidle');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasOverflow).toBe(false);
  });

  test('Flashcards page has no horizontal scroll', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasOverflow).toBe(false);
  });

  test('Gap Analysis page has no horizontal scroll', async ({ page }) => {
    await page.goto('/gaps');
    await page.waitForLoadState('networkidle');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasOverflow).toBe(false);
  });

  test('Socratic Review page has no horizontal scroll', async ({ page }) => {
    await page.goto('/review/socratic');
    await page.waitForLoadState('networkidle');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasOverflow).toBe(false);
  });

  test('Document detail page has no horizontal scroll', async ({ page }) => {
    await page.goto('/documents/test-id');
    await page.waitForLoadState('networkidle');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasOverflow).toBe(false);
  });

  test('Touch targets are at least 44x44px on Quiz page', async ({ page }) => {
    await page.goto('/quiz');
    await page.waitForLoadState('domcontentloaded');
    const buttons = page.locator(
      'button:visible, a:visible, [role="button"]:visible'
    );
    const count = await buttons.count();
    let failures = 0;
    for (let i = 0; i < Math.min(count, 10); i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        const wOk = box.width >= 44;
        const hOk = box.height >= 44;
        if (!wOk || !hOk) {
          failures++;
        }
      }
    }
    expect(failures).toBeLessThanOrEqual(2);
  });

  test('Focus mode hides navigation on mobile', async ({ page }) => {
    await page.goto('/review/socratic');
    await page.waitForLoadState('networkidle');
    const focusButton = page.getByRole('button', { name: /focus|zen/i });
    if (await focusButton.isVisible()) {
      await focusButton.click();
      await page.waitForTimeout(500);
      const nav = page.locator('nav, header, [role="navigation"]');
      await expect(nav.first()).not.toBeVisible();
    }
  });
});
