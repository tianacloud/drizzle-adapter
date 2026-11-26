import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  if (!process.env.TIANA_TEST_URL) throw new Error('Set TIANA_TEST_URL to the running browser example.');
  await page.goto(process.env.TIANA_TEST_URL);
  await expect(page.locator('#status')).toHaveText('Connected');
});

test('real SQLite supports typed queries, transactions, savepoints and atomic batches', async ({ page }) => {
  await page.getByRole('button', { name: 'Run database checks' }).click();
  await expect(page.locator('#results')).toContainText('All database checks passed.');
  await expect(page.locator('#status')).toHaveText('Saved');
});

test('notes survive refresh and can be updated and deleted with keyboard or touch', async ({ page }, info) => {
  const title = `${info.project.name} 中文 O'Reilly ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Note' }).fill(title);
  await page.getByRole('textbox', { name: 'Note' }).press('Enter');
  const row = page.getByRole('listitem').filter({ hasText: title });
  await expect(row).toBeVisible();
  await page.reload();
  await expect(page.locator('#status')).toHaveText('Connected');
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Undo' })).toBeVisible();
  await page.reload();
  await expect(page.locator('#status')).toHaveText('Connected');
  await expect(row.getByRole('button', { name: 'Undo' })).toBeVisible();
  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#status')).toHaveText('Connected');
  await expect(row).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('network failure leaves input available for a deliberate retry', async ({ page, context }) => {
  const title = `offline-${Date.now()}`;
  await context.setOffline(true);
  await page.getByRole('textbox', { name: 'Note' }).fill(title);
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.locator('#status')).toContainText('Operation failed.');
  await expect(page.getByRole('textbox', { name: 'Note' })).toHaveValue(title);
  await expect(page.getByRole('button', { name: 'Add note' })).toBeEnabled();
  await context.setOffline(false);
  await page.reload();
  await expect(page.locator('#status')).toHaveText('Connected');
  await expect(page.getByRole('listitem').filter({ hasText: title })).toHaveCount(0);
});
