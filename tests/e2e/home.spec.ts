import { test, expect } from '@playwright/test';
import {
  API_HOST,
  API_NAME,
  DEAD_API_HOST,
  clearAppState,
  createReport,
  firstLocalReportId,
  holdReportKeyInSession,
  mockVulnrepoApi,
  mockVulnrepoApiDown,
  seedApiVault,
  unlockApiVault,
  uniqueReportTitle,
} from './fixtures';

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

  test.describe('remote reports (API vault)', () => {
    const remoteReport = {
      report_id: 'e2e-remote-0001',
      report_name: 'Remote E2E Report',
      report_createdate: Date.now() - 86_400_000,
      report_lastupdate: Date.now(),
    };

    test('offers the vault unlock instead of silently hiding remote reports', async ({ page }) => {
      await seedApiVault(page);
      await mockVulnrepoApi(page, { getreportslist: [remoteReport] });

      await page.goto('/home');

      const call = page.locator('.vr-vault-call');
      await expect(call).toContainText('Reports on your vulnrepo server are not listed');
      await expect(page.getByRole('button', { name: /Open vault/i }).first()).toBeVisible();

      // Locked means unlistable — the remote report must not appear yet.
      await expect(page.locator('.vr-row', { hasText: remoteReport.report_name })).toHaveCount(0);
    });

    test('unlocking the vault lists remote reports under Continue where you left off', async ({ page }) => {
      await seedApiVault(page);
      await mockVulnrepoApi(page, { getreportslist: [remoteReport] });

      await page.goto('/home');
      await unlockApiVault(page);

      await expect(page.getByRole('heading', { name: /Continue where you left off/i })).toBeVisible();

      const row = page.locator('.vr-row', { hasText: remoteReport.report_name });
      await expect(row).toBeVisible();
      await expect(row).toHaveAttribute('href', new RegExp(`/report/${remoteReport.report_id}`));
      await expect(row.locator('.vr-row__remote')).toBeVisible();
      await expect(row).toContainText(API_NAME);

      // getreportslist need not return report_stats, so counts are unknown —
      // which must not read as "no findings".
      await expect(row).toContainText('counts n/a');

      await expect(page.locator('.vr-vault-call')).toHaveCount(0);
      await expect(page.locator('.vr-status__item', { hasText: 'Reports' })).toContainText('1');
      await expect(page.locator('.vr-status')).toContainText('local + API');
    });

    test('remote reports promote a vault with no local reports out of first run', async ({ page }) => {
      await seedApiVault(page);
      await mockVulnrepoApi(page, { getreportslist: [remoteReport] });

      await page.goto('/home');
      await expect(page.getByRole('heading', { name: /Three steps to a delivered report/i })).toBeVisible();

      await unlockApiVault(page);
      await expect(page.getByRole('heading', { name: /Three steps to a delivered report/i })).toHaveCount(0);
      await expect(page.getByRole('link', { name: /All reports/i }).first()).toBeVisible();
    });

    test('merges local and remote reports into one recent list', async ({ page }) => {
      const title = uniqueReportTitle('E2E Local');
      await createReport(page, title);
      await seedApiVault(page);
      await mockVulnrepoApi(page, { getreportslist: [remoteReport] });

      await page.goto('/home');
      await expect(page.locator('.vr-row', { hasText: title })).toBeVisible();

      await unlockApiVault(page);
      await expect(page.locator('.vr-row', { hasText: title })).toBeVisible();
      await expect(page.locator('.vr-row', { hasText: remoteReport.report_name })).toBeVisible();
      await expect(page.locator('.vr-status__item', { hasText: 'Reports' })).toContainText('2');
    });

    test('names an endpoint that did not answer instead of dropping it silently', async ({ page }) => {
      await seedApiVault(page);
      await mockVulnrepoApiDown(page);

      await page.goto('/home');
      await unlockApiVault(page);

      const warn = page.locator('.vr-vault-call--warn');
      await expect(warn).toContainText('did not answer');
      await expect(warn).toContainText(API_NAME);
      await expect(warn).toContainText('no response');
      await expect(warn.getByRole('button', { name: /Retry/i })).toBeVisible();

      // The inline strip is the only error channel: the global snackbar is for
      // actions the user asked for, not for a background listing.
      await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);
    });

    test('a failing endpoint never contradicts reports that did load', async ({ page }) => {
      await seedApiVault(page, [
        { value: API_HOST, apikey: 'e2e-api-key', viewValue: API_NAME },
        { value: DEAD_API_HOST, apikey: 'e2e-api-key', viewValue: 'E2E DEAD SERVER' },
      ]);
      await mockVulnrepoApi(page, { getreportslist: [remoteReport] });
      await mockVulnrepoApiDown(page, DEAD_API_HOST);

      await page.goto('/home');
      await unlockApiVault(page);

      await expect(page.locator('.vr-row', { hasText: remoteReport.report_name })).toBeVisible();
      await expect(page.locator('.vr-vault-call--warn')).toContainText('E2E DEAD SERVER');
      await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);
    });

    // The navbar probes every held report key against every configured API
    // whenever the key vault changes, so unlocking on home fires a getreport
    // the user never asked for. A local-only report is absent from the server;
    // if that server answers with anything but 404, the old global snackbar
    // claimed "CAN'T CONNECT TO API" on top of reports that had just loaded.
    test('a failed background probe does not contradict a working connection', async ({ page }) => {
      const title = uniqueReportTitle('E2E Local');
      await createReport(page, title);
      await holdReportKeyInSession(page, await firstLocalReportId(page));
      await seedApiVault(page);

      const actions: string[] = [];
      await page.route(`https://${API_HOST}/api/`, async route => {
        const cors = {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
        };
        if (route.request().method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: cors });
          return;
        }
        const action = route.request().headers()['vulnrepo-action'] ?? '';
        actions.push(action);
        if (action === 'getreportslist') {
          await route.fulfill({
            status: 200,
            headers: { ...cors, 'content-type': 'application/json' },
            body: JSON.stringify([remoteReport]),
          });
          return;
        }
        await route.fulfill({ status: 500, headers: cors, body: 'nope' });
      });

      await page.goto('/home');
      await unlockApiVault(page);

      await expect(page.locator('.vr-row', { hasText: remoteReport.report_name })).toBeVisible();
      // The probe really did run and really did fail...
      await expect.poll(() => actions).toContain('getreport');
      // ...and stayed out of the global error channel.
      await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);
    });

    // A report updated on a server keeps its report_id, so the same id can
    // name a copy on disk and a copy on the server. Both are reports the user
    // has; collapsing them on id made the totals read local-only.
    test('counts a report held both locally and on a server as two', async ({ page }) => {
      const title = uniqueReportTitle('E2E Local');
      await createReport(page, title);
      const sharedId = await firstLocalReportId(page);

      await seedApiVault(page);
      await mockVulnrepoApi(page, {
        getreportslist: [{
          report_id: sharedId,
          report_name: title,
          report_createdate: Date.now() - 1000,
          report_lastupdate: Date.now(),
        }],
      });

      await page.goto('/home');
      await expect(page.locator('.vr-status__item', { hasText: 'Reports' })).toContainText('1');

      await unlockApiVault(page);

      const stat = page.locator('.vr-status__item', { hasText: 'Reports' });
      await expect(stat).toContainText('2');
      await expect(stat).toContainText('1 local · 1 remote');

      // Both rows render — the shared id must not collapse them or break @for.
      await expect(page.locator('.vr-row', { hasText: title })).toHaveCount(2);
      await expect(page.locator('.vr-row__remote')).toHaveCount(1);
    });

    // The API vault is not a report key. It used to be stored under
    // VULNREPO-SECKEY-VAULT, inside the report-key prefix, so a session-mode
    // reload restored it as a report whose id was "VAULT".
    test('opening the API vault does not count as an open report', async ({ page }) => {
      await seedApiVault(page);
      await mockVulnrepoApi(page, { getreportslist: [remoteReport] });
      await page.evaluate(() => localStorage.setItem('VULNREPO-KEY-VAULT-MODE', 'session'));

      await page.goto('/home');
      await unlockApiVault(page);
      await expect(page.locator('.vr-row', { hasText: remoteReport.report_name })).toBeVisible();

      const keyState = page.locator('.vr-status__item').first();
      await expect(keyState).toContainText('Vault locked');
      await expect(keyState).not.toContainText('1 key');

      // Session mode keeps the vault across a reload — still not a report key.
      await page.reload();
      await expect(page.locator('.vr-row', { hasText: remoteReport.report_name })).toBeVisible();
      await expect(page.locator('.vr-status__item').first()).toContainText('Vault locked');
      expect(await page.evaluate(() => sessionStorage.getItem('VULNREPO-SECKEY-VAULT'))).toBeNull();
    });

    test('counts held report keys separately from the API vault', async ({ page }) => {
      const title = uniqueReportTitle('E2E Local');
      await createReport(page, title);
      await holdReportKeyInSession(page, await firstLocalReportId(page));
      await seedApiVault(page);
      await mockVulnrepoApi(page, { getreportslist: [remoteReport] });

      await page.goto('/home');
      await unlockApiVault(page);

      // One report key held, and the API vault open — the count stays at one.
      const keyState = page.locator('.vr-status__item').first();
      await expect(keyState).toContainText('Vault unlocked');
      await expect(keyState).toContainText('1 key in memory');
    });

    test('a duplicated endpoint is queried once', async ({ page }) => {
      const endpoint = { value: API_HOST, apikey: 'e2e-api-key', viewValue: API_NAME };
      await seedApiVault(page, [endpoint, { ...endpoint }]);

      let calls = 0;
      await page.route(`https://${API_HOST}/api/`, async route => {
        const cors = {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
        };
        if (route.request().method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: cors });
          return;
        }
        calls = calls + 1;
        await route.fulfill({
          status: 200,
          headers: { ...cors, 'content-type': 'application/json' },
          body: JSON.stringify([remoteReport]),
        });
      });

      await page.goto('/home');
      await unlockApiVault(page);

      await expect(page.locator('.vr-row', { hasText: remoteReport.report_name })).toHaveCount(1);
      expect(calls).toBe(1);
    });

    test('does not mention the API when no vault is stored', async ({ page }) => {
      await page.goto('/home');
      await expect(page.locator('.vr-vault-call')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Open vault/i })).toHaveCount(0);
      await expect(page.locator('.vr-status')).toContainText('local only');
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
