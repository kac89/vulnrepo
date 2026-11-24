import { Component, OnInit, Inject, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IndexeddbService } from '../indexeddb.service';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { CryptoUtilsService } from '../crypto-utils.service';
import { KeyVaultService } from '../key-vault.service';
import {
  ReportDiffService, ReportDiff, IssueDiff, AssetDiff, FieldChange, DiffLine
} from '../report-diff.service';

/**
 * What the dialog hands back when the user restores individual pieces of an
 * older snapshot. The report component applies it to the live report and leaves
 * it unsaved, so a restore is reviewable and undoable by discarding changes.
 */
export interface RestoreSelection {
  action: 'restore-selection';
  /** whole issue objects as they were in the older snapshot */
  issues: any[];
  /** whole asset objects as they were in the older snapshot */
  assets: any[];
  /** dotted path → older value */
  fields: { path: string, label: string, value: any }[];
  /** human label of the snapshot restored from, for the changelog */
  sourceLabel: string;
}

/** one row the user can pick as a diff side */
interface VersionRow {
  /** null for the live report */
  snapshot: any | null;
  label: string;
  lastupdate: any;
  isCurrent: boolean;
}

@Component({
  selector: 'app-dialog-report-history',
  standalone: false,
  //imports: [],
  templateUrl: './dialog-report-history.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dialog-report-history.component.scss'
})
export class DialogReportHistoryComponent implements OnInit {

  displayedColumns: string[] = ['compare', 'report_name', 'report_lastupdate', 'settings'];
  dataSource = new MatTableDataSource([]);
  anyreports = false;
  loading = false;

  report_id = '';
  /** the live report, passed in by the report component when it is decrypted */
  private current: any = null;

  mode: 'list' | 'diff' = 'list';

  /** compare selection — `null` on the right means the live report */
  pickA: any | null = null;
  pickB: any | null | undefined = undefined;

  diffLoading = false;
  diffError = '';
  diff: ReportDiff | null = null;
  leftLabel = '';
  rightLabel = '';
  /** the resolved older snapshot the restore actions read from */
  private leftData: any = null;

  /** expanded detail rows in the diff view, keyed by `kind:key` */
  expanded = new Set<string>();
  /** everything the user has ticked for restore, keyed the same way */
  selected = new Set<string>();

  /** collapsed line diffs, cached so the template does not recompute per render */
  private collapsedCache = new Map<FieldChange, DiffLine[]>();

  /** set when a full-report replace has been asked for and awaits confirmation */
  confirmReplace: any = null;

  @ViewChild(MatSort) set sort(sort: MatSort) {
    if (sort) this.dataSource.sort = sort;
  }

  @ViewChild('paginator') set paginator(paginator: MatPaginator) {
    if (paginator) this.dataSource.paginator = paginator;
  }


  constructor(
    public router: Router,
    public dialogRef: MatDialogRef<DialogReportHistoryComponent>,
    private indexeddbService: IndexeddbService,
    private cryptoUtils: CryptoUtilsService,
    private keyVault: KeyVaultService,
    private diffService: ReportDiffService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    // Historically this dialog took the report id as the whole payload; it now
    // also wants the live decrypted report so "Current" can be a diff side.
    if (this.data && typeof this.data === 'object') {
      this.report_id = this.data.report_id;
      this.current = this.data.current ?? null;
    } else {
      this.report_id = this.data;
    }

    this.getreports();
  }


  getreports(): void {
    this.loading = true;
    this.indexeddbService.getReportsHistory(this.report_id).then(retdata => {
      if (retdata.length > 0) {
        this.anyreports = true;
        this.dataSource.data = retdata;
      } else {
        this.dataSource.data = [];
        this.anyreports = false;
      }
      this.loading = false;
    });
  }

  // ── compare selection ─────────────────────────────────────────────────────

  get hasCurrent(): boolean {
    return !!this.current;
  }

  /** A is the older side; B defaults to the live report. */
  selectA(snapshot: any): void {
    this.pickA = this.pickA === snapshot ? null : snapshot;
  }

  selectB(snapshot: any | null): void {
    // `null` is a meaningful value here (the live report), so track "unset"
    // separately rather than overloading null.
    if (this.pickB !== undefined && this.pickB === snapshot) {
      this.pickB = undefined;
      return;
    }
    this.pickB = snapshot;
  }

  isA(snapshot: any): boolean { return this.pickA === snapshot; }
  isB(snapshot: any): boolean { return this.pickB !== undefined && this.pickB === snapshot; }

  get canCompare(): boolean {
    if (!this.pickA) return false;
    if (this.pickB === undefined) return this.hasCurrent;   // default right side
    return this.pickB !== this.pickA;
  }

  /** Compare one snapshot straight against the live report, no picking. */
  compareWithCurrent(snapshot: any): void {
    this.pickA = snapshot;
    this.pickB = null;
    this.compare();
  }

  async compare(): Promise<void> {
    if (!this.canCompare) return;

    const left = this.pickA;
    const right = this.pickB === undefined ? null : this.pickB;

    this.mode = 'diff';
    this.diffLoading = true;
    this.diffError = '';
    this.diff = null;
    this.expanded.clear();
    this.selected.clear();
    this.collapsedCache.clear();

    try {
      const leftData = await this.resolve(left);
      const rightData = await this.resolve(right);

      // Guard the ordering the UI promises: A is the older side. Swapping on
      // the user's behalf is friendlier than rendering every change inverted.
      const leftTime = this.timeOf(left);
      const rightTime = this.timeOf(right);
      const flip = leftTime > rightTime;

      this.leftData = flip ? rightData : leftData;
      this.diff = this.diffService.diff(
        flip ? rightData : leftData,
        flip ? leftData : rightData
      );
      this.leftLabel = this.labelOf(flip ? right : left);
      this.rightLabel = this.labelOf(flip ? left : right);
    } catch (err: any) {
      this.diffError = err?.message || 'Could not read one of the versions.';
    } finally {
      this.diffLoading = false;
    }
  }

  backToList(): void {
    this.mode = 'list';
    this.diff = null;
    this.diffError = '';
    this.selected.clear();
    this.expanded.clear();
    this.collapsedCache.clear();
  }

  /** null means "the live report"; anything else is a stored snapshot to decrypt. */
  private async resolve(row: any | null): Promise<any> {
    if (row === null) {
      if (!this.current) throw new Error('The current report is not open.');
      return this.current;
    }

    const pass = this.keyVault.get(this.report_id);
    if (!pass) {
      throw new Error('Report is locked. Unlock it to compare versions.');
    }
    try {
      const plaintext = await this.cryptoUtils.decrypt(String(row.encrypted_data), pass);
      return JSON.parse(plaintext);
    } catch {
      // A snapshot taken before a key change cannot be read with the current
      // key. Say so plainly rather than reporting an empty diff.
      throw new Error('This version could not be decrypted with the current security key.');
    }
  }

  private timeOf(row: any | null): number {
    if (row === null) return Number.MAX_SAFE_INTEGER;   // the live report is always newest
    const t = new Date(row.report_lastupdate).getTime();
    return isNaN(t) ? 0 : t;
  }

  labelOf(row: any | null): string {
    if (row === null) return 'Current (unsaved)';
    const t = new Date(row.report_lastupdate);
    return isNaN(t.getTime()) ? String(row.report_lastupdate) : t.toLocaleString();
  }

  // ── diff view helpers ─────────────────────────────────────────────────────

  issueRowKey(d: IssueDiff): string { return 'i:' + d.kind + ':' + d.key; }
  assetRowKey(d: AssetDiff): string { return 'a:' + d.kind + ':' + (d.id || d.name + '|' + d.target); }
  fieldRowKey(f: FieldChange): string { return 'f:' + f.path; }

  toggleExpanded(key: string): void {
    if (this.expanded.has(key)) this.expanded.delete(key); else this.expanded.add(key);
  }
  isExpanded(key: string): boolean { return this.expanded.has(key); }

  toggleSelected(key: string, event?: Event): void {
    event?.stopPropagation();
    if (this.selected.has(key)) this.selected.delete(key); else this.selected.add(key);
  }
  isSelected(key: string): boolean { return this.selected.has(key); }

  get selectedCount(): number { return this.selected.size; }

  /**
   * Only changes that exist on the older side can be restored: an issue that
   * was *added* since has no earlier version to go back to (removing it is the
   * report view's job, not a restore).
   */
  canRestoreIssue(d: IssueDiff): boolean { return d.kind !== 'added'; }
  canRestoreAsset(d: AssetDiff): boolean { return d.kind !== 'added'; }

  selectAllRestorable(): void {
    if (!this.diff) return;
    this.diff.issues.filter(d => this.canRestoreIssue(d)).forEach(d => this.selected.add(this.issueRowKey(d)));
    this.diff.assets.filter(d => this.canRestoreAsset(d)).forEach(d => this.selected.add(this.assetRowKey(d)));
    this.diff.fields.forEach(f => this.selected.add(this.fieldRowKey(f)));
  }

  clearSelection(): void { this.selected.clear(); }

  /** Line diff with long unchanged runs collapsed; memoised per field. */
  collapsedLines(field: FieldChange): DiffLine[] {
    if (!field.lines) return [];
    let cached = this.collapsedCache.get(field);
    if (!cached) {
      cached = this.diffService.collapse(field.lines);
      this.collapsedCache.set(field, cached);
    }
    return cached;
  }

  severityClass(severity: string): string {
    const s = String(severity || '').toLowerCase();
    if (s === 'critical') return 'c';
    if (s === 'high') return 'h';
    if (s === 'medium') return 'm';
    if (s === 'low') return 'l';
    return 'i';
  }

  // ── restore ───────────────────────────────────────────────────────────────

  /**
   * Hands the chosen pieces of the older snapshot back to the report component.
   * Nothing is written to IndexedDB here — the caller patches the open report
   * and leaves it dirty, so the user reviews and saves (or discards) the result.
   */
  restoreSelected(): void {
    if (!this.diff || !this.selected.size) return;

    const issues = this.diff.issues
      .filter(d => this.canRestoreIssue(d) && this.selected.has(this.issueRowKey(d)))
      .map(d => d.left);

    const assets = this.diff.assets
      .filter(d => this.canRestoreAsset(d) && this.selected.has(this.assetRowKey(d)))
      .map(d => d.left);

    const fields = this.diff.fields
      .filter(f => this.selected.has(this.fieldRowKey(f)))
      .map(f => ({
        path: f.path,
        label: f.label,
        value: this.diffService.readPath(this.leftData, f.path)
      }));

    const selection: RestoreSelection = {
      action: 'restore-selection',
      issues, assets, fields,
      sourceLabel: this.leftLabel
    };
    this.dialogRef.close(selection);
  }

  /** Restore exactly one row without having to tick it first. */
  restoreOne(key: string): void {
    this.selected.clear();
    this.selected.add(key);
    this.restoreSelected();
  }

  // ── existing actions ──────────────────────────────────────────────────────

  downloadhistoryreport(report: any): void {

    const enc = btoa(JSON.stringify(report));
    const blob = new Blob([encodeURIComponent(enc)], { type: 'text/plain' });
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', report.report_name + ' ' + report.report_id + ' (vulnrepo.com).vulnr');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  }

  /**
   * Whole-report rollback. This deletes the report and re-imports the snapshot,
   * so every edit made since is gone and there is no undo — hence the explicit
   * confirmation step. Selective restore is the non-destructive route.
   */
  askReplace(report: any): void {
    this.confirmReplace = report;
  }

  cancelReplace(): void {
    this.confirmReplace = null;
  }

  replacereport(report: any): void {

    const importreport = report;

    this.indexeddbService.deleteReport(importreport, false).then(data => {


      if (data) {
        this.indexeddbService.importReport(JSON.stringify(importreport)).then(data => {

          this.router.navigate(['report/', importreport.report_id]).then(() => {
            window.location.reload();
          });

        });
      }

    });

  }

  removereporthistory(report:any): void {

    this.indexeddbService.deletesingleReporthistory(report).then(data => {
      if (data) {
        this.getreports();
      }
    });

  }

}
