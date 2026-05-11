import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable, BehaviorSubject } from 'rxjs';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const IDLE_EVENTS: ReadonlyArray<keyof WindowEventMap> = [
  'mousemove', 'keydown', 'click', 'touchstart', 'scroll'
];

const VAULT_MODE_KEY = 'VULNREPO-KEY-VAULT-MODE';
const SS_KEY_PREFIX  = 'VULNREPO-SECKEY-';
const SS_VAULT_KEY   = 'VULNREPO-SECKEY-VAULT';

export type KeyVaultMode = 'memory' | 'session';

@Injectable({ providedIn: 'root' })
export class KeyVaultService implements OnDestroy {

  private keys = new Map<string, string>();
  private apiVault: string | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  private changeSubject = new Subject<string | null>();
  public readonly change$: Observable<string | null> = this.changeSubject.asObservable();

  private idleResetAtSubject = new BehaviorSubject<number | null>(null);
  public readonly idleResetAt$: Observable<number | null> = this.idleResetAtSubject.asObservable();

  constructor() {
    if (this.mode === 'session') {
      this.restoreFromSession();
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('pagehide', this.clearAll);
    window.addEventListener('beforeunload', this.clearAll);
    for (const evt of IDLE_EVENTS) {
      window.addEventListener(evt, this.resetIdle, { passive: true } as AddEventListenerOptions);
    }
    this.resetIdle();
  }

  get mode(): KeyVaultMode {
    return (localStorage.getItem(VAULT_MODE_KEY) as KeyVaultMode) || 'memory';
  }

  setMode(newMode: KeyVaultMode): void {
    if (newMode === this.mode) return;
    if (newMode === 'session') {
      // Persist any currently unlocked keys to sessionStorage immediately
      this.keys.forEach((val, key) => sessionStorage.setItem(SS_KEY_PREFIX + key, val));
      if (this.apiVault !== null) sessionStorage.setItem(SS_VAULT_KEY, this.apiVault);
    } else {
      // Switching back to secure memory-only mode: wipe sessionStorage entries and clear memory
      this.wipeSessionStorage();
      this.keys.clear();
      this.apiVault = null;
      this.changeSubject.next(null);
      this.idleResetAtSubject.next(null);
    }
    localStorage.setItem(VAULT_MODE_KEY, newMode);
  }

  set(reportId: string, password: string): void {
    this.keys.set(reportId, password);
    if (this.mode === 'session') sessionStorage.setItem(SS_KEY_PREFIX + reportId, password);
    this.resetIdle();
    this.changeSubject.next(reportId);
  }

  get(reportId: string): string | null {
    const v = this.keys.get(reportId);
    if (v !== undefined) { this.resetIdle(); return v; }
    if (this.mode === 'session') {
      const sv = sessionStorage.getItem(SS_KEY_PREFIX + reportId);
      if (sv !== null) { this.keys.set(reportId, sv); this.resetIdle(); return sv; }
    }
    return null;
  }

  has(reportId: string): boolean {
    if (this.keys.has(reportId)) return true;
    if (this.mode === 'session') return sessionStorage.getItem(SS_KEY_PREFIX + reportId) !== null;
    return false;
  }

  remove(reportId: string): void {
    if (this.keys.delete(reportId)) {
      if (this.mode === 'session') sessionStorage.removeItem(SS_KEY_PREFIX + reportId);
      this.changeSubject.next(reportId);
      if (this.keys.size === 0 && this.apiVault === null) {
        this.idleResetAtSubject.next(null);
      }
    }
  }

  setApiVault(json: string): void {
    this.apiVault = json;
    if (this.mode === 'session') sessionStorage.setItem(SS_VAULT_KEY, json);
    this.resetIdle();
    this.changeSubject.next('VULNREPO-API');
  }

  getApiVault(): string | null {
    if (this.apiVault !== null) { this.resetIdle(); return this.apiVault; }
    if (this.mode === 'session') {
      const sv = sessionStorage.getItem(SS_VAULT_KEY);
      if (sv !== null) { this.apiVault = sv; this.resetIdle(); return sv; }
    }
    return null;
  }

  removeApiVault(): void {
    if (this.apiVault !== null) {
      this.apiVault = null;
      if (this.mode === 'session') sessionStorage.removeItem(SS_VAULT_KEY);
      this.changeSubject.next('VULNREPO-API');
      if (this.keys.size === 0) {
        this.idleResetAtSubject.next(null);
      }
    }
  }

  openReportIds(): string[] {
    return Array.from(this.keys.keys());
  }

  private restoreFromSession(): void {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      if (k.startsWith(SS_KEY_PREFIX)) {
        const rid = k.slice(SS_KEY_PREFIX.length);
        const val = sessionStorage.getItem(k);
        if (val !== null) this.keys.set(rid, val);
      }
    }
    const av = sessionStorage.getItem(SS_VAULT_KEY);
    if (av !== null) this.apiVault = av;
  }

  private wipeSessionStorage(): void {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(SS_KEY_PREFIX)) toRemove.push(k);
    }
    toRemove.forEach(k => sessionStorage.removeItem(k));
    sessionStorage.removeItem(SS_VAULT_KEY);
  }

  private clearAll = (): void => {
    if (this.mode === 'session') {
      // In session mode flush only the in-memory cache; sessionStorage persists for the tab lifetime
      this.keys.clear();
      this.apiVault = null;
      return;
    }
    if (this.keys.size === 0 && this.apiVault === null) return;
    this.keys.clear();
    this.apiVault = null;
    this.changeSubject.next(null);
    this.idleResetAtSubject.next(null);
  };

  private onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') this.clearAll();
  };

  private resetIdle = (): void => {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(this.clearAll, IDLE_TIMEOUT_MS);
    if (this.keys.size > 0 || this.apiVault !== null) {
      const newAt = Date.now() + IDLE_TIMEOUT_MS;
      const prev = this.idleResetAtSubject.value;
      // Throttle: only re-emit if the reset point shifted by more than 5s
      // (avoids spamming switchMap on every mousemove event)
      if (prev === null || newAt - prev > 5000) {
        this.idleResetAtSubject.next(newAt);
      }
    }
  };

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('pagehide', this.clearAll);
    window.removeEventListener('beforeunload', this.clearAll);
    for (const evt of IDLE_EVENTS) {
      window.removeEventListener(evt, this.resetIdle);
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    this.clearAll();
  }
}
