import { test, expect } from '@playwright/test';

test.describe('LLM Router E2E', () => {
  test('authenticates and navigates between chat and arena', async ({ page }) => {
    await page.goto('/');

    const passcodeInput = page.locator('input[type="password"]');
    if (await passcodeInput.isVisible()) {
      await passcodeInput.fill('admin123');
      await page.click('button:has-text("Enter")');
    }

    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();

    const arenaLink = page.locator('a[href="/arena"]');
    await arenaLink.click();
    await expect(page).toHaveURL(/.*arena/);

    const raceButton = page.locator('button:has-text("Lancer")');
    await expect(raceButton).toBeVisible();

    const chatLink = page.locator('a[href="/"]');
    await chatLink.click();
    await expect(page).toHaveURL(/.*\//);
  });
});
