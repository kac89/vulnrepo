import { test, expect, Page, Locator } from '@playwright/test';
import { STRONG_KEY, clearAppState, createReport, uniqueReportTitle } from './fixtures';

/**
 * VR-UX-02 — version diff and selective restore.
 *
 * Report history stored full snapshots, but the only things you could do with
 * one were download it or replace the entire report with it — so recovering a
 * single deleted asset or one field meant discarding every edit made since,
 * with no undo. These cover the diff view and the non-destructive restore path.
 */

const SCOPE_V1 = 'ORIGINAL-SCOPE-LINE';
const SCOPE_V2 = 'REWRITTEN-SCOPE-LINE';

async function openReportUnlocked(page: Page, title: string): Promise<void> {
  await page.getByRole('link', { name: title }).click();
  await expect(page).toHaveURL(/\/report\/.+/);
  await expect(page.locator('.rh-title')).toBeVisible();
  await page.reload();

  const dialog = page.locator('mat-dialog-container').filter({ hasText: 'Decrypt report' }).last();
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('Report security key').fill(STRONG_KEY);
  const decryptBtn = dialog.getByRole('button', { name: /Decrypt/i });
  await expect(decryptBtn).toBeEnabled();
  await decryptBtn.click();
  await expect(page.locator('.rh-title')).toBeVisible();
  await expect(page.locator('mat-dialog-container').filter({ hasText: 'Decrypt report' })).toHaveCount(0);
}

/**
 * The sticky bar holds the only save button, and it only appears once the
 * report is dirty. Asset edits alone do not currently arm it — the change
 * detection in ngDoCheck diffs the report's own keys and the per-issue objects,
 * and an array push leaves the `report_assets` reference untouched — so these
 * tests touch the scope field whenever they need a save to be possible.
 */
async function save(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Save & release/i }).click();
  await expect(page.getByText('All changes saved successfully!').first()).toBeVisible();
}

/**
 * Open the history dialog from the report header.
 *
 * Located by its panel class, not by its heading: the heading changes to
 * "Version diff" once a comparison is open, so a hasText filter would stop
 * matching the very dialog it is meant to scope.
 */
async function openHistory(page: Page): Promise<Locator> {
  await page.locator('.rh-history-btn').click();
  const dialog = page.locator('.history-dialog-panel');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Report History')).toBeVisible();
  return dialog;
}

/**
 * Pick the first snapshot as the older side and compare it against the live
 * report (the default "B"). The row's own "Compare with current" menu item does
 * the same thing, but a mat-menu renders in a CDK overlay outside the dialog, so
 * it needs page-level locators — exercised in the rollback test below.
 */
async function compareFirstSnapshotWithCurrent(dialog: Locator): Promise<void> {
  await dialog.locator('.pick-btn--a').first().click();
  await dialog.getByRole('button', { name: /^Compare$/i }).click();
  await expect(dialog.getByText('Version diff')).toBeVisible();
}

/**
 * A report has to be saved at least once before there is any history: each save
 * writes a snapshot of what it saved (indexeddb.service prepareupdatereport).
 */
async function reportWithOneSnapshot(page: Page, title: string): Promise<void> {
  await createReport(page, title);
  await openReportUnlocked(page, title);
  await page.getByLabel('Report scope').first().fill(SCOPE_V1);
  await save(page);
}

test.describe('Report history — version diff', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page);
  });

  test('shows no history until the report has been saved', async ({ page }) => {
    const title = uniqueReportTitle('Diff');
    await createReport(page, title);
    await openReportUnlocked(page, title);

    const dialog = await openHistory(page);
    await expect(dialog.getByText('No saved versions')).toBeVisible();
  });

  test('diffs a snapshot against the live report and restores one field', async ({ page }) => {
    const title = uniqueReportTitle('Diff');
    await reportWithOneSnapshot(page, title);

    // Diverge from the snapshot without saving — the live report is the "B" side.
    await page.getByLabel('Report scope').first().fill(SCOPE_V2);
    await expect(page.getByText('You have unsaved changes')).toBeVisible();

    const dialog = await openHistory(page);
    await compareFirstSnapshotWithCurrent(dialog);

    await expect(dialog.getByText('Report fields')).toBeVisible();

    // The scope change is reported as a line diff: old line removed, new added.
    const scopeRow = dialog.locator('.diff-row', { hasText: 'Scope' }).first();
    await scopeRow.locator('.diff-row-head').click();
    await expect(scopeRow.locator('.line--del', { hasText: SCOPE_V1 })).toBeVisible();
    await expect(scopeRow.locator('.line--add', { hasText: SCOPE_V2 })).toBeVisible();

    // Restore just that field. The dialog closes and patches the open report;
    // nothing is written to storage, so the report is left unsaved.
    await scopeRow.getByRole('button', { name: /Restore this field/i }).click();
    await expect(page.locator('.history-dialog-panel')).toHaveCount(0);

    await expect(page.getByLabel('Report scope').first()).toHaveValue(SCOPE_V1);
    await expect(page.getByText('You have unsaved changes')).toBeVisible();
  });

  test('restores an asset deleted after the snapshot was taken', async ({ page }) => {
    const title = uniqueReportTitle('Diff');
    await createReport(page, title);
    await openReportUnlocked(page, title);

    // Dirty the report via the scope field so the save button is available,
    // then record an asset and snapshot both by saving.
    await page.getByLabel('Report scope').first().fill(SCOPE_V1);
    await page.getByRole('tab', { name: /Inventory/i }).click();
    await page.getByRole('button', { name: /Add first asset/i }).click();
    await page.getByPlaceholder('e.g. payments-app').fill('payments-api');
    await page.locator('.assets-input--mono').fill('https://pay.example.test');
    await save(page);

    // Delete it — the mistake this feature exists to undo.
    await page.getByTitle('Remove asset').click();
    await expect(page.getByText('No assets recorded yet')).toBeVisible();

    const dialog = await openHistory(page);
    await compareFirstSnapshotWithCurrent(dialog);

    const assetRow = dialog.locator('.diff-row', { hasText: 'payments-api' }).first();
    await expect(assetRow.locator('.diff-kind--removed')).toBeVisible();

    // Tick it and use the tray rather than the per-row button, so both restore
    // entry points are covered across these tests.
    await assetRow.locator('.diff-row-check').click();
    await dialog.getByRole('button', { name: /Restore selected/i }).click();
    await expect(page.locator('.history-dialog-panel')).toHaveCount(0);

    await page.getByRole('tab', { name: /Inventory/i }).click();
    await expect(page.getByPlaceholder('e.g. payments-app')).toHaveValue('payments-api');
    await expect(page.locator('.assets-input--mono')).toHaveValue('https://pay.example.test');
  });

  test('reports identical versions as identical', async ({ page }) => {
    const title = uniqueReportTitle('Diff');
    await reportWithOneSnapshot(page, title);

    // No edits since the save, so the snapshot and the live report agree.
    const dialog = await openHistory(page);
    await compareFirstSnapshotWithCurrent(dialog);

    await expect(dialog.getByText('Identical')).toBeVisible();
  });

  test('keeps the destructive whole-report rollback behind a confirmation', async ({ page }) => {
    const title = uniqueReportTitle('Diff');
    await reportWithOneSnapshot(page, title);

    const dialog = await openHistory(page);
    await dialog.getByRole('button', { name: /Actions/i }).first().click();
    await page.getByRole('menuitem', { name: /Roll whole report back/i }).click();

    // The warning has to state what is lost, and offer the non-destructive
    // route, before anything happens.
    await expect(dialog.getByText(/there is no undo/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Compare first/i })).toBeVisible();

    await dialog.getByRole('button', { name: /^Cancel$/i }).click();
    await expect(dialog.getByText(/there is no undo/i)).toHaveCount(0);
    // Cancelling leaves the report untouched and the dialog open.
    await expect(dialog).toBeVisible();
  });
});
