import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subject, BehaviorSubject } from 'rxjs';

import { HomeComponent } from './home.component';
import { FilesizePipe } from '../filesize.pipe';
import { IndexeddbService } from '../indexeddb.service';
import { KeyVaultService } from '../key-vault.service';

class IndexeddbServiceStub {
  reports: any[] = [];
  history: any[] = [];
  getReports() { return Promise.resolve(this.reports); }
  getHistoryActivity() { return Promise.resolve(this.history); }
  retrieveAPIkey() { return Promise.resolve(null); }
}

class KeyVaultServiceStub {
  change$ = new Subject<string | null>();
  // null = nothing held, so the component's countdown never starts an
  // interval. A test that wants the timer emits a reset point on this.
  idleResetAt$ = new BehaviorSubject<number | null>(null);
  lockNowCalls = 0;
  openReportIds() { return []; }
  has() { return false; }
  hasApiVault() { return false; }
  getApiVault() { return null; }
  lockNow() { this.lockNowCalls++; }
}

const DAY = 86400000;

// Snapshots are written by every save, so a test report needs one per save.
function snap(id: string, daysAgo: number, stats: Partial<Record<string, number>> = {}) {
  return {
    report_id: id,
    report_name: id,
    ts: Date.now() - daysAgo * DAY,
    total: stats['total'] || 0,
    critical: stats['critical'] || 0,
    high: stats['high'] || 0,
    medium: stats['medium'] || 0,
    low: stats['low'] || 0,
    info: stats['info'] || 0
  };
}

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let db: IndexeddbServiceStub;

  beforeEach(waitForAsync(() => {
    db = new IndexeddbServiceStub();

    TestBed.configureTestingModule({
      declarations: [HomeComponent, FilesizePipe],
      imports: [RouterModule.forRoot([])],
      providers: [
        { provide: IndexeddbService, useValue: db },
        { provide: KeyVaultService, useClass: KeyVaultServiceStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts in FIRST_RUN with an empty vault', async () => {
    await fixture.whenStable();
    expect(component.state).toBe('FIRST_RUN');
    expect(component.reportCount).toBe(0);
  });

  it('switches to WORKSPACE and totals findings once reports exist', async () => {
    db.reports = [
      {
        report_id: 'a', report_name: 'Report A', report_createdate: 1,
        report_lastupdate: 10,
        report_stats: { total: 3, critical: 1, high: 1, medium: 1, low: 0, info: 0 }
      },
      {
        report_id: 'b', report_name: 'Report B', report_createdate: 2,
        report_lastupdate: 20,
        report_stats: { total: 2, critical: 0, high: 0, medium: 0, low: 1, info: 1 }
      }
    ];

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.state).toBe('WORKSPACE');
    expect(component.reportCount).toBe(2);
    expect(component.findingCount).toBe(5);
    // most recently updated first
    expect(component.recent[0].report_id).toBe('b');
  });

  describe('activity window', () => {
    async function build() {
      fixture = TestBed.createComponent(HomeComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
      return component;
    }

    function report(id: string, daysAgo: number, total = 0) {
      const ts = Date.now() - daysAgo * DAY;
      return {
        report_id: id, report_name: id, report_createdate: ts, report_lastupdate: ts,
        report_stats: { total, critical: 0, high: 0, medium: 0, low: 0, info: total }
      };
    }

    beforeEach(() => {
      localStorage.removeItem('VULNREPO-home-window');
      localStorage.removeItem('VULNREPO-home-window-from');
      localStorage.removeItem('VULNREPO-home-window-to');
    });

    it('defaults to 30 days when nothing is stored', async () => {
      db.reports = [report('a', 1, 3)];
      const c = await build();

      expect(c.windowPreset).toBe('30');
      expect(c.activity?.days).toBe(30);
      expect(c.activity?.grain).toBe('day');
      expect(c.activity?.buckets.length).toBe(30);
    });

    it('falls back to 30 days for a stored value it does not ship', async () => {
      localStorage.setItem('VULNREPO-home-window', 'banana');
      db.reports = [report('a', 1)];
      const c = await build();

      expect(c.windowPreset).toBe('30');
      expect(c.activity?.days).toBe(30);
    });

    it('restores a stored custom range', async () => {
      const day = (daysAgo: number) => {
        const d = new Date(Date.now() - daysAgo * DAY);
        const p = (n: number) => (n < 10 ? '0' + n : String(n));
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
      };
      localStorage.setItem('VULNREPO-home-window', 'custom');
      localStorage.setItem('VULNREPO-home-window-from', day(10));
      localStorage.setItem('VULNREPO-home-window-to', day(0));
      db.reports = [report('a', 1)];
      const c = await build();

      expect(c.windowPreset).toBe('custom');
      expect(c.activity?.days).toBe(11);
    });

    it('rejects a reversed custom range and keeps the window it had', async () => {
      db.reports = [report('a', 1)];
      const c = await build();

      c.customFrom = '2026-10-03';
      c.customTo = '2026-09-03';
      c.applyCustomWindow();

      expect(c.customError).toContain('after the end date');
      expect(c.windowPreset).toBe('30');
    });

    it('buckets a 90-day window by week', async () => {
      localStorage.setItem('VULNREPO-home-window', '90');
      db.reports = [report('a', 1)];
      const c = await build();

      expect(c.activity?.grain).toBe('week');
      expect(c.activity!.buckets.length).toBeLessThanOrEqual(14);
      expect(c.activity!.buckets.length).toBeGreaterThanOrEqual(12);
    });

    it('separates reports touched inside the window from idle ones', async () => {
      db.reports = [report('a', 2, 4), report('b', 45, 7)];
      const c = await build();

      expect(c.activity?.reportsTouched).toBe(1);
      expect(c.activity?.findingsOnActive).toBe(4);
      expect(c.idleCount).toBe(1);
    });

    it('counts only the increase since the snapshot before the window', async () => {
      localStorage.setItem('VULNREPO-home-window', '7');
      db.reports = [report('a', 1, 6)];
      // Baseline sits outside the window: the report already had 3 findings,
      // so only the one added inside it counts.
      db.history = [
        snap('a', 20, { total: 2, critical: 1, high: 1 }),
        snap('a', 10, { total: 3, critical: 1, high: 2 }),
        snap('a', 3, { total: 4, critical: 1, high: 2, medium: 1 })
      ];
      const c = await build();

      expect(c.activity?.saves).toBe(1);
      expect(c.activity?.added.total).toBe(1);
      expect(c.activity?.added.medium).toBe(1);
      expect(c.activity?.added.high).toBe(0);
    });

    it('does not count a deleted finding as negative work', async () => {
      db.reports = [report('a', 1, 2)];
      db.history = [
        snap('a', 40, { total: 3, high: 3 }),            // baseline, outside the window
        snap('a', 5, { total: 3, high: 3 }),             // re-saved, nothing added
        snap('a', 2, { total: 2, high: 1, medium: 1 })   // two highs deleted, one medium added
      ];
      const c = await build();

      expect(c.activity?.added.medium).toBe(1);
      expect(c.activity?.added.high).toBe(0);
      expect(c.activity?.added.total).toBe(1);
    });

    it('counts the whole first snapshot when a report starts inside the window', async () => {
      db.reports = [report('a', 1, 3)];
      db.history = [snap('a', 4, { total: 3, high: 2, low: 1 })];
      const c = await build();

      expect(c.activity?.added.total).toBe(3);
      expect(c.activity?.added.high).toBe(2);
      expect(c.activity?.added.low).toBe(1);
    });

    it('counts a streak back from today, tolerating a quiet today', async () => {
      db.reports = [report('a', 1, 1)];
      db.history = [snap('a', 1, { total: 1 }), snap('a', 2, { total: 1 }), snap('a', 5, { total: 1 })];
      const c = await build();

      expect(c.activity?.streak).toBe(2);
      expect(c.activity?.daysActive).toBe(3);
    });

    it('keeps the figures but hides the chart when no history was recorded', async () => {
      db.reports = [report('a', 2, 5)];
      db.history = [];
      const c = await build();

      expect(c.activity?.historyAvailable).toBeFalse();
      expect(c.activity?.reportsTouched).toBe(1);
      expect(c.activity?.saves).toBe(0);
    });

    it('re-windows in memory when the period changes', async () => {
      db.reports = [report('a', 1, 2)];
      db.history = [snap('a', 2, { total: 1 }), snap('a', 20, { total: 2 })];
      const c = await build();

      expect(c.activity?.saves).toBe(2);

      c.setWindow('7');

      expect(c.activity?.days).toBe(7);
      expect(c.activity?.saves).toBe(1);
      expect(localStorage.getItem('VULNREPO-home-window')).toBe('7');
    });

    // B6 · the range chip and the caret used to be one button that answered to
    // both aria-pressed and aria-expanded, and selecting 'custom' only toggled
    // the panel. Each now does exactly one thing.
    describe('custom range control', () => {
      const day = (daysAgo: number) => {
        const d = new Date(Date.now() - daysAgo * DAY);
        const p = (n: number) => (n < 10 ? '0' + n : String(n));
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
      };

      it('selects the stored custom window without opening the panel', async () => {
        db.reports = [report('a', 1)];
        const c = await build();
        c.customFrom = day(10);
        c.customTo = day(0);

        c.useCustomWindow();

        expect(c.windowPreset).toBe('custom');
        expect(c.pickerOpen).toBeFalse();
        expect(c.activity?.days).toBe(11);
      });

      it('falls through to the panel when there is no range to select', async () => {
        db.reports = [report('a', 1)];
        const c = await build();
        c.customFrom = '';
        c.customTo = '';

        c.useCustomWindow();

        expect(c.pickerOpen).toBeTrue();
        expect(c.windowPreset).toBe('30');
      });

      it('discloses and dismisses from the caret alone', async () => {
        db.reports = [report('a', 1)];
        const c = await build();

        c.toggleCustomPicker();
        expect(c.pickerOpen).toBeTrue();
        // Disclosing must not change which window is active.
        expect(c.windowPreset).toBe('30');

        c.toggleCustomPicker();
        expect(c.pickerOpen).toBeFalse();
      });

      it('dismisses on escape and on a click outside the control', async () => {
        db.reports = [report('a', 1)];
        const c = await build();

        c.toggleCustomPicker();
        c.closeCustomPicker();
        expect(c.pickerOpen).toBeFalse();

        c.toggleCustomPicker();
        c.onDocumentClick({ target: document.body } as unknown as MouseEvent);
        expect(c.pickerOpen).toBeFalse();
      });

      it('leaves the panel open for a click inside it', async () => {
        db.reports = [report('a', 1)];
        const c = await build();
        c.toggleCustomPicker();

        const inside = document.createElement('div');
        inside.className = 'vr-win-pop';
        const child = document.createElement('input');
        inside.appendChild(child);

        c.onDocumentClick({ target: child } as unknown as MouseEvent);

        expect(c.pickerOpen).toBeTrue();
      });

      it('closes the panel when a preset is chosen', async () => {
        db.reports = [report('a', 1)];
        const c = await build();
        c.toggleCustomPicker();

        c.setWindow('90');

        expect(c.pickerOpen).toBeFalse();
        expect(c.windowPreset).toBe('90');
      });
    });
  });

  // B5 · the figure is whole-origin usage, so the ratio is what carries the
  // warning. A browser that declines to report a quota must not produce one.
  describe('storage pressure', () => {
    it('stays quiet without a quota to compare against', () => {
      component.storageUsedBytes = 214_000_000;
      component.storageQuotaBytes = 0;

      expect(component.storagePercent).toBe(0);
      expect(component.storagePressure).toBe('ok');
    });

    it('grades usage against the quota', () => {
      component.storageQuotaBytes = 1000;

      component.storageUsedBytes = 100;
      expect(component.storagePercent).toBe(10);
      expect(component.storagePressure).toBe('ok');

      component.storageUsedBytes = 820;
      expect(component.storagePercent).toBe(82);
      expect(component.storagePressure).toBe('warn');

      component.storageUsedBytes = 950;
      expect(component.storagePercent).toBe(95);
      expect(component.storagePressure).toBe('critical');
    });

    it('never reports more than a full origin', () => {
      component.storageQuotaBytes = 1000;
      component.storageUsedBytes = 1400;

      expect(component.storagePercent).toBe(100);
    });
  });

  // B4 · the status bar now offers the lock it only used to report.
  describe('lock now', () => {
    it('delegates to the vault rather than wiping keys itself', () => {
      const vault = TestBed.inject(KeyVaultService) as unknown as KeyVaultServiceStub;

      component.lockNow();

      expect(vault.lockNowCalls).toBe(1);
    });

    it('formats the countdown with a padded seconds field', () => {
      expect(component.formatLockTimer(702)).toBe('11:42');
      expect(component.formatLockTimer(65)).toBe('1:05');
      expect(component.formatLockTimer(9)).toBe('0:09');
      expect(component.formatLockTimer(0)).toBe('0:00');
    });
  });
});
