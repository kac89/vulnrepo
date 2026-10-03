import { test, expect } from '@playwright/test';
import { STRONG_KEY, acknowledgeKey, clearAppState, createReport, uniqueReportTitle } from './fixtures';

test.describe('Create a new report', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page);
  });

  test('creates a local report and lands on My Reports with the new entry', async ({ page }) => {
    const title = uniqueReportTitle();

    await createReport(page, title);

    await expect(page.getByRole('heading', { name: 'My Reports' })).toBeVisible();
    await expect(page.getByRole('link', { name: title })).toBeVisible();
  });

  test('persists the newly created report across reloads', async ({ page }) => {
    const title = uniqueReportTitle();
    await createReport(page, title);

    await page.reload();
    await expect(page.getByRole('link', { name: title })).toBeVisible();
  });

  test('opens the created report and shows the encrypted-status badge', async ({ page }) => {
    const title = uniqueReportTitle();
    await createReport(page, title);

    await page.getByRole('link', { name: title }).click();
    await expect(page).toHaveURL(/\/report\/.+/);
    await expect(page.locator('.status-badge')).toBeVisible();
  });

  test('opens with a key already generated and strong', async ({ page }) => {
    await page.goto('/new-report');

    await expect(page.getByText('Strong')).toBeVisible();
    await expect(page.getByRole('button', { name: /Regenerate/i })).toBeVisible();
    await expect(page.getByText(/Still needs/)).toBeVisible();
  });

  test('will not create until the saved-key box is ticked', async ({ page }) => {
    await page.goto('/new-report');

    await page.getByPlaceholder('e.g. External penetration testing report').fill(uniqueReportTitle());
    await page.getByRole('button', { name: /Create report/i }).click();

    await expect(page.getByText('Confirm you have saved the key before creating the report.')).toBeVisible();
    await expect(page).toHaveURL(/\/new-report$/);
  });

  test('rejects an empty title', async ({ page }) => {
    await page.goto('/new-report');

    await acknowledgeKey(page);
    await page.getByRole('button', { name: /Create report/i }).click();

    await expect(page.getByText('Title must not be empty!')).toBeVisible();
    await expect(page).toHaveURL(/\/new-report$/);
  });

  test('rejects a security key that is too weak', async ({ page }) => {
    // SeckeyValidatorService treats keys matching /passw.*|12345.*|09876.*|qwert.*|asdfg.*|zxcvb.*/
    // as "Common" (strength 1); the form requires "OK" (3) or better.
    const commonKey = 'password12345';

    await page.goto('/new-report');

    await page.getByRole('button', { name: /Type my own key/i }).click();
    await page.getByPlaceholder('Min. 8 characters').fill(commonKey);
    await page.getByPlaceholder('Re-enter security key').fill(commonKey);
    await page.getByPlaceholder('e.g. External penetration testing report').fill(uniqueReportTitle());
    await acknowledgeKey(page);
    await page.getByRole('button', { name: /Create report/i }).click();

    await expect(page.getByText('Security key is too weak!').first()).toBeVisible();
    await expect(page).toHaveURL(/\/new-report$/);
  });

  // The save path refuses a key with whitespace. It used to do so with a
  // console.log, so the click did nothing at all and said nothing.
  test('rejects a security key containing a space', async ({ page }) => {
    const spacedKey = 'Vulnr3p0 E2E!Key';

    await page.goto('/new-report');

    await page.getByRole('button', { name: /Type my own key/i }).click();
    await page.getByPlaceholder('Min. 8 characters').fill(spacedKey);
    await page.getByPlaceholder('Re-enter security key').fill(spacedKey);
    await page.getByPlaceholder('e.g. External penetration testing report').fill(uniqueReportTitle());
    await acknowledgeKey(page);
    await page.getByRole('button', { name: /Create report/i }).click();

    await expect(page.getByText('Spaces are not allowed in a key!').first()).toBeVisible();
    await expect(page).toHaveURL(/\/new-report$/);
  });

  test('rejects mismatched security keys', async ({ page }) => {
    await page.goto('/new-report');

    await page.getByRole('button', { name: /Type my own key/i }).click();
    await page.getByPlaceholder('Min. 8 characters').fill(STRONG_KEY);
    await page.getByPlaceholder('Re-enter security key').fill(STRONG_KEY + 'X');
    await page.getByPlaceholder('e.g. External penetration testing report').fill(uniqueReportTitle());
    await acknowledgeKey(page);
    await page.getByRole('button', { name: /Create report/i }).click();

    await expect(page.getByText('Keys do not match!').first()).toBeVisible();
    await expect(page).toHaveURL(/\/new-report$/);
  });

  test('names the destination even with no server configured', async ({ page }) => {
    await page.goto('/new-report');

    await expect(page.getByRole('radio', { name: /This browser/i })).toBeChecked();
    await expect(page.getByText(/Clearing site data deletes them/)).toBeVisible();
  });

  test('Cancel goes back to My Reports', async ({ page }) => {
    await page.goto('/my-reports');
    await expect(page).toHaveURL(/\/my-reports$/);

    await page.getByRole('button', { name: /New report/i }).first().click();
    await expect(page).toHaveURL(/\/new-report$/);

    await page.getByRole('button', { name: /^Cancel$/i }).click();
    await expect(page).toHaveURL(/\/my-reports$/);
  });
});
