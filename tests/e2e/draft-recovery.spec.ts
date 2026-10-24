import { test, expect, Page } from '@playwright/test';
import { STRONG_KEY, clearAppState, createReport, uniqueReportTitle } from './fixtures';

/**
 * VR-UX-01 — unsaved work and the auto-lock.
 *
 * The vault used to skip locking whenever the open report had unsaved changes,
 * so the auto-lock guarantee lapsed exactly when there was most to lose, and a
 * closed tab took the edits with it. Unsaved edits are now stashed as an
 * encrypted draft, the lock always locks, and the draft is offered on re-unlock.
 */

const SCOPE_TEXT = 'Draft recovery scope — this edit was never released.';

/**
 * Open a report and leave its key in the vault.
 *
 * Creating a report hands the component its decrypted payload directly, so the
 * key never reaches the vault and there is nothing for a lock to clear. One
 * reload puts the report in the state a returning user finds it in: encrypted
 * on disk, unlocked by answering the key dialog.
 */
async function openReportUnlocked(page: Page, title: string): Promise<void> {
  await page.getByRole('link', { name: title }).click();
  await expect(page).toHaveURL(/\/report\/.+/);
  await expect(page.locator('.rh-title')).toBeVisible();

  await page.reload();
  await decryptDialog(page);
}

/** Answer the key dialog, asserting it is there — the proof the vault locked. */
async function decryptDialog(page: Page): Promise<void> {
  // Scope to the key dialog itself: a dialog closing from a previous step can
  // still be in the DOM, and its Decrypt button is disabled mid-decrypt.
  const dialog = page.locator('mat-dialog-container').filter({ hasText: 'Decrypt report' }).last();
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('Report security key').fill(STRONG_KEY);
  const decryptBtn = dialog.getByRole('button', { name: /Decrypt/i });
  await expect(decryptBtn).toBeEnabled();
  await decryptBtn.click();
  await expect(page.locator('.rh-title')).toBeVisible();
  // Let the key dialog finish leaving the DOM, so a later assertion about one
  // cannot match this one mid-animation. Scoped to the key dialog: the restore
  // prompt legitimately opens right behind it.
  await expect(page.locator('mat-dialog-container').filter({ hasText: 'Decrypt report' })).toHaveCount(0);
}

/**
 * Drive the vault's lock-on-hidden trigger. KeyVaultService bails out unless
 * document.visibilityState actually reads 'hidden', so override the getter
 * before dispatching the event.
 */
async function hideTab(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

/** Read the stored draft row for a report straight out of IndexedDB. */
async function readDraft(page: Page, reportId: string): Promise<any | null> {
  return page.evaluate(async id => {
    return new Promise<any | null>(resolve => {
      const open = indexedDB.open('vulnrepo-db-drafts', 1);
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains('drafts')) {
          open.result.createObjectStore('drafts');
        }
      };
      open.onsuccess = () => {
        const db = open.result;
        const req = db.transaction('drafts', 'readonly').objectStore('drafts').get(id);
        req.onsuccess = () => { resolve(req.result ?? null); db.close(); };
        req.onerror = () => { resolve(null); db.close(); };
      };
      open.onerror = () => resolve(null);
    });
  }, reportId);
}

/**
 * Wait for the stash to land. The pre-lock handler captures the key and the
 * JSON synchronously but finishes asynchronously: a 600k-iteration PBKDF2
 * derive plus the IndexedDB write take a moment after the lock is visible.
 */
async function awaitDraft(page: Page, reportId: string): Promise<any> {
  await expect.poll(() => readDraft(page, reportId), { timeout: 20_000 }).not.toBeNull();
  return readDraft(page, reportId);
}

test.describe('Unsaved-draft recovery', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page);
  });

  test('locks a dirty report and offers the draft back on re-unlock', async ({ page }) => {
    const title = uniqueReportTitle('Draft');
    await createReport(page, title);
    await openReportUnlocked(page, title);

    const reportId = page.url().split('/report/')[1].replace(/\/$/, '');

    // Make the report dirty without saving it.
    await page.getByLabel('Report scope').first().fill(SCOPE_TEXT);
    await expect(page.getByText('You have unsaved changes')).toBeVisible();

    // The lock fires. Before this change the vault returned early here and the
    // report stayed decrypted on screen.
    await hideTab(page);

    const dialog = page.locator('mat-dialog-container');
    await expect(dialog.getByText('Decrypt report')).toBeVisible();

    // The edits were stashed, encrypted — the blob must not carry the plaintext.
    const draft = await awaitDraft(page, reportId);
    expect(draft.report_id).toBe(reportId);
    expect(typeof draft.encrypted_data).toBe('string');
    expect(draft.encrypted_data).not.toContain(SCOPE_TEXT);

    // Re-unlock: the draft is offered, not silently applied or silently lost.
    await dialog.getByPlaceholder('Report security key').fill(STRONG_KEY);
    await dialog.getByRole('button', { name: /Decrypt/i }).click();

    await expect(page.getByText('Unreleased draft found')).toBeVisible();
    await page.getByRole('button', { name: /Restore draft/i }).click();

    await expect(page.getByLabel('Report scope').first()).toHaveValue(SCOPE_TEXT);
    // Restored work is unreleased by definition, so the report is dirty again.
    await expect(page.getByText('You have unsaved changes')).toBeVisible();
  });

  test('discarding the draft returns the last released version', async ({ page }) => {
    const title = uniqueReportTitle('Draft');
    await createReport(page, title);
    await openReportUnlocked(page, title);

    const reportId = page.url().split('/report/')[1].replace(/\/$/, '');

    await page.getByLabel('Report scope').first().fill(SCOPE_TEXT);
    await expect(page.getByText('You have unsaved changes')).toBeVisible();

    await hideTab(page);
    await awaitDraft(page, reportId);
    await decryptDialog(page);

    await expect(page.getByText('Unreleased draft found')).toBeVisible();
    await page.getByRole('button', { name: /Discard draft/i }).click();

    await expect(page.getByLabel('Report scope').first()).toHaveValue('');
    await expect.poll(() => readDraft(page, reportId)).toBeNull();
  });

  test('saving the report clears the draft', async ({ page }) => {
    const title = uniqueReportTitle('Draft');
    await createReport(page, title);
    await openReportUnlocked(page, title);

    const reportId = page.url().split('/report/')[1].replace(/\/$/, '');

    await page.getByLabel('Report scope').first().fill(SCOPE_TEXT);
    await expect(page.getByText('You have unsaved changes')).toBeVisible();

    // Stash one, so there is something that has to be cleaned up.
    await hideTab(page);
    await awaitDraft(page, reportId);
    await decryptDialog(page);
    await expect(page.getByText('Unreleased draft found')).toBeVisible();
    await page.getByRole('button', { name: /Restore draft/i }).click();
    await expect(page.getByLabel('Report scope').first()).toHaveValue(SCOPE_TEXT);

    await page.getByRole('button', { name: /Save & release/i }).click();
    await expect(page.getByText('All changes saved successfully!').first()).toBeVisible();

    // Released: the draft is obsolete and must not be offered again.
    await expect.poll(() => readDraft(page, reportId)).toBeNull();

    await page.reload();
    await decryptDialog(page);
    await expect(page.getByText('Unreleased draft found')).toHaveCount(0);
    await expect(page.getByLabel('Report scope').first()).toHaveValue(SCOPE_TEXT);
  });

  test('a clean report locks with no draft left behind', async ({ page }) => {
    const title = uniqueReportTitle('Draft');
    await createReport(page, title);
    await openReportUnlocked(page, title);

    const reportId = page.url().split('/report/')[1].replace(/\/$/, '');

    await hideTab(page);
    await decryptDialog(page);

    await expect(page.getByText('Unreleased draft found')).toHaveCount(0);
    await expect.poll(() => readDraft(page, reportId)).toBeNull();
  });
});
