import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should display the landing page correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check title
    await expect(page).toHaveTitle(/ShortLab/);
    
    // Check main heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Clip Generator/);
    
    // Check Launch App button
    const launchBtn = page.locator('button', { hasText: 'Launch App' });
    await expect(launchBtn).toBeVisible();
  });

  test('should navigate to app via Launch App button', async ({ page }) => {
    await page.goto('/');
    
    // Click launch app
    await page.locator('button', { hasText: 'Launch App' }).click();
    
    // Should navigate to app view
    await expect(page.locator('#app-view')).toBeVisible({ timeout: 5000 });
  });

  test('should display features section', async ({ page }) => {
    await page.goto('/');
    const featuresSection = page.locator('#features');
    await expect(featuresSection).toBeVisible();
  });

  test('should display FAQ section with toggleable items', async ({ page }) => {
    await page.goto('/');
    const faqSection = page.locator('#faq');
    await expect(faqSection).toBeVisible();
    
    // Click first FAQ item
    const firstFaq = faqSection.locator('button').first();
    await firstFaq.click();
    
    // Check that answer is now visible
    const answer = faqSection.locator('.faq-answer').first();
    await expect(answer).toBeVisible();
  });
});
