import { expect, test } from '@playwright/test';

test('landing and practice game are playable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /One deck/i })).toBeVisible();
  await page.getByRole('button', { name: /practice round/i }).click();
  await expect(page.getByRole('heading', { name: 'Practice duel' })).toBeVisible();
  await expect(page.locator('.my-hand .hand-card')).toHaveCount(7);
  await expect(page.locator('.discard-pile .card')).toBeVisible();
});

test('host creates a private invitation', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your table name').fill('Mira');
  await page.getByRole('button', { name: /Create private room/i }).click();
  await expect(page.getByRole('heading', { name: 'Two-player duel' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your table is ready' })).toBeVisible();
  await expect(page).toHaveURL(/\/room\/[a-f0-9-]{36}/);
});
