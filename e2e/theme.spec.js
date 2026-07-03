import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test('should toggle between dark and light themes', async ({ page }) => {
    await page.goto('/#app');
    
    // Find theme toggle button
    const themeBtn = page.locator('button:has(svg.lucide-sun), button:has(svg.lucide-moon)');
    await expect(themeBtn).toBeVisible();
    
    // Check initial theme is dark
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/light/);
    
    // Click to toggle
    await themeBtn.click();
    
    // Should now have light class
    await expect(html).toHaveClass(/light/);
  });

  test('should persist theme preference across reloads', async ({ page }) => {
    await page.goto('/#app');
    
    // Toggle to light
    await page.locator('button:has(svg.lucide-sun), button:has(svg.lucide-moon)').click();
    
    // Reload
    await page.reload();
    
    // Should still be light
    const html = page.locator('html');
    await expect(html).toHaveClass(/light/);
  });
});
