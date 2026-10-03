import { Page, expect } from '@playwright/test';

export const STRONG_KEY = 'Vulnr3p0_E2E!Key';

export function uniqueReportTitle(prefix = 'E2E Report'): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function clearAppState(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(async () => {
    try { sessionStorage.clear(); } catch {}
    try { localStorage.clear(); } catch {}
    if (window.indexedDB && typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs
          .filter(d => !!d.name)
          .map(d => new Promise<void>(resolve => {
            const req = indexedDB.deleteDatabase(d.name!);
            req.onsuccess = req.onerror = req.onblocked = () => resolve();
          }))
      );
    } else {
      await new Promise<void>(resolve => {
        const req = indexedDB.deleteDatabase('vulnrepo-db');
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      });
    }
  });
}

// Creating a report is gated on the user confirming they kept the key, since
// nothing can decrypt the report without it. Clicking the label toggles the
// mat-checkbox whose own input is visually hidden.
export async function acknowledgeKey(page: Page): Promise<void> {
  await page.getByText('I have saved this key somewhere I can get it back').click();
}

export async function createReport(
  page: Page,
  title: string,
  key: string = STRONG_KEY,
): Promise<void> {
  await page.goto('/new-report');
  await expect(page.getByRole('heading', { name: 'New Report' })).toBeVisible();

  // The form opens with a key already generated, which is the path a real
  // user takes. These tests need a key they can decrypt with afterwards, so
  // they take the "type my own" branch — the only one with a confirm field.
  await page.getByRole('button', { name: /Type my own key/i }).click();
  await page.getByPlaceholder('Min. 8 characters').fill(key);
  await page.getByPlaceholder('Re-enter security key').fill(key);

  await page.getByPlaceholder('e.g. External penetration testing report').fill(title);
  await acknowledgeKey(page);

  await page.getByRole('button', { name: /Create report/i }).click();

  await expect(page).toHaveURL(/\/my-reports$/);
  await expect(page.getByRole('link', { name: title })).toBeVisible();
}

// ── Remote API (self-hosted vulnrepo server) ────────────────────────────────
// The API credentials live AES-encrypted in the `vulnrepo-api` IndexedDB store.
// Rather than drive the settings UI to produce one, these helpers write the
// same v2 envelope the crypto worker writes (src/app/crypto.worker.ts:
// "v2" magic | 16B salt | 12B IV | AES-256-GCM ciphertext, base64) so a test
// can start from "this user already connected a server".

export const API_VAULT_PASS = 'Vulnr3p0_E2E!Vault';
export const API_HOST = 'e2e-api.vulnrepo.test';
export const API_NAME = 'E2E LOCAL SERVER';
export const DEAD_API_HOST = 'e2e-down.vulnrepo.test';

export interface ApiEndpointSeed {
  value: string;
  apikey: string;
  viewValue: string;
}

export async function seedApiVault(
  page: Page,
  endpoints: ApiEndpointSeed[] = [{ value: API_HOST, apikey: 'e2e-api-key', viewValue: API_NAME }],
  password: string = API_VAULT_PASS,
): Promise<void> {
  await page.evaluate(async ({ json, pass }) => {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const material = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
      material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
    );
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(json)));

    const combined = new Uint8Array(2 + 16 + 12 + cipher.length);
    combined[0] = 0x76; // 'v'
    combined[1] = 0x32; // '2'
    combined.set(salt, 2);
    combined.set(iv, 18);
    combined.set(cipher, 30);
    let binary = '';
    for (const b of combined) binary += String.fromCharCode(b);
    const blob = btoa(binary);

    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('vulnrepo-api', 1);
      open.onupgradeneeded = () => { open.result.createObjectStore('api'); };
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('api', 'readwrite');
        tx.objectStore('api').put(blob, 'vulnrepo-api-vault');
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    });
  }, { json: JSON.stringify(endpoints), pass: password });
}

/** Stands in for a vulnrepo server: one response body per VULNREPO-ACTION. */
export async function mockVulnrepoApi(
  page: Page,
  responses: Record<string, unknown>,
  host: string = API_HOST,
): Promise<void> {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
  };
  await page.route(`https://${host}/api/`, async route => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const action = route.request().headers()['vulnrepo-action'] ?? '';
    if (!(action in responses)) {
      await route.fulfill({ status: 404, headers: cors, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' },
      body: JSON.stringify(responses[action]),
    });
  });
}

/** Fails every call — stands in for a server that is down or unreachable. */
export async function mockVulnrepoApiDown(page: Page, host: string = API_HOST): Promise<void> {
  await page.route(`https://${host}/api/`, route => route.abort('connectionrefused'));
}

export async function unlockApiVault(page: Page, password: string = API_VAULT_PASS): Promise<void> {
  await page.getByRole('button', { name: /Open vault/i }).first().click();
  const dialog = page.locator('mat-dialog-container');
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('Enter password…').fill(password);
  await dialog.getByRole('button', { name: /Open vault/i }).click();
  await expect(dialog).toHaveCount(0);
}

/** The id of the first report in the local store. */
export async function firstLocalReportId(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const reports: any[] = await new Promise(res => {
      const open = indexedDB.open('vulnrepo-db', 1);
      open.onsuccess = () => {
        const db = open.result;
        const req = db.transaction('reports', 'readonly').objectStore('reports').getAll();
        req.onsuccess = () => { res(req.result); db.close(); };
      };
    });
    return reports[0].report_id;
  });
}

/**
 * Puts a report's security key in the session vault, the state the navbar
 * reads to decide which reports are "open" — and therefore which ones it
 * probes against every configured API when the key vault changes.
 */
export async function holdReportKeyInSession(
  page: Page,
  reportId: string,
  key: string = STRONG_KEY,
): Promise<void> {
  await page.evaluate(({ id, k }) => {
    localStorage.setItem('VULNREPO-KEY-VAULT-MODE', 'session');
    sessionStorage.setItem('VULNREPO-SECKEY-' + id, k);
  }, { id: reportId, k: key });
}
