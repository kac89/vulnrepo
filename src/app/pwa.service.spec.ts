import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { SwUpdate, VersionEvent } from '@angular/service-worker';

import { PwaService } from './pwa.service';

// A stand-in for SwUpdate: the real one needs a registered service worker,
// which Karma cannot provide.
class FakeSwUpdate {
  isEnabled = true;
  versionUpdates = new Subject<VersionEvent>();
  unrecoverable = new Subject<{ type: 'UNRECOVERABLE_STATE', reason: string }>();
  activated = 0;
  checks = 0;

  async checkForUpdate(): Promise<boolean> { this.checks++; return false; }
  async activateUpdate(): Promise<boolean> { this.activated++; return true; }
}

describe('PwaService', () => {

  function build(sw: FakeSwUpdate | null): PwaService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [PwaService, { provide: SwUpdate, useValue: sw }]
    });
    return TestBed.inject(PwaService);
  }

  // SwUpdate is provided by ServiceWorkerModule.register(), not the root
  // injector, so any spec that declares a consumer component without that
  // module gets null here. The service has to stay constructible.
  it('constructs with no SwUpdate and reports no offline support', async () => {
    const pwa = build(null);
    expect(pwa.offlineReady$.value).toBeFalse();
    expect(pwa.updateReady$.value).toBeFalse();
    await expectAsync(pwa.checkForUpdate()).toBeResolvedTo(false);
  });

  it('does nothing when the service worker is disabled', async () => {
    const sw = new FakeSwUpdate();
    sw.isEnabled = false;
    const pwa = build(sw);

    await pwa.checkForUpdate();
    await pwa.applyUpdate();

    expect(sw.checks).toBe(0);
    // crucially no activateUpdate(): that reloads the page
    expect(sw.activated).toBe(0);
  });

  it('flags an update only on VERSION_READY, never on download progress', () => {
    const sw = new FakeSwUpdate();
    const pwa = build(sw);

    sw.versionUpdates.next({
      type: 'VERSION_DETECTED',
      version: { hash: 'abcdef1234567890' }
    } as VersionEvent);
    expect(pwa.updateReady$.value).toBeFalse();

    sw.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: '0000000' },
      latestVersion: { hash: 'abcdef1234567890' }
    } as VersionEvent);

    expect(pwa.updateReady$.value).toBeTrue();
    // 7 chars, the same short-hash convention the About dialog uses
    expect(pwa.updateHash).toBe('abcdef1');
  });

  // A new build is announced, not applied. activateUpdate() swaps the bundle and
  // reloads, which would discard unsaved report edits, so nothing may call it
  // off the back of the event itself.
  it('does not activate an update when one becomes ready', () => {
    const sw = new FakeSwUpdate();
    build(sw);

    sw.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: '0000000' },
      latestVersion: { hash: 'abcdef1234567890' }
    } as VersionEvent);

    expect(sw.activated).toBe(0);
  });

  it('drops offline-ready when the cache becomes unrecoverable', () => {
    const sw = new FakeSwUpdate();
    const pwa = build(sw);
    pwa.offlineReady$.next(true);

    sw.unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'cache gone' });

    expect(pwa.offlineReady$.value).toBeFalse();
  });

  it('swallows a failed update check instead of rejecting', async () => {
    const sw = new FakeSwUpdate();
    sw.checkForUpdate = () => Promise.reject(new Error('offline'));
    const pwa = build(sw);

    await expectAsync(pwa.checkForUpdate()).toBeResolvedTo(false);
  });

  it('reports not-installable until beforeinstallprompt fires', async () => {
    const sw = new FakeSwUpdate();
    const pwa = build(sw);

    expect(pwa.installable$.value).toBeFalse();
    await expectAsync(pwa.promptInstall()).toBeResolvedTo(false);

    const ev: any = new Event('beforeinstallprompt');
    ev.prompt = () => { };
    ev.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(ev);

    expect(pwa.installable$.value).toBeTrue();
    await expectAsync(pwa.promptInstall()).toBeResolvedTo(true);
    // the event fires once, so the offer must not survive being used
    expect(pwa.installable$.value).toBeFalse();
  });

});
