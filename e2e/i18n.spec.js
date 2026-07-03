import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test('should switch language to Portuguese', async ({ page }) => {
    await page.goto('/#app');
    
    // Find language selector
    const langSelect = page.locator('select');
    await expect(langSelect).toBeVisible();
    
    // Switch to Portuguese
    await langSelect.selectOption('pt');
    
    // Page should reload - wait for it
    await page.waitForLoadState('networkidle');
    
    // Should show Portuguese text
    await expect(page.locator('text=Configurações').first()).toBeVisible({ timeout: 5000 });
  });
});
