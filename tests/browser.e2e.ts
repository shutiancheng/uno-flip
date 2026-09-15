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

test('two real WebRTC peers connect and exchange a turn', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  await host.goto('/');
  await host.getByLabel('Your table name').fill('Mira');
  await host.getByRole('button', { name: /Create private room/i }).click();
  const invite = await host.locator('.invite-box input').inputValue();
  await guest.goto(invite);
  await expect(host.locator('.live')).toContainText('Connected live', { timeout: 35_000 });
  await expect(guest.locator('.live')).toContainText('Connected live', { timeout: 35_000 });
  await expect(host.locator('.my-hand .hand-card')).toHaveCount(7);
  await expect(guest.locator('.my-hand .hand-card')).toHaveCount(7);
  await host.locator('.draw-pile').click();
  await expect(host.locator('.my-hand .hand-card')).toHaveCount(8);
  await host.getByRole('button', { name: /Keep card/i }).click();
  await expect(guest.locator('.turn-callout')).toContainText('Your move');
  await hostContext.close();
  await guestContext.close();
});
