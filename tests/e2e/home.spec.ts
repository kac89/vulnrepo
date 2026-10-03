import { test, expect } from '@playwright/test';
import { clearAppState, createReport, uniqueReportTitle } from './fixtures';

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page);
  });

  test('redirects from root to /home', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/home$/);
  });

  test('toolbar logo links back to /home', async ({ page }) => {
    await page.goto('/faq');
    await expect(page).toHaveURL(/\/faq$/);
    await page.locator('a.logo-link').click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test.describe('first run (empty vault)', () => {
    test('renders the banner headline and an in-app primary CTA', async ({ page }) => {
      await page.goto('/home');
      await expect(page.getByRole('heading', { name: /Vulnerability reports/i })).toBeVisible();

      // The primary action must enter the app, not open an external tab.
      const cta = page.getByRole('link', { name: /Create your first report/i });
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute('href', /\/new-report$/);
      await expect(cta).not.toHaveAttribute('target', '_blank');
    });

    test('primary CTA navigates to the new report form', async ({ page }) => {
      await page.goto('/home');
      await page.getByRole('link', { name: /Create your first report/i }).click();
      await expect(page).toHaveURL(/\/new-report$/);
    });

    test('shows the three-step quickstart', async ({ page }) => {
      await page.goto('/home');
      await expect(page.getByRole('heading', { name: /Three steps to a delivered report/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Create your first report' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Add a finding' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Export or share' })).toBeVisible();
    });

    test('status bar reports a locked vault and no reports', async ({ page }) => {
      await page.goto('/home');
      const status = page.locator('.vr-status');
      await expect(status).toContainText('Vault locked');
      await expect(status.locator('.vr-status__item', { hasText: 'Reports' })).toContainText('0');
    });

    test('does not render the workspace sections', async ({ page }) => {
      await page.goto('/home');
      await expect(page.getByRole('heading', { name: /Continue where you left off/i })).toHaveCount(0);
    });
  });

  test.describe('workspace (reports exist)', () => {
    test('lists recent work linking straight into the report', async ({ page }) => {
      const title = uniqueReportTitle('E2E Home');
      await createReport(page, title);

      await page.goto('/home');
      await expect(page.getByRole('heading', { name: /Continue where you left off/i })).toBeVisible();

      const row = page.locator('.vr-row', { hasText: title });
      await expect(row).toBeVisible();
      await expect(row).toHaveAttribute('href', /\/report\//);

      await expect(page.locator('.vr-status__item', { hasText: 'Reports' })).toContainText('1');
    });

    test('replaces the first-run quickstart with the action deck', async ({ page }) => {
      await createReport(page, uniqueReportTitle('E2E Home'));

      await page.goto('/home');
      await expect(page.getByRole('heading', { name: /Three steps to a delivered report/i })).toHaveCount(0);

      await expect(page.getByRole('link', { name: /New report/i }).first()).toHaveAttribute('href', /\/new-report$/);
      await expect(page.getByRole('link', { name: /All reports/i }).first()).toHaveAttribute('href', /\/my-reports$/);
    });
  });

  test.describe('shared sections', () => {
    test('capability tracks link to real in-app routes', async ({ page }) => {
      await page.goto('/home');
      await expect(page.getByRole('link', { name: 'Custom issue templates' })).toHaveAttribute('href', /\/templates-list$/);
      await expect(page.getByRole('link', { name: /CVE & CWE search/i })).toHaveAttribute('href', /\/cve-search$/);
      await expect(page.getByRole('link', { name: 'OWASP ASVS' })).toHaveAttribute('href', /\/asvs$/);
      await expect(page.getByRole('link', { name: 'PCI DSS 4' })).toHaveAttribute('href', /\/pcidss4$/);
    });

    test('proof panel names the real crypto primitives', async ({ page }) => {
      await page.goto('/home');
      const proof = page.locator('.vr-proof');
      await expect(proof).toContainText('AES-256-GCM');
      await expect(proof).toContainText('PBKDF2-SHA-256');
      await expect(proof).toContainText('600,000 iterations');
      await expect(proof).toContainText('IndexedDB');
    });

    test('footer lists each destination once', async ({ page }) => {
      await page.goto('/home');
      const links = page.locator('.vr-foot__links a');
      await expect(links.filter({ hasText: /^FAQ$/ })).toHaveCount(1);
      await expect(links.filter({ hasText: /^Source$/ })).toHaveCount(1);
      await expect(links.filter({ hasText: /^Video walkthroughs$/ })).toHaveCount(1);
    });
  });
});
