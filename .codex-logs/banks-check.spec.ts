import { test, expect } from 'playwright/test';

test('login and open banks page', async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('requestfailed', req => {
    const failure = req.failure()?.errorText || 'unknown';
    failedRequests.push(`${req.url()} :: ${failure}`);
  });

  await page.goto('http://localhost:5178/banks');
  if (page.url().includes('/login')) {
    await page.fill('input[autocomplete="username"]', 'admin');
    await page.fill('input[autocomplete="current-password"]', 'admin123');
    await Promise.all([
      page.waitForLoadState('networkidle'),
      page.locator('button[type="submit"]').click(),
    ]);
  }

  await page.goto('http://localhost:5178/banks');
  await expect(page.locator('h1')).toContainText('Banklar');
  await expect(page.locator('button:has-text("Yangi bank")')).toBeVisible();

  await page.screenshot({
    path: 'D:/Projects/FAMILY_FINANCE/family-finance/.codex-logs/banks-auth.png',
    fullPage: true,
  });

  if (consoleErrors.length > 0) {
    console.log('Console errors:', consoleErrors);
  }
  if (failedRequests.length > 0) {
    console.log('Failed requests:', failedRequests);
  }
});
