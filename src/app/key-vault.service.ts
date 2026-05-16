import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable, BehaviorSubject } from 'rxjs';

const DEFAULT_IDLE_MINUTES = 15;
const WARNING_BEFORE_LOCK_MS = 30 * 1000;
const IDLE_EVENTS: ReadonlyArray<keyof WindowEventMap> = [
  'mousemove', 'keydown', 'click', 'touchstart', 'scroll'
];

const VAULT_MODE_KEY     = 'VULNREPO-KEY-VAULT-MODE';
const LOCK_ON_HIDDEN_KEY = 'VULNREPO-LOCK-ON-HIDDEN';
const IDLE_MINUTES_KEY   = 'VULNREPO-IDLE-MINUTES';
const SS_KEY_PREFIX      = 'VULNREPO-SECKEY-';
const SS_VAULT_KEY       = 'VULNREPO-SECKEY-VAULT';

export type KeyVaultMode = 'memory' | 'session';

@Injectable({ providedIn: 'root' })
export class KeyVaultService implements OnDestroy {

  private keys = new Map<string, string>();
  private apiVault: string | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private warningActive = false;

  private changeSubject = new Subject<string | null>();
  public readonly change$: Observable<string | null> = this.changeSubject.asObservable();

  private idleResetAtSubject = new BehaviorSubject<number | null>(null);
  public readonly idleResetAt$: Observable<number | null> = this.idleResetAtSubject.asObservable();

  private warningSubject = new Subject<boolean>();
  public readonly warning$: Observable<boolean> = this.warningSubject.asObservable();

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
      this.cancelTimers();
      this.idleResetAtSubject.next(null);
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

  // ── Auto-lock trigger settings (memory mode only) ──────────────────────────
  // lockOnHidden: clear the vault when the tab loses visibility.
  // idleMinutes:  minutes of inactivity before clearing the vault (0 = never).

  get lockOnHidden(): boolean {
    return localStorage.getItem(LOCK_ON_HIDDEN_KEY) !== 'false';
  }

  setLockOnHidden(enabled: boolean): void {
    localStorage.setItem(LOCK_ON_HIDDEN_KEY, enabled ? 'true' : 'false');
  }

  get idleMinutes(): number {
    const raw = localStorage.getItem(IDLE_MINUTES_KEY);
    if (raw === null) return DEFAULT_IDLE_MINUTES;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_IDLE_MINUTES;
  }

  setIdleMinutes(minutes: number): void {
    const safe = Number.isFinite(minutes) && minutes >= 0 ? Math.floor(minutes) : DEFAULT_IDLE_MINUTES;
    localStorage.setItem(IDLE_MINUTES_KEY, String(safe));
    // Reschedule with the new timeout if a session is currently active
    if (this.mode === 'memory' && (this.keys.size > 0 || this.apiVault !== null)) {
      this.resetIdle();
    }
  }

  // Public alias for resetIdle so UI ("Stay unlocked") can extend the session.
  extendSession(): void {
    this.resetIdle();
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
    this.cancelTimers();
    this.dismissWarning();
    if (this.keys.size === 0 && this.apiVault === null) return;
    this.keys.clear();
    this.apiVault = null;
    this.changeSubject.next(null);
    this.idleResetAtSubject.next(null);
  };

  private onVisibilityChange = (): void => {
    if (document.visibilityState !== 'hidden') return;
    if (this.mode !== 'memory') return;
    if (!this.lockOnHidden) return;
    this.clearAll();
  };

  private resetIdle = (): void => {
    if (this.mode === 'session') return;

    this.cancelTimers();
    this.dismissWarning();

    const minutes = this.idleMinutes;
    if (minutes <= 0) {
      // Idle lock disabled
      this.idleResetAtSubject.next(null);
      return;
    }

    const idleMs = minutes * 60 * 1000;
    this.idleTimer = setTimeout(this.clearAll, idleMs);

    // Pre-lock warning: schedule only if there's enough headroom to show it.
    if (idleMs > WARNING_BEFORE_LOCK_MS * 2) {
      this.warningTimer = setTimeout(() => {
        this.warningActive = true;
        this.warningSubject.next(true);
      }, idleMs - WARNING_BEFORE_LOCK_MS);
    }

    if (this.keys.size > 0 || this.apiVault !== null) {
      const newAt = Date.now() + idleMs;
      const prev = this.idleResetAtSubject.value;
      // Throttle: only re-emit if the reset point shifted by more than 5s
      // (avoids spamming switchMap on every mousemove event)
      if (prev === null || newAt - prev > 5000) {
        this.idleResetAtSubject.next(newAt);
      }
    }
  };

  private cancelTimers(): void {
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
    if (this.warningTimer) { clearTimeout(this.warningTimer); this.warningTimer = null; }
  }

  private dismissWarning(): void {
    if (this.warningActive) {
      this.warningActive = false;
      this.warningSubject.next(false);
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('pagehide', this.clearAll);
    window.removeEventListener('beforeunload', this.clearAll);
    for (const evt of IDLE_EVENTS) {
      window.removeEventListener(evt, this.resetIdle);
    }
    this.cancelTimers();
    this.clearAll();
  }
}
