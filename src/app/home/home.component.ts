import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { version } from "../../version";
import { IndexeddbService, HistoryActivityEntry } from '../indexeddb.service';
import { KeyVaultService } from '../key-vault.service';
import { ApiService } from '../api.service';
import { DialogApikeyComponent } from '../dialog-apikey/dialog-apikey.component';

export interface HomeReportStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface HomeRecentReport {
  report_id: string;
  report_name: string;
  report_createdate: number;
  report_lastupdate?: number;
  report_stats?: HomeReportStats;
  // Set only on rows that came back from a vulnrepo server. Mirrors the shape
  // /my-reports uses so a row means the same thing on both pages.
  api?: string;
  apiurl?: string;
  apiname?: string;
}

interface ApiEndpoint {
  value: string;
  apikey: string;
  viewValue: string;
}

export interface ApiFailure {
  name: string;
  reason: string;
}

export type HomeState = 'FIRST_RUN' | 'WORKSPACE';

export type HomeWindowPreset = '7' | '30' | '90' | '365' | 'custom';

// One column of the activity chart. `fill` is the sequential step (one hue,
// more saves = more opaque) so the bar's colour never carries a second meaning.
export interface HomeActivityBucket {
  start: number;
  label: string;
  saves: number;
  added: number;
  height: number;
  fill: number;
  today: boolean;
}

export interface HomeActivity {
  from: number;
  to: number;
  days: number;
  grain: 'day' | 'week' | 'month';
  reportsTouched: number;
  newReports: number;
  findingsOnActive: number;
  saves: number;
  daysActive: number;
  streak: number;
  added: HomeReportStats;
  buckets: HomeActivityBucket[];
  peakSaves: number;
  // False when the history store is empty or unreadable. A flat strip of zeros
  // would read as "you did nothing" when the truth is "nothing was recorded".
  historyAvailable: boolean;
}

const DAY_MS = 86400000;
const WINDOW_KEY = 'VULNREPO-home-window';
const WINDOW_FROM_KEY = 'VULNREPO-home-window-from';
const WINDOW_TO_KEY = 'VULNREPO-home-window-to';
// 24 months. Past this the chart stops being readable and the history store is
// almost certainly incomplete anyway (see purgeOldHistorySnapshots).
const MAX_WINDOW_DAYS = 731;
// Deliberately NOT the chart window: on a 7-day window almost every report
// would count as idle, which is noise, not a nudge.
const IDLE_DAYS = 30;

@Component({
  standalone: false,
  //imports: [],
  selector: 'app-home',
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  app_ver = '';
  app_ver_short = '';

  // True only for CI-stamped builds: .github/workflows/vulnrepo.yml writes
  // version.number = GITHUB_SHA at build time, so an empty version means this
  // is a local/self-hosted build. Used to decide whether to offer the hosted
  // instance — there is no point linking vulnrepo.com from vulnrepo.com.
  isHostedBuild = false;

  state: HomeState = 'FIRST_RUN';
  loading = true;

  reportCount = 0;
  localCount = 0;
  findingCount = 0;
  storageUsedBytes = 0;
  recent: HomeRecentReport[] = [];

  vaultUnlocked = false;
  unlockedCount = 0;

  // ── Remote (self-hosted vulnrepo server) ──────────────────────────────────
  apiVaultStored = false;   // an encrypted API vault exists in IndexedDB
  apiVaultOpen = false;     // ...and it has been unlocked for this session
  apiLoading = false;
  apiEndpointCount = 0;
  apiFailed: ApiFailure[] = [];
  remoteCount = 0;

  // ── Activity (last N days) ────────────────────────────────────────────────
  readonly windowPresets: { value: HomeWindowPreset; label: string; aria: string }[] = [
    { value: '7', label: '7d', aria: 'Last 7 days' },
    { value: '30', label: '30d', aria: 'Last 30 days' },
    { value: '90', label: '90d', aria: 'Last 90 days' },
    { value: '365', label: '1y', aria: 'Last 12 months' }
  ];
  readonly defaultWindowDays = 30;
  readonly maxWindowDays = MAX_WINDOW_DAYS;
  readonly idleDays = IDLE_DAYS;

  windowPreset: HomeWindowPreset = '30';
  customFrom = '';
  customTo = '';
  pickerOpen = false;
  customError = '';

  activity: HomeActivity | null = null;
  activityLoading = true;
  idleCount = 0;

  readonly sevOrder: (keyof HomeReportStats)[] = ['critical', 'high', 'medium', 'low', 'info'];
  readonly pbkdf2Iterations = 600000;

  private history: HistoryActivityEntry[] = [];
  private allRows: HomeRecentReport[] = [];
  private localReports: HomeRecentReport[] = [];
  private remoteReports: HomeRecentReport[] = [];
  private encryptedApiVault: string | null = null;
  private vaultSub: Subscription | undefined;

  constructor(private indexeddbService: IndexeddbService, private keyVault: KeyVaultService,
              private apiService: ApiService, public dialog: MatDialog) { }

  ngOnInit() {
    this.app_ver = version.number;

    if (this.app_ver !== '') {
      this.app_ver_short = this.app_ver.substring(0, 7);
      this.isHostedBuild = true;
    } else {
      this.app_ver_short = 'local';
      this.isHostedBuild = false;
    }

    this.refreshVaultState();
    this.vaultSub = this.keyVault.change$.subscribe(() => this.onVaultChange());

    this.loadWindowPref();
    this.loadVault();
    this.loadHistory();
    this.loadApiVault();
    if (this.apiVaultOpen) this.loadRemoteReports();
    this.loadStorage();
  }

  ngOnDestroy() {
    this.vaultSub?.unsubscribe();
  }

  // ── Vault ────────────────────────────────────────────────────────────────
  // One cheap read of the reports store decides which layout renders. Severity
  // counts live unencrypted in report_stats (see prepareupdatereport), so the
  // recent list needs no key and no decryption.
  private loadVault() {
    this.indexeddbService.getReports().then((data: HomeRecentReport[]) => {
      this.localReports = data || [];
      this.loading = false;
      this.merge();
    }).catch(() => {
      this.localReports = [];
      this.loading = false;
      this.merge();
    });
  }

  // ── Remote reports ───────────────────────────────────────────────────────
  // Reports kept on a self-hosted vulnrepo server are listed by the same
  // getreportslist call /my-reports uses, but the credentials for it sit in an
  // AES-encrypted vault in IndexedDB. Until that vault is unlocked this session
  // the server is unreachable — so the page offers the unlock rather than
  // quietly showing half of the user's work (or, with no local reports at all,
  // the first-run pitch to someone who already has twenty reports).
  // Only answers "is there a vault to unlock?" — listing is driven by whether
  // it is currently open, which is independent of this read.
  private loadApiVault() {
    this.indexeddbService.retrieveAPIkey().then(enc => {
      this.encryptedApiVault = enc || null;
      this.apiVaultStored = !!enc;
    }).catch(() => {
      this.encryptedApiVault = null;
      this.apiVaultStored = false;
    });
  }

  private loadRemoteReports() {
    const vault = this.keyVault.getApiVault();
    if (!vault) return;

    let endpoints: ApiEndpoint[];
    try {
      endpoints = JSON.parse(vault);
    } catch {
      return;
    }
    if (!Array.isArray(endpoints) || endpoints.length === 0) return;

    // An endpoint can be listed twice (dialog-apiadd appends without checking),
    // and firing the identical request twice only doubles the chance of one of
    // them reporting a failure for data that already loaded.
    const seen = new Set<string>();
    endpoints = endpoints.filter(ep => {
      if (!ep || !ep.value) return false;
      const id = JSON.stringify([ep.value, ep.apikey]);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (endpoints.length === 0) return;

    this.apiEndpointCount = endpoints.length;
    this.apiFailed = [];
    this.remoteReports = [];
    this.apiLoading = true;

    // Endpoints are independent: one unreachable server must not hide the
    // reports held by the others, so each settles on its own and the list is
    // re-merged as answers arrive.
    let pending = endpoints.length;
    const settle = () => {
      pending = pending - 1;
      if (pending === 0) this.apiLoading = false;
      this.merge();
    };

    endpoints.forEach(ep => {
      // silent: a failure here belongs in this page's own strip, next to the
      // endpoint that produced it — not in the global snackbar, which would
      // announce "can't connect" over a list of reports that just loaded.
      // Anything that is not an array counts as "this endpoint did not answer".
      this.apiService.APISend(ep.value, ep.apikey, 'getreportslist', '', true).then(resp => {
        if (Array.isArray(resp)) {
          this.remoteReports.push(...resp.map((r: HomeRecentReport) => ({
            ...r,
            api: 'remote',
            apiurl: ep.value,
            apiname: ep.viewValue
          })));
        } else {
          this.failEndpoint(ep, resp?.message);
        }
      }).catch(() => {
        this.failEndpoint(ep);
      }).then(settle, settle);
    });
  }

  private failEndpoint(ep: ApiEndpoint, reason?: string) {
    this.apiFailed.push({
      name: ep.viewValue || ep.value,
      reason: reason || 'unexpected response'
    });
  }

  // One list out of two sources, counted the way /my-reports lists them: a
  // copy on disk and a copy on a server are two reports, not one. They can
  // share a report_id (an update keeps it), so nothing is collapsed on id —
  // doing so dropped the server's copy and left the totals reading local-only.
  // rowKey(), not report_id, is what keeps the @for track unique.
  private merge() {
    const all = [...this.localReports, ...this.remoteReports].filter(r => r && r.report_id);

    this.allRows = all;
    this.reportCount = all.length;
    this.localCount = all.filter(r => r.api !== 'remote').length;
    this.remoteCount = all.filter(r => r.api === 'remote').length;
    this.findingCount = all.reduce((sum, r) => sum + (r.report_stats?.total || 0), 0);
    this.recent = all
      .sort((a, b) => this.sortKey(b) - this.sortKey(a))
      .slice(0, 5);
    this.state = this.reportCount > 0 ? 'WORKSPACE' : 'FIRST_RUN';

    // Runs here as well as after the history read, so the tiles stay correct
    // as remote endpoints settle one by one.
    this.recomputeActivity();
  }

  // Identity of a row, not of a report: the same report_id stored locally and
  // on two servers is three distinct rows.
  rowKey(r: HomeRecentReport): string {
    return (r.api === 'remote' ? r.apiurl || 'remote' : 'local') + '|' + r.report_id;
  }

  // Unlocks the API vault from the home page. Same dialog /my-reports uses, so
  // one unlock serves both pages for the rest of the session.
  openApiVault() {
    if (!this.encryptedApiVault) return;

    const dialogRef = this.dialog.open(DialogApikeyComponent, {
      width: '400px',
      disableClose: true,
      data: this.encryptedApiVault
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // setApiVault fires change$, and onVaultChange starts the fetch.
        this.keyVault.setApiVault(result);
      }
    });
  }

  retryApi() {
    this.loadRemoteReports();
  }

  private sortKey(r: HomeRecentReport): number {
    return r.report_lastupdate || r.report_createdate || 0;
  }

  private async loadStorage() {
    try {
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        this.storageUsedBytes = est.usage ?? 0;
      }
    } catch { /* silent — storage estimate is a nicety, not a requirement */ }
  }

  // Two different secrets, two different indicators. The first status item is
  // about report keys — how many reports can be decrypted right now — and the
  // API item next to it is about server credentials. Folding the API vault into
  // vaultUnlocked made opening it read as "a report is open".
  private refreshVaultState() {
    this.unlockedCount = this.keyVault.openReportIds().length;
    this.apiVaultOpen = this.keyVault.hasApiVault();
    this.vaultUnlocked = this.unlockedCount > 0;
  }

  // The vault can change from elsewhere: another page unlocking it, or the
  // idle/visibility auto-lock wiping it. Remote rows are only valid while the
  // credentials that produced them are held, so they are dropped on lock.
  private onVaultChange() {
    const wasOpen = this.apiVaultOpen;
    this.refreshVaultState();

    if (this.apiVaultOpen && !wasOpen) {
      this.loadRemoteReports();
    } else if (!this.apiVaultOpen && wasOpen) {
      this.remoteReports = [];
      this.apiFailed = [];
      this.apiEndpointCount = 0;
      this.apiLoading = false;
      this.merge();
    }
  }

  isUnlocked(reportId: string): boolean {
    return this.keyVault.has(reportId);
  }

  sevCount(r: HomeRecentReport, sev: keyof HomeReportStats): number {
    return r.report_stats ? r.report_stats[sev] : 0;
  }

  isRemote(r: HomeRecentReport): boolean {
    return r.api === 'remote';
  }

  // getreportslist is not required to return report_stats (see
  // API-INTEGRATION.md), so a remote row without stats means "unknown", not
  // "no findings" — the two must not render the same.
  hasStats(r: HomeRecentReport): boolean {
    return !!r.report_stats;
  }

  // ── Activity: the window ─────────────────────────────────────────────────
  // The chosen period is a view preference, so it lives in localStorage beside
  // /my-reports' view mode and sort keys. Nothing here leaves the browser, and
  // a missing or hand-edited value falls back to 30 days rather than rendering
  // an empty panel.
  private loadWindowPref() {
    try {
      const raw = localStorage.getItem(WINDOW_KEY);
      const from = localStorage.getItem(WINDOW_FROM_KEY) || '';
      const to = localStorage.getItem(WINDOW_TO_KEY) || '';
      if (raw === 'custom' && this.parseDay(from) !== null && this.parseDay(to) !== null) {
        this.windowPreset = 'custom';
        this.customFrom = from;
        this.customTo = to;
      } else if (raw === '7' || raw === '30' || raw === '90' || raw === '365') {
        this.windowPreset = raw;
      }
    } catch { /* private mode / storage blocked — the 30-day default stands */ }

    if (!this.customFrom || !this.customTo) {
      const seed = this.presetRange(this.defaultWindowDays);
      this.customFrom = this.dayInput(seed.from);
      this.customTo = this.dayInput(seed.to);
    }
  }

  private persistWindow() {
    try {
      localStorage.setItem(WINDOW_KEY, this.windowPreset);
      if (this.windowPreset === 'custom') {
        localStorage.setItem(WINDOW_FROM_KEY, this.customFrom);
        localStorage.setItem(WINDOW_TO_KEY, this.customTo);
      }
    } catch { /* silent — the window still applies for this session */ }
  }

  setWindow(preset: HomeWindowPreset) {
    if (preset === 'custom') {
      this.pickerOpen = !this.pickerOpen;
      return;
    }
    this.windowPreset = preset;
    this.pickerOpen = false;
    this.customError = '';
    this.persistWindow();
    this.recomputeActivity();
  }

  applyCustomWindow() {
    const from = this.parseDay(this.customFrom);
    const to = this.parseDay(this.customTo);

    if (from === null || to === null) {
      this.customError = 'Pick a start and an end date.';
      return;
    }
    if (from > this.endOfDay(to)) {
      this.customError = 'The start date is after the end date.';
      return;
    }
    if ((this.endOfDay(to) - from) / DAY_MS > MAX_WINDOW_DAYS) {
      this.customError = 'Choose a window of 24 months or less.';
      return;
    }

    this.customError = '';
    this.windowPreset = 'custom';
    this.pickerOpen = false;
    this.persistWindow();
    this.recomputeActivity();
  }

  resetWindow() {
    const seed = this.presetRange(this.defaultWindowDays);
    this.customFrom = this.dayInput(seed.from);
    this.customTo = this.dayInput(seed.to);
    this.customError = '';
    this.setWindow('30');
  }

  onCustomFrom(value: string) {
    this.customFrom = value;
    this.customError = '';
  }

  onCustomTo(value: string) {
    this.customTo = value;
    this.customError = '';
  }

  todayInput(): string {
    return this.dayInput(Date.now());
  }

  // ── Activity: reading history ────────────────────────────────────────────
  // Off the critical path on purpose. The report list must not wait on this,
  // so the scan never touches `loading`, and a failure leaves the panel's
  // chart hidden instead of breaking the page. The whole (metadata-only)
  // timeline is held so changing the window re-renders without another read.
  private loadHistory() {
    this.indexeddbService.getHistoryActivity().then((entries: HistoryActivityEntry[]) => {
      this.history = entries || [];
      this.activityLoading = false;
      this.recomputeActivity();
    }).catch(() => {
      this.history = [];
      this.activityLoading = false;
      this.recomputeActivity();
    });
  }

  private recomputeActivity() {
    if (this.allRows.length === 0) {
      this.activity = null;
      this.idleCount = 0;
      return;
    }

    const range = this.windowRange();
    const from = range.from;
    const to = range.to;
    const fromDay = this.startOfDay(from);
    const toDay = this.startOfDay(to);
    const days = Math.round((toDay - fromDay) / DAY_MS) + 1;

    // From the reports store: one timestamp per report, so this part also
    // covers rows that live on a vulnrepo server.
    const touched = this.allRows.filter(r => {
      const ts = this.sortKey(r);
      return ts >= from && ts <= to;
    });
    const idleBefore = Date.now() - IDLE_DAYS * DAY_MS;
    this.idleCount = this.allRows.filter(r => this.sortKey(r) < idleBefore).length;

    // From report history: save events and severity deltas.
    const win = this.history.filter(e => e.ts >= from && e.ts <= to);
    const added = this.emptyStats();
    const addedPerDay = new Map<number, number>();

    const byReport = new Map<string, HistoryActivityEntry[]>();
    this.history.forEach(e => {
      const list = byReport.get(e.report_id);
      if (list) { list.push(e); } else { byReport.set(e.report_id, [e]); }
    });

    byReport.forEach(list => {
      list.sort((a, b) => a.ts - b.ts);
      // The snapshot immediately before the window is the baseline. Without
      // it, a report that was merely re-saved inside the window would report
      // its entire finding count as newly added.
      let prev: HistoryActivityEntry | null = null;
      for (const e of list) {
        if (e.ts < from) { prev = e; continue; }
        if (e.ts > to) { break; }

        // Clamped per severity: deleting a finding is not negative work, and
        // the total is summed from the clamped parts rather than from a total
        // delta, so a swap (one critical out, one high in) counts as one add.
        let delta = 0;
        for (const sev of this.sevOrder) {
          const d = prev ? e[sev] - prev[sev] : e[sev];
          if (d > 0) {
            added[sev] += d;
            delta += d;
          }
        }
        added.total += delta;
        if (delta > 0) {
          const day = this.startOfDay(e.ts);
          addedPerDay.set(day, (addedPerDay.get(day) || 0) + delta);
        }
        prev = e;
      }
    });

    const daySet = new Set<number>();
    win.forEach(e => daySet.add(this.startOfDay(e.ts)));

    // Counted back from the end of the window. When that end is today and
    // today has no save yet, the walk starts at yesterday — an unfinished day
    // should not zero a three-week run.
    let streak = 0;
    let cursor = toDay;
    if (!daySet.has(cursor) && cursor === this.startOfDay(Date.now())) {
      cursor = cursor - DAY_MS;
    }
    while (cursor >= fromDay && daySet.has(cursor)) {
      streak++;
      cursor = cursor - DAY_MS;
    }

    // Column count stays between ~13 and 60 at every window, which is what
    // keeps the strip readable without a scroll container.
    const grain: 'day' | 'week' | 'month' = days <= 60 ? 'day' : (days <= 548 ? 'week' : 'month');
    const buckets = this.buildBuckets(fromDay, toDay, grain, win, addedPerDay);
    const peakSaves = buckets.reduce((max, b) => Math.max(max, b.saves), 0);
    buckets.forEach(b => {
      b.height = peakSaves > 0 ? Math.round((b.saves / peakSaves) * 100) : 0;
      // One hue, more saves = more opaque. Zero-save columns are drawn by CSS
      // as a baseline tick, so their fill never applies.
      b.fill = peakSaves > 0 && b.saves > 0 ? 0.36 + 0.64 * (b.saves / peakSaves) : 1;
    });

    this.activity = {
      from,
      to,
      days,
      grain,
      reportsTouched: touched.length,
      newReports: this.allRows.filter(r => {
        const created = r.report_createdate || 0;
        return created >= from && created <= to;
      }).length,
      findingsOnActive: touched.reduce((sum, r) => sum + (r.report_stats?.total || 0), 0),
      saves: win.length,
      daysActive: daySet.size,
      streak,
      added,
      buckets,
      peakSaves,
      historyAvailable: this.history.length > 0
    };
  }

  private buildBuckets(fromDay: number, toDay: number, grain: 'day' | 'week' | 'month',
                       win: HistoryActivityEntry[], addedPerDay: Map<number, number>): HomeActivityBucket[] {
    const keyOf = (ts: number): number => {
      if (grain === 'day') { return this.startOfDay(ts); }
      if (grain === 'week') { return this.startOfWeek(ts); }
      return this.startOfMonth(ts);
    };

    // Every slot in range is seeded, so a quiet day renders as a visible zero
    // instead of a gap the eye reads as missing data.
    const slots = new Map<number, HomeActivityBucket>();
    const last = keyOf(toDay);
    let walk = keyOf(fromDay);
    let guard = 0;
    while (walk <= last && guard < 800) {
      slots.set(walk, {
        start: walk,
        label: this.bucketLabel(walk, grain),
        saves: 0,
        added: 0,
        height: 0,
        fill: 1,
        today: false
      });
      walk = this.nextBucket(walk, grain);
      guard++;
    }

    win.forEach(e => {
      const slot = slots.get(keyOf(e.ts));
      if (slot) { slot.saves++; }
    });
    addedPerDay.forEach((count, day) => {
      const slot = slots.get(keyOf(day));
      if (slot) { slot.added += count; }
    });

    const todayKey = keyOf(Date.now());
    const out = Array.from(slots.values()).sort((a, b) => a.start - b.start);
    out.forEach(b => { b.today = b.start === todayKey; });
    return out;
  }

  // ── Activity: dates ──────────────────────────────────────────────────────
  // All bucketing is on local days. UTC buckets would push a European
  // evening's work into the next day.
  private startOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  private endOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }

  private startOfWeek(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));  // weeks start Monday
    return d.getTime();
  }

  private startOfMonth(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return d.getTime();
  }

  // Stepped with setDate/setMonth rather than arithmetic so a DST change or a
  // short month cannot drop or duplicate a column.
  private nextBucket(start: number, grain: 'day' | 'week' | 'month'): number {
    const d = new Date(start);
    if (grain === 'day') {
      d.setDate(d.getDate() + 1);
    } else if (grain === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  private presetRange(days: number): { from: number; to: number } {
    const to = this.endOfDay(Date.now());
    const span = Math.max(1, days) - 1;
    const back = new Date(to);
    back.setDate(back.getDate() - span);
    return { from: this.startOfDay(back.getTime()), to };
  }

  private windowRange(): { from: number; to: number } {
    if (this.windowPreset === 'custom') {
      const from = this.parseDay(this.customFrom);
      const to = this.parseDay(this.customTo);
      if (from !== null && to !== null) {
        // The end never runs past today — a window into the future would
        // stretch the chart over days that cannot hold anything.
        const end = Math.min(this.endOfDay(to), this.endOfDay(Date.now()));
        if (from <= end && (end - from) / DAY_MS <= MAX_WINDOW_DAYS) {
          return { from, to: end };
        }
      }
      return this.presetRange(this.defaultWindowDays);
    }
    return this.presetRange(Number(this.windowPreset) || this.defaultWindowDays);
  }

  // 'YYYY-MM-DD' ↔ local midnight. new Date('2026-10-03') parses as UTC, which
  // shifts the whole window by a day for anyone west of Greenwich.
  private parseDay(value: string): number | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!m) { return null; }
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (isNaN(d.getTime())) { return null; }
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  private dayInput(ts: number): string {
    const d = new Date(ts);
    const pad = (n: number) => (n < 10 ? '0' + n : String(n));
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  private emptyStats(): HomeReportStats {
    return { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  }

  // ── Activity: labels ─────────────────────────────────────────────────────
  private dayLabel(ts: number): string {
    const d = new Date(ts);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleDateString(undefined, sameYear
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private bucketLabel(start: number, grain: 'day' | 'week' | 'month'): string {
    const d = new Date(start);
    if (grain === 'month') {
      return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  rangeLabel(): string {
    if (!this.activity) { return ''; }
    return this.dayLabel(this.activity.from) + ' – ' + this.dayLabel(this.activity.to);
  }

  windowLabel(): string {
    if (this.windowPreset !== 'custom') {
      const preset = this.windowPresets.find(p => p.value === this.windowPreset);
      return preset ? preset.aria : 'Last 30 days';
    }
    return this.rangeLabel() || 'Custom range';
  }

  addedCount(sev: keyof HomeReportStats): number {
    return this.activity ? this.activity.added[sev] : 0;
  }

  bucketTitle(b: HomeActivityBucket): string {
    const grain = this.activity ? this.activity.grain : 'day';
    const head = grain === 'week' ? 'Week of ' + b.label : b.label;
    const saves = b.saves === 0 ? 'no saves' : b.saves + (b.saves === 1 ? ' save' : ' saves');
    return head + ' · ' + saves + (b.added > 0 ? ' · +' + b.added + ' findings' : '');
  }

  grainNote(): string {
    if (!this.activity) { return ''; }
    const a = this.activity;
    const span = a.grain === 'day'
      ? a.days + ' days'
      : a.buckets.length + (a.grain === 'week' ? ' weeks' : ' months');
    const grainWord = a.grain === 'day' ? 'one bar per day' : (a.grain === 'week' ? 'weekly buckets' : 'monthly buckets');
    return a.peakSaves > 0 ? span + ' · ' + grainWord + ' · peak ' + a.peakSaves : span + ' · ' + grainWord;
  }

  // ── Formatting ───────────────────────────────────────────────────────────
  relativeTime(r: HomeRecentReport): string {
    const ts = this.sortKey(r);
    if (!ts) return 'never saved';

    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return min + ' min ago';

    const hrs = Math.floor(min / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');

    const days = Math.floor(hrs / 24);
    if (days === 1) return 'yesterday';
    if (days < 30) return days + ' days ago';

    return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ── Outbound ─────────────────────────────────────────────────────────────
  download() {
    window.open('https://github.com/kac89/vulnrepo', '_blank');
  }

  demo() {
    window.open('https://vulnrepo.com/', '_blank');
  }

}
