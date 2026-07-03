import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should navigate directly to app', async ({ page }) => {
    await page.goto('/#app');
    
    // Check sidebar is visible
    const sidebar = page.locator('nav').first();
    await expect(sidebar).toBeVisible();
    
    // Check main content area
    const main = page.locator('#app-view');
    await expect(main).toBeVisible();
  });

  test('should have sidebar navigation tabs', async ({ page }) => {
    await page.goto('/#app');
    
    // Check Clip Generator tab
    const clipGenTab = page.locator('button', { hasText: 'Clip Generator' });
    await expect(clipGenTab).toBeVisible();
    
    // Check AI Shorts tab  
    const aiShortsTab = page.locator('button', { hasText: 'AI Shorts' });
    await expect(aiShortsTab).toBeVisible();
    
    // Check Settings tab
    const settingsTab = page.locator('button', { hasText: /Settings/ });
    await expect(settingsTab).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    await page.goto('/#app');
    
    // Click AI Shorts tab
    await page.locator('button', { hasText: 'AI Shorts' }).click();
    
    // Click Settings tab
    await page.locator('button', { hasText: /Settings/ }).click();
    
    // Should show settings content
    await expect(page.locator('text=Gemini API Key').first()).toBeVisible({ timeout: 3000 });
  });
});
