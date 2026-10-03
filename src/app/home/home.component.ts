import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Subscription } from 'rxjs';
import { version } from "../../version";
import { IndexeddbService } from '../indexeddb.service';
import { KeyVaultService } from '../key-vault.service';

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
  findingCount = 0;
  storageUsedBytes = 0;
  recent: HomeRecentReport[] = [];

  vaultUnlocked = false;
  unlockedCount = 0;

  readonly sevOrder: (keyof HomeReportStats)[] = ['critical', 'high', 'medium', 'low', 'info'];
  readonly pbkdf2Iterations = 600000;

  private vaultSub: Subscription | undefined;

  constructor(private indexeddbService: IndexeddbService, private keyVault: KeyVaultService) { }

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
    this.vaultSub = this.keyVault.change$.subscribe(() => this.refreshVaultState());

    this.loadVault();
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
      const list = data || [];
      this.reportCount = list.length;
      this.findingCount = list.reduce((sum, r) => sum + (r.report_stats?.total || 0), 0);
      this.recent = [...list]
        .sort((a, b) => this.sortKey(b) - this.sortKey(a))
        .slice(0, 5);
      this.state = this.reportCount > 0 ? 'WORKSPACE' : 'FIRST_RUN';
      this.loading = false;
    }).catch(() => {
      this.state = 'FIRST_RUN';
      this.loading = false;
    });
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

  private refreshVaultState() {
    this.unlockedCount = this.keyVault.openReportIds().length;
    this.vaultUnlocked = this.unlockedCount > 0;
  }

  isUnlocked(reportId: string): boolean {
    return this.keyVault.has(reportId);
  }

  sevCount(r: HomeRecentReport, sev: keyof HomeReportStats): number {
    return r.report_stats ? r.report_stats[sev] : 0;
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
