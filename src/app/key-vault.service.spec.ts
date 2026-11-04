import { TestBed } from '@angular/core/testing';

import { KeyVaultService } from './key-vault.service';

const VAULT_MODE_KEY = 'VULNREPO-KEY-VAULT-MODE';
const SS_KEY_PREFIX  = 'VULNREPO-SECKEY-';
const SS_VAULT_KEY   = 'VULNREPO-API-VAULT';

// Covers lockNow() only — the explicit "Lock now" path added for the home
// status bar. It is deliberately not clearAll(), and the difference only shows
// in session mode, so that is what these assert.
describe('KeyVaultService · lockNow', () => {

  function build(mode: 'memory' | 'session'): KeyVaultService {
    localStorage.setItem(VAULT_MODE_KEY, mode);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [KeyVaultService] });
    return TestBed.inject(KeyVaultService);
  }

  afterEach(() => {
    localStorage.removeItem(VAULT_MODE_KEY);
    sessionStorage.clear();
  });

  it('forgets every report key and the API vault in memory mode', () => {
    const vault = build('memory');
    vault.set('r1', 'pass-one');
    vault.set('r2', 'pass-two');
    vault.setApiVault('[{"value":"https://example.test"}]');

    vault.lockNow();

    expect(vault.openReportIds()).toEqual([]);
    expect(vault.has('r1')).toBeFalse();
    expect(vault.get('r2')).toBeNull();
    expect(vault.hasApiVault()).toBeFalse();
    expect(vault.getApiVault()).toBeNull();
  });

  // The reason this method exists. clearAll() flushes only the in-memory cache
  // in session mode and leaves sessionStorage readable for the tab lifetime —
  // right for an idle timeout, wrong for a button labelled "Lock now", where
  // the next get() would silently restore the key.
  it('wipes sessionStorage too, so a session-mode key cannot come back', () => {
    const vault = build('session');
    vault.set('r1', 'pass-one');
    vault.setApiVault('[{"value":"https://example.test"}]');

    expect(sessionStorage.getItem(SS_KEY_PREFIX + 'r1')).toBe('pass-one');

    vault.lockNow();

    expect(sessionStorage.getItem(SS_KEY_PREFIX + 'r1')).toBeNull();
    expect(sessionStorage.getItem(SS_VAULT_KEY)).toBeNull();
    expect(vault.has('r1')).toBeFalse();
    expect(vault.get('r1')).toBeNull();
    expect(vault.hasApiVault()).toBeFalse();
  });

  it('announces the lock so open pages can drop what the keys produced', () => {
    const vault = build('memory');
    vault.set('r1', 'pass-one');

    const seen: (string | null)[] = [];
    const sub = vault.change$.subscribe(v => seen.push(v));
    vault.lockNow();
    sub.unsubscribe();

    expect(seen).toEqual([null]);
  });

  it('stops the idle countdown, since there is nothing left to lock', () => {
    const vault = build('memory');
    vault.set('r1', 'pass-one');

    let resetAt: number | null = -1;
    const sub = vault.idleResetAt$.subscribe(v => { resetAt = v; });
    vault.lockNow();
    sub.unsubscribe();

    expect(resetAt).toBeNull();
  });

  it('runs pre-lock handlers while the keys are still readable', () => {
    const vault = build('memory');
    vault.set('r1', 'pass-one');

    let seenDuringHandler: string | null = 'not-run';
    const off = vault.onBeforeLock(() => { seenDuringHandler = vault.get('r1'); });

    vault.lockNow();
    off();

    expect(seenDuringHandler).toBe('pass-one');
    expect(vault.get('r1')).toBeNull();
  });

  // A handler that throws must not be able to keep the vault unlocked.
  it('locks even when a pre-lock handler throws', () => {
    const vault = build('memory');
    vault.set('r1', 'pass-one');
    const off = vault.onBeforeLock(() => { throw new Error('stash failed'); });

    expect(() => vault.lockNow()).not.toThrow();
    off();

    expect(vault.has('r1')).toBeFalse();
  });

  it('is a no-op when nothing is held', () => {
    const vault = build('memory');

    const seen: (string | null)[] = [];
    const sub = vault.change$.subscribe(v => seen.push(v));
    vault.lockNow();
    sub.unsubscribe();

    expect(seen).toEqual([]);
  });
});
