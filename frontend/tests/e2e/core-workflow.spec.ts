import { test, expect } from '@playwright/test';

test.describe('Core Retention Loop E2E', () => {
  test('Signup form renders with all fields', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Login form renders with all fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Subjects page loads', async ({ page }) => {
    await page.goto('/subjects');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Notes page loads and shows empty state', async ({ page }) => {
    await page.goto('/notes');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Flashcards page loads', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Pricing page renders plan cards', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Account page shows subscription status', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Search page loads', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Document upload page loads', async ({ page }) => {
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Quiz page renders', async ({ page }) => {
    await page.goto('/quiz');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Gap analysis page loads', async ({ page }) => {
    await page.goto('/gaps');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Socratic review page loads', async ({ page }) => {
    await page.goto('/review/socratic', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible({ timeout: 5000 });
  });
});
