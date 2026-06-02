import { test, expect } from "@playwright/test";

test.describe("Mobile Responsive Tests", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("no horizontal scroll on key pages", async ({ page }) => {
    const pages = [
      "/",
      "/dashboard",
      "/quiz",
      "/flashcards",
      "/gaps",
      "/review/socratic",
    ];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const scrollWidth = await page.evaluate(
        () => document.body.scrollWidth,
      );
      const windowWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth).toBeLessThanOrEqual(windowWidth);
    }
  });

  test("touch targets are at least 44x44px", async ({ page }) => {
    await page.goto("/");
    const buttons = await page.locator("button, a, [role='button']").all();
    for (const btn of buttons) {
      if (await btn.isVisible()) {
        const box = await btn.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test("socratic input visible at 375px", async ({ page }) => {
    await page.goto("/review/socratic");
    const input = page
      .locator("input, textarea, [contenteditable='true']")
      .first();
    await expect(input).toBeVisible();
  });

  test("nav collapses to hamburger at 375px", async ({ page }) => {
    await page.goto("/");
    const hamburger = page
      .locator(
        '[aria-label="Menu"], .hamburger, button:has(svg), [aria-label="Open navigation menu"]',
      )
      .first();
    await expect(hamburger).toBeVisible();
  });

  test("quiz option buttons fill width on mobile", async ({ page }) => {
    await page.goto("/quiz");
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    const buttons = await page
      .locator("button:has(span.flex-1)")
      .first()
      .all();
    for (const btn of buttons) {
      const box = await btn.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThan(viewportWidth * 0.8);
      }
    }
  });

  test("flashcard flip card fits viewport width", async ({ page }) => {
    await page.goto("/flashcards/study");
    const card = page.locator(".perspective .relative").first();
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    if (box) {
      expect(box.width).toBeLessThanOrEqual(viewportWidth);
    }
  });

  test("gap stat cards stack vertically at 375px", async ({ page }) => {
    await page.goto("/gaps");
    const cards = page.locator(".rounded-2xl.border").first();
    await expect(cards).toBeVisible();
    const stackDirection = await page.evaluate(() => {
      const grid = document.querySelector(".grid");
      if (!grid) return "unknown";
      return window.getComputedStyle(grid).gridTemplateColumns;
    });
    expect(stackDirection).not.toContain("3");
  });

  test("dashboard stat cards are full width on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    const firstStat = page.locator(".rounded-3xl.border").first();
    const box = await firstStat.boundingBox();
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    if (box) {
      expect(box.width).toBeGreaterThan(viewportWidth * 0.8);
    }
  });

  test("bottom nav bar is visible on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    const bottomNav = page.locator("nav.fixed.bottom-0");
    await expect(bottomNav).toBeVisible();
    const items = await bottomNav.locator("a").all();
    expect(items.length).toBeGreaterThan(3);
  });

  test("hamburger sheet opens and displays nav items", async ({ page }) => {
    await page.goto("/dashboard");
    const hamburger = page
      .locator('[aria-label="Open navigation menu"]')
      .first();
    await hamburger.click();
    const sheet = page.locator('[role="dialog"]');
    await expect(sheet).toBeVisible();
    const links = await sheet.locator("a").all();
    expect(links.length).toBeGreaterThan(5);
  });

  test("socratic chat input is sticky above keyboard", async ({ page }) => {
    await page.goto("/review/socratic?question=test");
    const input = page.locator("input[placeholder='Type your answer...']");
    await expect(input).toBeVisible();
    const inputBox = await input.boundingBox();
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    if (inputBox) {
      expect(inputBox.y + inputBox.height).toBeGreaterThan(
        viewportHeight - 100,
      );
    }
  });

  test("flashcard quality buttons have adequate touch targets", async ({
    page,
  }) => {
    await page.goto("/flashcards/study");
    const card = page.locator(".perspective .relative").first();
    await card.click();
    const qualityBtns = page.locator("button:has(span.text-lg)");
    const count = await qualityBtns.count();
    expect(count).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < count; i++) {
      const btn = qualityBtns.nth(i);
      if (await btn.isVisible()) {
        const box = await btn.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });
});
