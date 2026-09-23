import { Component, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { HttpClient } from '@angular/common/http';
import { MatSort } from '@angular/material/sort';
import { IndexeddbService } from '../indexeddb.service';
import { DialogAddCustomTemplateComponent } from '../dialog-add-custom-template/dialog-add-custom-template.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionstorageserviceService } from "../sessionstorageservice.service"
import { KeyVaultService } from '../key-vault.service';
import { ApiService } from '../api.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface VulnsList {
  title: string;
  poc: string;
  desc: string;
  severity: string;
  ref: string;
  cvss: number;
  cve: string;
  expanded?: boolean;
}

type Origin = 'local' | 'remote' | 'built-in';

// Fields derived once per row at load time. Templates read these instead of
// calling methods, which would re-run on every change detection pass.
//
// Everything here is display-only and interpolated, never bound as HTML. In
// particular _desc is text extracted for reading: decoding "&lt;target
// binary&gt;" so it reads as "<target binary>" means the result can contain
// angle brackets, which is correct for text and unsafe as markup. Anything that
// persists, copies or exports a row therefore writes the untouched source
// `desc`, not this.
interface DecoratedRow {
  _origin: Origin;
  _id: string;
  _idsort: string;
  _name: string;
  _desc: string;
  _refs: string[];
  _tags: string[];
  _sev: string;
  _sevrank: number;
  _score: number | null;
  _haystack: string;
}

@Component({
  standalone: false,
  selector: 'app-templates-list',
  templateUrl: './templates-list.component.html',
  styleUrls: ['./templates-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class TemplatesListComponent implements OnInit {

  readonly sources = [
    { value: 'VULNREPO',       label: 'VULNRΞPO',                short: 'VULNRΞPO',      count: 56 },
    { value: 'CWE',            label: 'CWE Research Concepts',   short: 'CWE',           count: 939 },
    { value: 'MENTERPRISE',    label: 'MITRE ATT&CK Enterprise', short: 'ATT&CK Ent.',   count: 670 },
    { value: 'MMOBILE',        label: 'MITRE ATT&CK Mobile',     short: 'ATT&CK Mobile', count: 213 },
    { value: 'OWASPTOP2025',   label: 'OWASP Top 10 2025',       short: 'OWASP 2025',    count: 10 },
    { value: 'OWASPTOP2021',   label: 'OWASP Top 10 2021',       short: 'OWASP 2021',    count: 10 },
    { value: 'OWASPTOP2017',   label: 'OWASP Top 10 2017',       short: 'OWASP 2017',    count: 10 },
    { value: 'OWASPTOP10CICD', label: 'OWASP Top 10 CI/CD',      short: 'OWASP CI/CD',   count: 10 },
    { value: 'OWASPTOP10k8s',  label: 'OWASP Kubernetes Top 10', short: 'OWASP K8s',     count: 10 },
  ];
  readonly sourceLabels: Record<string, string> = Object.fromEntries(
    this.sources.map(s => [s.value, s.label])
  );

  // Every column the table can render. Which of them are live is decided per
  // source by buildColumns() — see the comment there.
  displayedColumns: string[] = ['title', 'severity', 'cvss', 'actions', 'expand'];
  dataSource = new MatTableDataSource<VulnsList>();
  getvulnlistStatus = '';
  loading = true;
  countvulns: any[] = [];
  filterValue = '';
  sourceSelect = 'VULNREPO';
  reportTemplateList_int: any[] = [];
  reportTemplateList: any[] = [];
  local: any[] = [];
  json: any[] = [];

  // Facets
  readonly severityOrder = ['Critical', 'High', 'Medium', 'Low', 'Info'];
  severityFacets: { key: string, count: number }[] = [];
  originFacets: { key: Origin, label: string, count: number }[] = [];
  activeSeverities = new Set<string>();
  activeOrigins = new Set<Origin>();

  private filterInput$ = new Subject<string>();

  // The table lives inside an @if, so these resolve only once a source has
  // finished loading — and again after every state swap. Setters re-attach the
  // datasource each time instead of capturing an undefined reference.
  private paginator?: MatPaginator;
  private sort?: MatSort;

  @ViewChild(MatPaginator) set paginatorRef(value: MatPaginator) {
    if (value) { this.paginator = value; this.dataSource.paginator = value; }
  }
  @ViewChild(MatSort) set sortRef(value: MatSort) {
    if (value) { this.sort = value; this.dataSource.sort = value; }
  }

  // Bound to the table so a freshly created MatSort starts on a column that
  // exists — the sorted column can vanish when the source changes.
  sortActive = 'cvss';
  sortDirection: 'asc' | 'desc' = 'desc';

  private readonly SOURCE_ASSETS: Record<string, string> = {
    CWE:            '/assets/CWE_V.4.3.json',
    MMOBILE:        '/assets/mobile-attack.json',
    MENTERPRISE:    '/assets/enterprise-attack.json',
    OWASPTOP2017:   '/assets/OWASPtop102017.json',
    OWASPTOP2021:   '/assets/OWASPtop102021.json',
    OWASPTOP2025:   '/assets/OWASPtop102025.json',
    OWASPTOP10CICD: '/assets/OWASPtop10cicd.json',
    OWASPTOP10k8s:  '/assets/OWASPtop10k8s.json',
  };

  // One parser for every row — cleanDesc runs 939 times on the CWE catalog.
  private static readonly htmlParser = new DOMParser();

  // A bracketed or prefixed catalog identifier: [T1059], [CAPEC-98], [APP-22],
  // CWE-79 - …, A01: …, K01: …, CICD-SEC-1: …. Deliberately requires a digit so
  // VULNRΞPO's category prefixes ([XSS], [RCE]) are not mistaken for IDs.
  private readonly ID_PATTERNS = [
    /^\[([A-Z]{1,8}-?\d[\w.]*)\]\s+/,
    /^(CWE-\d+)\s+-\s+/,
    /^([A-Z][A-Z0-9-]{0,12}\d)[:.]\s+/,
  ];

  constructor(private http: HttpClient, public dialog: MatDialog, private indexeddbService: IndexeddbService,
    private apiService: ApiService, public sessionsub: SessionstorageserviceService,
    private keyVault: KeyVaultService, private snackBar: MatSnackBar) {

    this.getvulnlistStatus = 'Loading...';
  }

  ngOnInit() {
    this.dataSource.filterPredicate = (row: any) => this.matches(row);
    this.dataSource.sortingDataAccessor = (row: any, column: string) => {
      switch (column) {
        case 'severity': return row._sevrank;
        case 'cvss':     return row._score === null ? -1 : row._score;
        case 'id':       return row._idsort;
        case 'title':    return row._name.toLowerCase();
        default:         return row[column];
      }
    };

    this.filterInput$.pipe(debounceTime(150), distinctUntilChanged()).subscribe(value => {
      this.filterValue = value;
      this.refilter();
    });

    this.gettemplates();
  }

  // ── Row decoration ────────────────────────────────────────────────────────

  private extractId(title: string): string {
    for (const re of this.ID_PATTERNS) {
      const m = (title || '').match(re);
      if (m) { return m[1]; }
    }
    return '';
  }

  // Markup cannot be stripped correctly by string replacement: one pass over
  // "<scr<script>ipt>" reassembles the thing it removed, and decoding entities
  // afterwards turns "&lt;script&gt;" back into a tag. Hand the string to the
  // platform parser instead and take the text out of it — one pass, no
  // reassembly, entities resolved as part of parsing rather than after it.
  // parseFromString builds an inert document: nothing here executes.
  private toPlainText(value: string): string {
    if (!/[<&]/.test(value)) { return value; }
    const doc = TemplatesListComponent.htmlParser.parseFromString(value, 'text/html');
    doc.body.querySelectorAll('script, style').forEach((el: Element) => el.remove());
    return doc.body.textContent || '';
  }

  // MITRE ships descriptions with markup and citation markers in them — 432 of
  // the 670 Enterprise entries. These are display text and nothing more: the
  // detail panel interpolates them, and several entries quote real payloads
  // (Rundll32's "javascript:" one-liner, CWE-83's dangerous attributes) that
  // have to survive as readable text. Text extraction runs first so the tidying
  // below only ever moves text around.
  private cleanDesc(desc: string): string {
    return this.toPlainText(desc || '')
      .replace(/\(Citation:[^)]*\)/g, '')
      .replace(/\[Citation:[^\]]*\]/g, '')
      .replace(/\[([^\]]+)\]\((?:https?:\/\/)[^)]*\)/g, '$1')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private normalizeSeverity(sev: string): string {
    const s = (sev || '').trim().toLowerCase();
    if (s === 'informational' || s === 'information' || s === 'info' || s === '') { return 'Info'; }
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private decorate(rows: any[]): any[] {
    return rows.map(row => {
      const title = row.title || '';
      const id = this.extractId(title);
      const sev = this.normalizeSeverity(row.severity);
      const score = parseFloat(row.cvss);
      const tags: string[] = Array.isArray(row.tags)
        ? row.tags.map((t: any) => (typeof t === 'string' ? t : (t && t.name) || '')).filter(Boolean)
        : [];
      const desc = this.cleanDesc(row.desc);
      const refs = (row.ref || '').split(/[\r\n]+/).map((r: string) => r.trim()).filter(Boolean);

      const decorated: any = Object.assign(row, {
        _origin: row.api === 'remote' ? 'remote' : (row._key !== undefined ? 'local' : 'built-in'),
        _id: id,
        // Zero-padded so a plain string sort orders CAPEC-13 before CAPEC-117.
        _idsort: id.replace(/\d+/g, (d: string) => d.padStart(6, '0')),
        _name: id ? title.slice(title.indexOf(id) + id.length).replace(/^[\]:.\s-]+/, '') : title,
        _desc: desc,
        _refs: refs,
        _tags: tags,
        _sev: sev,
        _sevrank: this.severityOrder.indexOf(sev) === -1
          ? 0
          : this.severityOrder.length - this.severityOrder.indexOf(sev),
        _score: isNaN(score) || score === 0 ? null : score,
      } as DecoratedRow);

      // Scoped search surface: what the user can actually see on the row.
      // The default MatTableDataSource predicate concatenates every property,
      // so `poc` and `cvss_vector` used to swallow queries like "AV:N".
      decorated._haystack = [decorated._id, decorated._name, decorated._desc, row.cve, tags.join(' ')]
        .join(' ').toLowerCase();

      return decorated;
    });
  }

  // ── Column set ────────────────────────────────────────────────────────────

  // A column renders when the loaded source actually populates it. Nine
  // catalogs of very different shape share this table: ATT&CK has no scores and
  // one severity, CWE has no CVEs, VULNRΞPO has all three. Deciding per load
  // means a tenth source needs no configuration here.
  private buildColumns(rows: any[]): string[] {
    const cols: string[] = [];
    const total = rows.length || 1;
    // A value column earns its width at 5% populated — below that it is a run of
    // em-dashes, and the few real values are shown in the expanded row instead.
    const populated = (test: (r: any) => boolean) => rows.filter(test).length / total >= 0.05;

    // Identity is all-or-nothing: a mostly-empty ID column reads as broken data.
    if (rows.filter(r => r._id).length / total >= 0.8) { cols.push('id'); }
    cols.push('title');
    // Ownership is not a value — one editable row is reason enough to mark it.
    if (rows.some(r => r._origin !== 'built-in')) { cols.push('origin'); }
    if (new Set(rows.map(r => r._sev)).size > 1) { cols.push('severity'); }
    if (populated(r => r._score !== null)) { cols.push('cvss'); }
    if (populated(r => !!r.cve)) { cols.push('cve'); }
    if (populated(r => r._tags.length > 0)) { cols.push('tags'); }
    cols.push('actions', 'expand');
    return cols;
  }

  hasColumn(name: string): boolean {
    return this.displayedColumns.indexOf(name) !== -1;
  }

  get columnCount(): number {
    return this.displayedColumns.length;
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  private setTableData(data: any[]) {
    const rows = this.decorate(data);
    this.countvulns = rows;
    this.displayedColumns = this.buildColumns(rows);
    this.dataSource.data = rows;
    this.pickSort();
    this.buildFacets(rows);
    this.refilter();
    this.getvulnlistStatus = '';
    this.loading = false;
  }

  // The sorted column can vanish when the source changes — ATT&CK has no CVSS
  // to sort by. Fall back to whatever the new column set actually offers.
  private pickSort() {
    if (this.sort && this.displayedColumns.indexOf(this.sort.active) !== -1) {
      this.sortActive = this.sort.active;
      this.sortDirection = (this.sort.direction || 'desc') as 'asc' | 'desc';
      return;
    }
    this.sortActive = this.displayedColumns.indexOf('cvss') !== -1 ? 'cvss'
      : (this.displayedColumns.indexOf('id') !== -1 ? 'id' : 'title');
    this.sortDirection = this.sortActive === 'cvss' ? 'desc' : 'asc';
  }

  private buildFacets(rows: any[]) {
    const sev: Record<string, number> = {};
    const org: Record<string, number> = {};
    rows.forEach(r => {
      sev[r._sev] = (sev[r._sev] || 0) + 1;
      org[r._origin] = (org[r._origin] || 0) + 1;
    });

    this.severityFacets = Object.keys(sev).length > 1
      ? this.severityOrder.filter(k => sev[k]).map(k => ({ key: k, count: sev[k] }))
      : [];

    const originLabels: Record<Origin, string> = { local: 'Mine', remote: 'Remote', 'built-in': 'Built in' };
    this.originFacets = Object.keys(org).length > 1
      ? (['local', 'remote', 'built-in'] as Origin[])
          .filter(k => org[k])
          .map(k => ({ key: k, label: originLabels[k], count: org[k] }))
      : [];

    // Drop selections the new source can't satisfy.
    this.activeSeverities.forEach(k => { if (!sev[k]) { this.activeSeverities.delete(k); } });
    this.activeOrigins.forEach(k => { if (!org[k]) { this.activeOrigins.delete(k); } });
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  private matches(row: any): boolean {
    if (this.activeSeverities.size && !this.activeSeverities.has(row._sev)) { return false; }
    if (this.activeOrigins.size && !this.activeOrigins.has(row._origin)) { return false; }
    const q = this.filterValue.trim().toLowerCase();
    return !q || row._haystack.includes(q);
  }

  // MatTableDataSource only re-runs the predicate when `filter` changes, so the
  // facet state is folded into the string it watches.
  private refilter() {
    this.dataSource.filter = JSON.stringify({
      q: this.filterValue.trim().toLowerCase(),
      s: [...this.activeSeverities].sort(),
      o: [...this.activeOrigins].sort(),
    });
    if (this.dataSource.paginator) { this.dataSource.paginator.firstPage(); }
  }

  onFilterInput(value: string) {
    this.filterValue = value;
    this.filterInput$.next(value);
  }

  // Immediate, un-debounced path for programmatic changes (clear, tag click).
  applyFilter(value: string) {
    this.filterValue = value;
    this.refilter();
  }

  toggleSeverity(key: string) {
    this.activeSeverities.has(key) ? this.activeSeverities.delete(key) : this.activeSeverities.add(key);
    this.refilter();
  }

  toggleOrigin(key: Origin) {
    this.activeOrigins.has(key) ? this.activeOrigins.delete(key) : this.activeOrigins.add(key);
    this.refilter();
  }

  filterByTag(tag: string, event: Event) {
    event.stopPropagation();
    this.filterValue = tag;
    this.refilter();
  }

  clearFilters() {
    this.filterValue = '';
    this.activeSeverities.clear();
    this.activeOrigins.clear();
    this.refilter();
  }

  get hasActiveFilters(): boolean {
    return !!this.filterValue || this.activeSeverities.size > 0 || this.activeOrigins.size > 0;
  }

  get filteredCount(): number {
    return this.dataSource.filteredData.length;
  }

  // ── Rows ──────────────────────────────────────────────────────────────────

  toggleRow(element: any) {
    element.expanded = !element.expanded;
  }

  onRowKeydown(element: any, event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleRow(element);
    }
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  gettemplates() {
    this.loading = true;
    this.indexeddbService.retrieveReportTemplates().then(ret => {
      this.local = ret || [];

      this.http.get<any>('/assets/vulns.json?v=' + +new Date()).subscribe({
        next: res => {
          if (res) {
            this.json = res;
            const merged = [...this.local, ...this.json];
            this.reportTemplateList = merged;
            this.setTableData(merged);
            this.getAPITemplates();
          }
        },
        error: () => {
          this.loading = false;
          this.getvulnlistStatus = 'Could not load /assets/vulns.json.';
        }
      });
    });
  }

  getAPITemplates() {
    const localkey = this.keyVault.getApiVault();
    if (!localkey) return;

    const vaultobj = JSON.parse(localkey);
    this.reportTemplateList_int = [];

    vaultobj.forEach((element: any) => {
      this.apiService.APISend(element.value, element.apikey, 'getreporttemplates', '').then(resp => {
        if (resp.length > 0) {
          resp.forEach((ele: any) => {
            ele.api = 'remote';
            ele.apiurl = element.value;
            ele.apikey = element.apikey;
            ele.apiname = element.viewValue;
          });
          this.reportTemplateList_int.push(...resp);
        }
      }).then(() => {
        this.setTableData([...this.reportTemplateList, ...this.reportTemplateList_int]);
      }).catch(() => { });
    });
  }

  selectSource(value: string) {
    if (this.sourceSelect === value) { return; }
    this.sourceSelect = value;
    this.clearFilters();
    this.changeselect();
  }

  changeselect() {
    if (this.sourceSelect === 'VULNREPO') {
      this.loading = true;
      this.getvulnlistStatus = 'Loading...';
      this.gettemplates();
      return;
    }

    const assetPath = this.SOURCE_ASSETS[this.sourceSelect];
    if (!assetPath) return;

    this.loading = true;
    this.getvulnlistStatus = 'Loading...';
    this.http.get<any>(assetPath + '?v=' + +new Date()).subscribe({
      next: res => this.setTableData(res || []),
      error: () => {
        this.loading = false;
        this.getvulnlistStatus = 'Could not load ' + assetPath + '.';
      }
    });
  }

  // ── Template management ───────────────────────────────────────────────────

  create_issue(): void {
    const dialogRef = this.dialog.open(DialogAddCustomTemplateComponent, {
      width: '600px',
      disableClose: false,
      data: []
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.indexeddbService.saveReportTemplateinDB({
          title: result.title, poc: '', desc: result.desc, severity: result.severity,
          ref: result.ref, cvss: result.cvss, cvss_vector: result.cvss_vector,
          cve: result.cve, tags: result.tags
        }).then(() => {
          this.notify('Template saved.');
          this.gettemplates();
        });
      } else {
        this.gettemplates();
      }
    });
  }

  editTemplate(element: any, event: Event): void {
    event.stopPropagation();

    const dialogRef = this.dialog.open(DialogAddCustomTemplateComponent, {
      width: '600px',
      disableClose: true,
      data: [element, { edit: true }]
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result[1] && result[1].original) {
        const original = result[1].original[0];
        const updated = {
          title: result[0].title, poc: '', desc: result[0].desc, severity: result[0].severity,
          ref: result[0].ref, cvss: result[0].cvss, cvss_vector: result[0].cvss_vector,
          cve: result[0].cve, tags: result[0].tags
        };
        this.indexeddbService.updateTemplate(updated, original._key).then(() => {
          this.notify('Template updated.');
          this.gettemplates();
        });
      }
    });
  }

  // Two-step confirm in place of a dialog: the first click arms the row, a
  // second within 4s commits. Nothing else on this screen destroys data.
  confirmDelete(element: any, event: Event) {
    event.stopPropagation();
    if (element._armed) {
      clearTimeout(element._armedTimer);
      this.deleteTemplate(element);
      return;
    }
    element._armed = true;
    element._armedTimer = setTimeout(() => { element._armed = false; }, 4000);
  }

  private deleteTemplate(element: any) {
    this.indexeddbService.deleteTemplate(element).then(() => {
      this.notify('Template deleted.');
      this.gettemplates();
    });
  }

  // Adopt a row from a read-only catalog (CWE, ATT&CK, OWASP) into the user's
  // own templates. Previously the only route was retyping it by hand.
  adoptTemplate(element: any, event: Event) {
    event.stopPropagation();
    this.indexeddbService.saveReportTemplateinDB({
      title: element.title, poc: '', desc: element.desc || '', severity: element._sev,
      ref: element.ref || '', cvss: element.cvss || '', cvss_vector: element.cvss_vector || '',
      cve: element.cve || '', tags: element._tags || []
    }).then(() => {
      this.notify('Saved to your templates.');
      if (this.sourceSelect === 'VULNREPO') { this.gettemplates(); }
    });
  }

  copyAsJson(element: any, event: Event) {
    event.stopPropagation();
    const payload = {
      title: element.title, poc: '', desc: element.desc || '', severity: element._sev,
      ref: element.ref || '', cvss: element.cvss || '', cvss_vector: element.cvss_vector || '',
      cve: element.cve || '', tags: element._tags || []
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      .then(() => this.notify('Template JSON copied.'))
      .catch(() => this.notify('Could not copy to clipboard.'));
  }

  exportVisible() {
    const rows = this.dataSource.filteredData.map((r: any) => ({
      title: r.title, poc: '', desc: r.desc || '', severity: r._sev,
      ref: r.ref || '', cvss: r.cvss || '', cvss_vector: (r as any).cvss_vector || '',
      cve: r.cve || '', tags: r._tags || []
    }));
    if (!rows.length) { return; }

    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', this.sourceLabels[this.sourceSelect] + ' templates (vulnrepo.com).vulnrepo-templates');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private notify(message: string) {
    this.snackBar.open(message, 'OK', {
      duration: 4000,
      panelClass: ['notify-snackbar-fail']
    });
  }
}
