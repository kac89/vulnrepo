import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { version } from "../../version";
import { IndexeddbService } from '../indexeddb.service';
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

  readonly sevOrder: (keyof HomeReportStats)[] = ['critical', 'high', 'medium', 'low', 'info'];
  readonly pbkdf2Iterations = 600000;

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

    this.loadVault();
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

    this.reportCount = all.length;
    this.localCount = all.filter(r => r.api !== 'remote').length;
    this.remoteCount = all.filter(r => r.api === 'remote').length;
    this.findingCount = all.reduce((sum, r) => sum + (r.report_stats?.total || 0), 0);
    this.recent = all
      .sort((a, b) => this.sortKey(b) - this.sortKey(a))
      .slice(0, 5);
    this.state = this.reportCount > 0 ? 'WORKSPACE' : 'FIRST_RUN';
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
