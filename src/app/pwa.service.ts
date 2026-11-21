import { Injectable, OnDestroy, Optional } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { BehaviorSubject, Observable, Subscription, fromEvent, merge } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

/**
 * Offline / install state for the app shell.
 *
 * VULNRΞPO already works without a network — reports live in IndexedDB and all
 * crypto is browser-native — but until the shell was precached the app still
 * needed connectivity to *load*, which is exactly what an air-gapped lab or a
 * client jumpbox with no egress does not have. The service worker closes that
 * gap and pins the bundle to a known build.
 *
 * Two deliberate non-goals:
 *
 * - **No report data is cached here.** `ngsw-config.json` declares only
 *   `assetGroups` (app shell + static assets) and no `dataGroups`, so API
 *   responses, NVD CVE lookups and Ollama traffic are never written to
 *   CacheStorage. Report ciphertext stays in IndexedDB where it always was.
 * - **Updates never apply themselves.** An unattended `activateUpdate()` +
 *   reload would discard unsaved edits in an open report. A new version is only
 *   ever announced; `applyUpdate()` is called from an explicit user action.
 */
@Injectable({ providedIn: 'root' })
export class PwaService implements OnDestroy {

  /** true once a service worker controls this page, i.e. the shell is cached and the app can boot offline */
  readonly offlineReady$ = new BehaviorSubject<boolean>(false);

  /** true when a newer build has been downloaded and is waiting for an explicit reload */
  readonly updateReady$ = new BehaviorSubject<boolean>(false);

  /** true when the browser has offered an install prompt we have captured */
  readonly installable$ = new BehaviorSubject<boolean>(false);

  /** true when the app is running as an installed PWA rather than in a browser tab */
  readonly installed$ = new BehaviorSubject<boolean>(false);

  /** live network reachability, for the toolbar indicator */
  readonly online$: Observable<boolean>;

  /** hash of the build that is waiting, when the SW reports one */
  updateHash = '';

  private installEvent: any = null;
  private subs = new Subscription();

  /**
   * `SwUpdate` comes from `ServiceWorkerModule.register()`, not from the root
   * injector, so it is absent in TestBed specs that declare a component without
   * that module. Optional injection keeps every consumer constructible there;
   * the service then simply reports "no offline support", which is also the
   * honest answer on an unsupported browser.
   */
  constructor(@Optional() private swUpdate: SwUpdate | null) {

    this.online$ = merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).pipe(startWith(navigator.onLine !== false));

    this.installed$.next(this.isStandalone());

    // beforeinstallprompt is Chromium-only and fires once; stash it so the
    // "Install app" menu item can replay it later on a real user gesture.
    this.subs.add(fromEvent<Event>(window, 'beforeinstallprompt').subscribe(ev => {
      ev.preventDefault();
      this.installEvent = ev;
      this.installable$.next(true);
    }));

    this.subs.add(fromEvent(window, 'appinstalled').subscribe(() => {
      this.installEvent = null;
      this.installable$.next(false);
      this.installed$.next(true);
    }));

    if (!this.swUpdate?.isEnabled) {
      // Dev server, an unsupported browser, or a non-secure origin. Everything
      // else in the app still works; only offline boot is unavailable.
      return;
    }

    this.offlineReady$.next(!!navigator.serviceWorker?.controller);
    if (navigator.serviceWorker) {
      this.subs.add(
        fromEvent(navigator.serviceWorker, 'controllerchange').subscribe(() => {
          this.offlineReady$.next(!!navigator.serviceWorker.controller);
        })
      );
    }

    this.subs.add(
      this.swUpdate.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe(e => {
          this.updateHash = (e.latestVersion?.hash || '').substring(0, 7);
          this.updateReady$.next(true);
        })
    );

    // A corrupt or evicted cache cannot be recovered in place; the only fix is a
    // clean fetch of the shell. Surfaced rather than silently retried so the
    // user is never left staring at a half-broken app.
    this.subs.add(this.swUpdate.unrecoverable.subscribe(() => {
      this.offlineReady$.next(false);
    }));
  }

  /** Ask the browser to check for a newer build now. Resolves false when unsupported or offline. */
  async checkForUpdate(): Promise<boolean> {
    if (!this.swUpdate?.isEnabled) return false;
    try {
      return await this.swUpdate.checkForUpdate();
    } catch {
      return false;
    }
  }

  /**
   * Activate the waiting build and reload. Callers are responsible for making
   * sure there is nothing unsaved first — see AppComponent.applyAppUpdate().
   */
  async applyUpdate(): Promise<void> {
    if (!this.swUpdate?.isEnabled) return;
    try {
      await this.swUpdate.activateUpdate();
    } finally {
      window.location.reload();
    }
  }

  /** Replay the captured install prompt. Returns true when the user accepted. */
  async promptInstall(): Promise<boolean> {
    if (!this.installEvent) return false;
    const ev = this.installEvent;
    this.installEvent = null;
    this.installable$.next(false);
    try {
      ev.prompt();
      const choice = await ev.userChoice;
      return choice?.outcome === 'accepted';
    } catch {
      return false;
    }
  }

  private isStandalone(): boolean {
    const mq = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    // iOS Safari predates display-mode and exposes navigator.standalone instead
    const iosStandalone = (window.navigator as any).standalone === true;
    return !!mq || iosStandalone;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
