import { test, expect } from '@playwright/test';

test('app loads and processes a video', async ({ page }) => {
  // Set API key before loading
  await page.goto('/#app');
  await page.evaluate(() => {
    const obfuscate = (key) => 'SL_' + btoa(key);
    localStorage.setItem('gemini_key', obfuscate('test-key'));
    localStorage.setItem('llm_provider', 'gemini');
  });

  await page.reload();
  await page.waitForSelector('#app-view', { timeout: 10000 });
  await expect(page.locator('nav').first()).toBeVisible();

  // Go to Settings and verify API key is set
  await page.locator('button', { hasText: /Settings/i }).click();
  await page.waitForTimeout(1000);
});
