import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { IndexeddbService } from '../indexeddb.service';
import { DialogEditComponent } from '../dialog-edit/dialog-edit.component';
import { SelectionModel } from '@angular/cdk/collections';
import { v4 as uuid } from 'uuid';
import { DialogApikeyComponent } from '../dialog-apikey/dialog-apikey.component';
import { ApiService } from '../api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionstorageserviceService } from "../sessionstorageservice.service"
import { KeyVaultService } from '../key-vault.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

export interface ReportStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface SevSegment {
  key: string;
  short: string;
  count: number;
}

export interface MyReportElement {
  select: any;
  position: number;
  report_name: string;
  report_id: string;
  report_createdate: number;
  encrypted_data: string;
  report_lastupdate: number;
  report_stats?: ReportStats;
  api?: string;
  apiurl?: string;
  apikey?: string;
  apiname?: string;
  // derived once per load so the list template stays free of method calls
  risk_score?: number;
  top_sev?: string;
  sev_segments?: SevSegment[];
  sev_label?: string;
  sev_none_label?: string;
  age_label?: string;
  age_title?: string;
}

export type SortField = 'risk' | 'updated' | 'created' | 'name';
export type StoreFilter = 'all' | 'local' | 'remote' | 'crit';

@Component({
  standalone: false,
  selector: 'app-myreports',
  templateUrl: './myreports.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./myreports.component.scss']
})
export class MyreportsComponent implements OnInit, OnDestroy {

  dataSource = new MatTableDataSource([]);
  selection = new SelectionModel<MyReportElement>(true, []);
  displayItems: MyReportElement[] = [];
  msg = '';
  keyfound = false;
  apilist: any = [];
  list: any = [];
  public dialogRef: MatDialogRef<DialogEditComponent> | undefined;
  private paginator: MatPaginator | undefined;
  private dataSubscription: Subscription | undefined;

  readonly sevOrder: (keyof ReportStats)[] = ['critical', 'high', 'medium', 'low', 'info'];
  readonly sevShort: { [key: string]: string } = { critical: 'C', high: 'H', medium: 'M', low: 'L', info: 'I' };
  readonly sortLabels: { [key: string]: string } = {
    risk: 'Risk', updated: 'Last updated', created: 'Created', name: 'Name'
  };
  readonly sortOptions: SortField[] = ['risk', 'updated', 'created', 'name'];
  readonly pageSizeOptions: number[] = [10, 20, 50, 100];

  viewMode: 'card' | 'list' = 'list';
  density: 'comfortable' | 'dense' = 'comfortable';
  sortField: SortField = 'risk';
  sortDir: 'asc' | 'desc' = 'desc';
  activeFilter: StoreFilter = 'all';
  searchTerm = '';
  pageSize = 10;
  counts = { all: 0, local: 0, remote: 0, crit: 0 };

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
    if (mp) {
      this.dataSource.paginator = mp;
    }
  }

  get totalFilteredCount(): number {
    return this.dataSource.filteredData.length;
  }

  get sortLabel(): string {
    return this.sortLabels[this.sortField];
  }

  /** True when the list is narrowed by text or by a storage/severity chip. */
  get filterActive(): boolean {
    return this.searchTerm !== '' || this.activeFilter !== 'all';
  }

  /** Reports in the current selection that still live locally (eligible for "Save on API"). */
  get selectedLocalCount(): number {
    return this.selection.selected.filter(item => !item.api).length;
  }

  /** Names what the current filters are looking for, so the empty state explains itself. */
  get emptyFilterHint(): string {
    const scope: { [key: string]: string } = {
      local: 'reports stored locally',
      remote: 'reports on a remote API',
      crit: 'reports with criticals'
    };
    if (this.searchTerm && this.activeFilter !== 'all') {
      return 'Nothing named "' + this.searchTerm + '" among ' + scope[this.activeFilter] + '.';
    }
    if (this.searchTerm) {
      return 'Nothing named "' + this.searchTerm + '".';
    }
    return 'There are no ' + scope[this.activeFilter] + '.';
  }

  constructor(public dialog: MatDialog, private indexeddbService: IndexeddbService, private apiService: ApiService,
    private snackBar: MatSnackBar, public sessionsub: SessionstorageserviceService, public router: Router,
    private keyVault: KeyVaultService) {

  }

  ngOnInit() {
    const saved = localStorage.getItem('VULNREPO-view-mode');
    if (saved === 'list' || saved === 'card') {
      this.viewMode = saved;
    }
    const savedDensity = localStorage.getItem('VULNREPO-density');
    if (savedDensity === 'comfortable' || savedDensity === 'dense') {
      this.density = savedDensity;
    }
    const savedPageSize = Number(localStorage.getItem('VULNREPO-page-size'));
    if (this.pageSizeOptions.indexOf(savedPageSize) !== -1) {
      this.pageSize = savedPageSize;
    }
    const savedSortField = localStorage.getItem('VULNREPO-sort-field');
    const savedSortDir = localStorage.getItem('VULNREPO-sort-dir');
    if (savedSortField === 'name' || savedSortField === 'created'
      || savedSortField === 'updated' || savedSortField === 'risk') {
      this.sortField = savedSortField;
    }
    if (savedSortDir === 'asc' || savedSortDir === 'desc') {
      this.sortDir = savedSortDir;
    }

    // one predicate handles both the search box and the storage/severity chips
    this.dataSource.filterPredicate = (row: MyReportElement, filter: string) => {
      const sep = filter.indexOf('|');
      const chip = filter.substring(0, sep);
      const term = filter.substring(sep + 1);
      if (term && !(row.report_name || '').toLowerCase().includes(term)) {
        return false;
      }
      if (chip === 'local' && row.api) { return false; }
      if (chip === 'remote' && !row.api) { return false; }
      if (chip === 'crit' && !(row.report_stats && row.report_stats.critical > 0)) { return false; }
      return true;
    };
    this.pushFilter();

    this.getallreports();
  }

  setViewMode(mode: 'card' | 'list') {
    this.viewMode = mode;
    localStorage.setItem('VULNREPO-view-mode', mode);
  }

  setDensity(mode: 'comfortable' | 'dense') {
    this.density = mode;
    localStorage.setItem('VULNREPO-density', mode);
  }

  /** Remembers "items per page" the same way the view mode and sort are remembered. */
  onPage(event: PageEvent) {
    if (event.pageSize !== this.pageSize) {
      this.pageSize = event.pageSize;
      localStorage.setItem('VULNREPO-page-size', String(event.pageSize));
    }
  }

  ngAfterViewInit() {
    this.dataSubscription = this.dataSource.connect().subscribe(data => {
      this.displayItems = data as MyReportElement[];
    });
  }

  ngOnDestroy() {
    this.dataSubscription?.unsubscribe();
    this.dataSource.disconnect();
  }

  getallreports() {
    this.list = [];
    this.indexeddbService.getReports().then(data => {
      if (data) {
        this.list.push(...data);
        this.applySort();
      }
    });
    this.getAPIallreports();
  }

  getAPIallreports() {
    this.apilist = [];
    const localkey = this.keyVault.getApiVault();

    if (localkey) {
      this.msg = 'API connection please wait...';

      this.keyfound = true;
      const vaultobj = JSON.parse(localkey);
      let x = 0;
      vaultobj.forEach((element: any) => {
        x = x + 1;

        this.apilist.push({ value: element.value, apikey: element.apikey, viewValue: element.viewValue });

        this.apiService.APISend(element.value, element.apikey, 'getreportslist', '').then(resp => {

          if (resp.length > 0) {
            resp.forEach((ele: any) => {
              ele.api = 'remote';
              ele.apiurl = element.value;
              ele.apikey = element.apikey;
              ele.apiname = element.viewValue;
            });
            this.list.push(...resp);
          }

        }).then(() => {
          this.applySort();
        }).catch(() => { });

        //progress bar on api reports
        if (vaultobj.length === x) {
          setTimeout(() => {
            // console.log('hide progress timeout');
            this.msg = '';
          }, 1000);
        }

      });




    } else {

      this.indexeddbService.retrieveAPIkey().then(ret => {
        if (ret) {

          if (this.sessionsub.getSessionStorageItem('hidedialog') !== 'true') {
            setTimeout((_: any) => this.openDialog(ret));
          }

        }
      });

    }
  }



  openDialog(data: any): void {

    const dialogRef = this.dialog.open(DialogApikeyComponent, {
      width: '400px',
      disableClose: true,
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The security key dialog was closed');
      if (result) {
        this.keyVault.setApiVault(result);
        this.getAPIallreports();
      }

    });

  }

  shareReport(report_id: any) {
    this.indexeddbService.downloadEncryptedReport(report_id);
  }

  removeReport(item: any) {

    const remo = 'removereport';
    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '420px',
      maxWidth: '95vw',
      panelClass: 'edit-dialog-panel',
      data: [{ remo }, { item }],
    });

    dialogRef.afterClosed().subscribe(result => {

      if (result) {
        this.indexeddbService.deleteReport(result, true).then(data => {
          if (data) {
            this.getallreports();
            this.selection.clear();
            this.keyVault.remove(item.report_id);
          }
        });

        if (result.api && result.apiurl && result.apikey) {

          // tslint:disable-next-line:max-line-length
          this.apiService.APISend(result.apiurl, result.apikey, 'removereport', 'reportid=' + result.report_id).then(resp => {
            if (resp.REMOVE_REPORT === 'OK') {
              this.getallreports();
              this.selection.clear()
            }
          });


        }
      }

    });

  }


  cloneReport(item: any) {

    item.report_name = 'Clone of ' + item.report_name;
    item.report_id = uuid();

    this.indexeddbService.cloneReportadd(item).then(data => {
      if (data) {
        this.getallreports();
      }
    });

  }

  fromAPIcloneReport(item: any) {

    item.report_name = 'Clone of ' + item.report_name;
    item.report_id = uuid();
    delete item.api;

    this.indexeddbService.cloneReportadd(item).then(data => {
      if (data) {
        this.getallreports();
      }
    });

  }

  toAPIcloneReport(item: any, apiurl: string, apikey: string) {

    item.report_id = uuid();

    // tslint:disable-next-line:max-line-length
    this.apiService.APISend(apiurl, apikey, 'savereport', 'reportdata=' + btoa(JSON.stringify(item))).then(resp => {
      if (resp) {

        if (resp.STORAGE === 'NOSPACE') {
          this.snackBar.open('API ERROR: NO SPACE LEFT!', 'OK', {
            duration: 3000,
            panelClass: ['notify-snackbar-fail']
          });
        }

        this.getallreports();
      }
    });

  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.data.forEach(row => this.selection.select(row));
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: MyReportElement): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.position + 1}`;
  }

  /** Whether every report on the current page is selected. */
  isAllShownSelected(): boolean {
    return this.displayItems.length > 0
      && this.displayItems.every(row => this.selection.isSelected(row));
  }

  /** Selects every report on the current page, or clears them if all are already selected. */
  toggleAllShown() {
    if (this.isAllShownSelected()) {
      this.displayItems.forEach(row => this.selection.deselect(row));
    } else {
      this.displayItems.forEach(row => this.selection.select(row));
    }
  }

  removeSelecteditems() {
    if (this.selection.selected.length > 0) {
      this.selection.selected.forEach((item) => {
        this.removeReport(item);
      });
    }

  }

  downloadSelecteditems() {
    this.selection.selected.forEach((item) => {
      this.shareReport(item.report_id);
    });
  }

  toAPIcloneSelecteditems(apiurl: string, apikey: string) {
    this.selection.selected
      .filter(item => !item.api)
      .forEach((item) => {
        this.toAPIcloneReport(item, apiurl, apikey);
      });
    this.selection.clear();
  }

  applyFilter(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.pushFilter();
  }

  setFilter(chip: StoreFilter) {
    this.activeFilter = chip;
    this.pushFilter();
  }

  resetFilters() {
    this.activeFilter = 'all';
    this.searchTerm = '';
    this.pushFilter();
  }

  private pushFilter() {
    // chip + '|' + term: the chip is always present, so the predicate runs even
    this.dataSource.filter = this.activeFilter + '|' + this.searchTerm;
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  setSortField(field: SortField) {
    if (this.sortField !== field) {
      this.sortField = field;
      this.sortDir = field === 'name' ? 'asc' : 'desc';
    }
    this.persistSort();
    this.applySort();
  }

  toggleSortDir() {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    this.persistSort();
    this.applySort();
  }

  private persistSort() {
    localStorage.setItem('VULNREPO-sort-field', this.sortField);
    localStorage.setItem('VULNREPO-sort-dir', this.sortDir);
  }

  /**
   * Severity-weighted score. The weights keep one critical above any number of
   * highs, so the order never hides a critical behind a long tail of lows.
   * Un-indexed reports score -1 and sort below reports with zero findings.
   */
  riskScore(stats?: ReportStats): number {
    if (!stats) {
      return -1;
    }
    return stats.critical * 1e6 + stats.high * 1e4 + stats.medium * 1e2 + stats.low * 2 + stats.info;
  }

  /** Highest severity present, used for the row's left stripe colour. */
  topSeverity(stats?: ReportStats): string {
    if (!stats || stats.total === 0) {
      return 'none';
    }
    return (this.sevOrder.find(key => (stats as any)[key] > 0) as string) || 'none';
  }

  relativeAge(timestamp: number): string {
    if (!timestamp) {
      return '—';
    }
    const days = Math.floor((Date.now() - timestamp) / 86400000);
    if (days <= 0) { return 'today'; }
    if (days === 1) { return 'yesterday'; }
    if (days < 30) { return days + 'd ago'; }
    if (days < 365) { return Math.round(days / 30) + 'mo ago'; }
    return Math.round(days / 365) + 'y ago';
  }

  /** Derives stripe colour, risk bar segments, labels and ages once per load. */
  private decorate(item: MyReportElement) {
    const stats = item.report_stats;
    item.risk_score = this.riskScore(stats);
    item.top_sev = this.topSeverity(stats);

    if (stats && stats.total > 0) {
      item.sev_segments = this.sevOrder
        .filter(key => (stats as any)[key] > 0)
        .map(key => ({ key: key as string, short: this.sevShort[key as string], count: (stats as any)[key] }));
      item.sev_label = stats.total + ' finding' + (stats.total !== 1 ? 's' : '') + ': '
        + item.sev_segments.map(seg => seg.count + ' ' + seg.key).join(', ');
    } else {
      item.sev_segments = [];
      item.sev_label = stats ? 'No findings' : 'Findings indexed on save';
      // the list row has a narrow risk column, so it gets the short form
      item.sev_none_label = stats ? 'No findings' : 'Not indexed';
    }

    const touched = item.report_lastupdate || item.report_createdate;
    item.age_label = this.relativeAge(touched);
    item.age_title = touched
      ? 'Updated ' + new Date(touched).toLocaleString()
      : 'Never updated';
  }

  private recount() {
    this.counts = {
      all: this.list.length,
      local: this.list.filter((item: MyReportElement) => !item.api).length,
      remote: this.list.filter((item: MyReportElement) => !!item.api).length,
      crit: this.list.filter((item: MyReportElement) =>
        !!item.report_stats && item.report_stats.critical > 0).length
    };
  }

  applySort() {
    this.list.forEach((item: MyReportElement) => this.decorate(item));

    this.list.sort((a: any, b: any) => {
      if (this.sortField === 'name') {
        const na = (a.report_name || '').toLowerCase();
        const nb = (b.report_name || '').toLowerCase();
        return this.sortDir === 'asc' ? na.localeCompare(nb) : nb.localeCompare(na);
      }
      if (this.sortField === 'risk') {
        const ra = a.risk_score;
        const rb = b.risk_score;
        if (ra !== rb) {
          return this.sortDir === 'asc' ? ra - rb : rb - ra;
        }
        // equal risk falls back to recency so the order stays stable and useful
        const ta = a.report_lastupdate || a.report_createdate || 0;
        const tb = b.report_lastupdate || b.report_createdate || 0;
        return tb - ta;
      }
      const va = this.sortField === 'created'
        ? (a.report_createdate || 0)
        : (a.report_lastupdate || a.report_createdate || 0);
      const vb = this.sortField === 'created'
        ? (b.report_createdate || 0)
        : (b.report_lastupdate || b.report_createdate || 0);
      return this.sortDir === 'asc' ? va - vb : vb - va;
    });

    this.recount();
    this.dataSource.data = this.list;
    this.dataSource.paginator = this.paginator;
  }

  Redirectme(url: any) {
    this.router.navigate([url]);
  }

}
