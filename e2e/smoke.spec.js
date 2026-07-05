import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const uploadsDir = resolve('../uploads');
const videoFiles = existsSync(uploadsDir)
  ? readdirSync(uploadsDir).filter(f => f.endsWith('.mp4'))
  : [];

test('backend API is healthy', async ({ request }) => {
  const resp = await request.get('http://localhost:8000/health');
  await expect(resp.ok()).toBeTruthy();
});

test('frontend serves SPA', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#root', { timeout: 10000 });
  const html = await page.locator('#root').innerHTML();
  expect(html.length).toBeGreaterThan(0);
});

if (videoFiles.length > 0) {
  test('API accepts file upload', async ({ request }) => {
    const videoPath = resolve(uploadsDir, videoFiles[0]);
    const buffer = readFileSync(videoPath);

    const resp = await request.post('http://localhost:8000/api/process', {
      multipart: {
        file: { name: 'test.mp4', mimeType: 'video/mp4', buffer },
        acknowledged: 'true'
      },
      headers: {
        'X-Gemini-Key': 'test-key',
        'X-LLM-Provider': 'gemini'
      }
    });
    expect(resp.ok()).toBeTruthy();
  });
}
