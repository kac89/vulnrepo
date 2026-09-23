import { Component, inject, OnInit, AfterViewInit, HostListener, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import { CurrentdateService } from '../currentdate.service';
import { IndexeddbService } from '../indexeddb.service';
import { SessionstorageserviceService } from "../sessionstorageservice.service"
import { KeyVaultService } from '../key-vault.service';

export interface Tags {
  name: string;
}

export interface Vulns {
  title: string;
  cve: string;
  cvss: number;
  cvss_vector: string;
  desc: string;
  poc: string;
  ref: string;
  severity: string;
  tags: Array<Tags>
}

export interface PCI {
  maincategory: string;
  items: Array<PCIRequirments>;
}

export interface PCIRequirments {
  title: string;
  testing: Array<PCITesting>;
  guidance: string;
}

export interface PCITesting {
  title: string;
}

/**
 * One row in the result list. Every source — the local template library, a
 * remote API library, CWE, MITRE ATT&CK, the OWASP sets, PCI DSS, a CVE or a
 * GHSA lookup — is mapped into this one shape so the list, the staging tray
 * and the issue payload have a single model to work against.
 *
 * `rawtitle` is the title written into the report; `title`/`tag` are the
 * display split (e.g. "CWE-79 - Improper Neutralization…" shows as a CWE-79
 * badge next to the name) and never reach the payload.
 */
export interface ResultItem {
  uid: string;
  src: string;
  tag: string;
  title: string;
  rawtitle: string;
  desc: string;
  severity: string;
  cvss: string;
  cvss_vector: string;
  cve: string;
  ref: string;
  poc: string;
  tags: any[];
  remote: boolean;
  apiname: string;
  custom: boolean;
}

const RECENT_KEY = 'VULNREPO-addissue-recent';
const RECENT_MAX = 20;
const PAGE_SIZE = 60;

/** Sources whose titles carry their own "A01:"-style entry number. */
const PREFIXED_SOURCES = [
  'OWASPTOP2025', 'OWASPTOP2021', 'OWASPTOP2017',
  'OWASPTOP10CICD', 'OWASPTOP10k8s', 'OWASP_mobile',
];

@Component({
  standalone: false,
  selector: 'app-dialog-addissue',
  templateUrl: './dialog-addissue.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dialog-addissue.component.scss'],
})
export class DialogAddissueComponent implements OnInit, AfterViewInit {

  @ViewChild('searchInput') searchInput: ElementRef<HTMLInputElement>;

  // ── raw sources ─────────────────────────────────────────────────────────────
  options: Vulns[] = [];
  optionsv: Vulns[] = [];
  cwe: Vulns[] = [];
  mitremobile: Vulns[] = [];
  mitreenterprise: Vulns[] = [];
  pcidssv3: any;
  owasptop2017: Vulns[] = [];
  owasptop2021: Vulns[] = [];
  owasptop2025: Vulns[] = [];
  OWASPTOP10CICD: Vulns[] = [];
  OWASPTOP10k8s: Vulns[] = [];
  AIVULNS: Vulns[] = [];
  owaspmobile2024: Vulns[] = [];
  reportTemplateList_int: any[] = [];

  // ── source rail ─────────────────────────────────────────────────────────────
  readonly sourceGroups = [
    {
      name: 'My library', items: [
        { value: 'VULNREPO', label: 'VULNRΞPO templates' },
        { value: 'REMOTE', label: 'Remote API templates' },
        { value: 'RECENT', label: 'Recently used' },
      ]
    },
    {
      name: 'Look up by identifier', items: [
        { value: 'CVE', label: 'CVE' },
        { value: 'GHSA', label: 'GitHub Advisory' },
      ]
    },
    {
      name: 'Frameworks & standards', items: [
        { value: 'OWASPTOP2025', label: 'OWASP Top 10 2025' },
        { value: 'OWASPTOP2021', label: 'OWASP Top 10 2021' },
        { value: 'OWASPTOP2017', label: 'OWASP Top 10 2017' },
        { value: 'OWASPTOP10CICD', label: 'OWASP CI/CD Top 10' },
        { value: 'OWASPTOP10k8s', label: 'OWASP Kubernetes Top 10' },
        { value: 'OWASP_mobile', label: 'OWASP Mobile Top 10 2024' },
        { value: 'AIVULNS', label: 'AI systems issues' },
        { value: 'CWE', label: 'CWE research concepts' },
        { value: 'MENTERPRISE', label: 'MITRE ATT&CK Enterprise' },
        { value: 'MMOBILE', label: 'MITRE ATT&CK Mobile' },
        { value: 'PCIDSS', label: 'PCI DSS v3.2.1' },
      ]
    },
  ];

  readonly sourceLabels: Record<string, string> = {};
  readonly sourceShort: Record<string, string> = {
    VULNREPO: 'TEMPLATE', REMOTE: 'REMOTE', RECENT: 'RECENT',
    CVE: 'CVE', GHSA: 'GHSA',
    OWASPTOP2025: 'OWASP', OWASPTOP2021: 'OWASP', OWASPTOP2017: 'OWASP',
    OWASPTOP10CICD: 'CI/CD', OWASPTOP10k8s: 'K8S', OWASP_mobile: 'MOBILE',
    AIVULNS: 'AI', CWE: 'CWE', MENTERPRISE: 'ATT&CK', MMOBILE: 'ATT&CK',
    PCIDSS: 'PCI DSS',
  };
  private readonly tagSuffix: Record<string, string> = {
    OWASPTOP2025: '2025', OWASPTOP2021: '2021', OWASPTOP2017: '2017', OWASP_mobile: '2024',
  };

  /** Sources that are searched, keyed by rail id. CVE/GHSA are lookups, not corpora. */
  corpus: Record<string, ResultItem[]> = {};
  private allItems: ResultItem[] = [];

  // ── view state ──────────────────────────────────────────────────────────────
  scope = 'ALL';
  query = '';
  results: ResultItem[] = [];
  totalMatches = 0;
  limit = PAGE_SIZE;
  expanded = '';
  activeIndex = -1;
  loading = true;
  err_msg = '';

  staged: ResultItem[] = [];
  private existingTitles = new Set<string>();

  // ── identifier lookup ───────────────────────────────────────────────────────
  lookupValue = '';
  lookupError = '';
  lookupBusy = false;
  lookupResult: ResultItem = null;

  dialogData: any = inject(MAT_DIALOG_DATA, { optional: true });

  constructor(public router: Router,
    public dialogRef: MatDialogRef<DialogAddissueComponent>, private http: HttpClient,
    private currentdateService: CurrentdateService,
    private apiService: ApiService, public sessionsub: SessionstorageserviceService,
    private indexeddbService: IndexeddbService, private keyVault: KeyVaultService) {

    this.sourceGroups.forEach(g => g.items.forEach(s => { this.sourceLabels[s.value] = s.label; }));

    if (this.dialogData && Array.isArray(this.dialogData.existing)) {
      this.dialogData.existing.forEach((t: string) => this.existingTitles.add(String(t || '').trim().toLowerCase()));
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.searchInput) { this.searchInput.nativeElement.focus(); }
    });
  }

  /** Ctrl/Cmd+Enter commits the tray from anywhere in the dialog. */
  @HostListener('keydown', ['$event'])
  onDialogKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.addStaged();
    }
  }

  // ── loading ─────────────────────────────────────────────────────────────────
  ngOnInit() {
    this.loading = true;

    this.indexeddbService.retrieveReportTemplates().then(ret => {
      if (ret) {
        this.http.get<any>('/assets/vulns.json?v=' + + new Date()).subscribe(res => {
          this.options = [...ret, ...res];
          this.optionsv = this.options;
          this.buildCorpus();
          this.getAPITemplates();
        });
      }
    });

    this.http.get<any>('/assets/pcidssv3.2.1.json?v=' + + new Date()).subscribe(res => {
      this.pcidssv3 = res;
      this.buildCorpus();
    });

    this.retrieveSourcesTOP10();
  }

  retrieveSourcesTOP10(): void {
    const owasptop2017api = this.http.get<any>('/assets/OWASPtop102017.json?v=' + + new Date());
    const owasptop2021api = this.http.get<any>('/assets/OWASPtop102021.json?v=' + + new Date());
    const owasptop2025api = this.http.get<any>('/assets/OWASPtop102025.json?v=' + + new Date());
    const OWASPTOP10CICDapi = this.http.get<any>('/assets/OWASPtop10cicd.json?v=' + + new Date());
    const OWASPTOP10k8sapi = this.http.get<any>('/assets/OWASPtop10k8s.json?v=' + + new Date());
    const AIVULNSapi = this.http.get<any>('/assets/AIVULNS.json?v=' + + new Date());
    const owaspmobile2024api = this.http.get<any>('/assets/owasp_mobile_2024.json?v=' + + new Date());
    const cweapi = this.http.get<any>('/assets/CWE_V.4.3.json?v=' + + new Date());
    const mitreenterpriseapi = this.http.get<any>('/assets/enterprise-attack.json?v=' + + new Date());
    const mitremobileapi = this.http.get<any>('/assets/mobile-attack.json?v=' + + new Date());

    forkJoin([owasptop2017api, owasptop2021api, owasptop2025api, OWASPTOP10CICDapi, OWASPTOP10k8sapi, AIVULNSapi, owaspmobile2024api, cweapi, mitreenterpriseapi, mitremobileapi])
      .subscribe(
        result => {
          this.owasptop2017 = result[0];
          this.owasptop2021 = result[1];
          this.owasptop2025 = result[2];
          this.OWASPTOP10CICD = result[3];
          this.OWASPTOP10k8s = result[4];
          this.AIVULNS = result[5];
          this.owaspmobile2024 = result[6];
          this.cwe = result[7];
          this.mitreenterprise = result[8];
          this.mitremobile = result[9];
          this.loading = false;
          this.buildCorpus();
        }
      )
  }

  getAPITemplates() {

    const localkey = this.keyVault.getApiVault();
    if (localkey) {

      const vaultobj = JSON.parse(localkey);

      vaultobj.forEach((element) => {

        this.apiService.APISend(element.value, element.apikey, 'getreporttemplates', '').then(resp => {
          this.reportTemplateList_int = [];
          if (resp.length > 0) {
            resp.forEach((ele) => {
              ele.api = 'remote';
              ele.apiurl = element.value;
              ele.apikey = element.apikey;
              ele.apiname = element.viewValue;
            });
            this.reportTemplateList_int.push(...resp);
          }

        }).then(() => {
          this.options = [...this.optionsv, ...this.reportTemplateList_int];
          this.buildCorpus();
        }).catch(() => { });

      });

    }
  }

  // ── corpus ──────────────────────────────────────────────────────────────────

  /**
   * Flattens every loaded source into the one ResultItem shape. Cheap enough to
   * re-run whenever a source finishes loading — they arrive independently.
   */
  private buildCorpus() {
    const c: Record<string, ResultItem[]> = {};

    c['VULNREPO'] = (this.options || []).filter(o => (o as any).api !== 'remote').map((o, i) => this.mapVuln(o, 'VULNREPO', i));
    c['REMOTE'] = (this.options || []).filter(o => (o as any).api === 'remote').map((o, i) => this.mapVuln(o, 'REMOTE', i));
    c['CWE'] = (this.cwe || []).map((o, i) => this.mapVuln(o, 'CWE', i));
    c['MENTERPRISE'] = (this.mitreenterprise || []).map((o, i) => this.mapVuln(o, 'MENTERPRISE', i));
    c['MMOBILE'] = (this.mitremobile || []).map((o, i) => this.mapVuln(o, 'MMOBILE', i));
    c['OWASPTOP2025'] = (this.owasptop2025 || []).map((o, i) => this.mapVuln(o, 'OWASPTOP2025', i));
    c['OWASPTOP2021'] = (this.owasptop2021 || []).map((o, i) => this.mapVuln(o, 'OWASPTOP2021', i));
    c['OWASPTOP2017'] = (this.owasptop2017 || []).map((o, i) => this.mapVuln(o, 'OWASPTOP2017', i));
    c['OWASPTOP10CICD'] = (this.OWASPTOP10CICD || []).map((o, i) => this.mapVuln(o, 'OWASPTOP10CICD', i));
    c['OWASPTOP10k8s'] = (this.OWASPTOP10k8s || []).map((o, i) => this.mapVuln(o, 'OWASPTOP10k8s', i));
    c['OWASP_mobile'] = (this.owaspmobile2024 || []).map((o, i) => this.mapVuln(o, 'OWASP_mobile', i));
    c['AIVULNS'] = (this.AIVULNS || []).map((o, i) => this.mapVuln(o, 'AIVULNS', i));
    c['PCIDSS'] = this.mapPCI();

    this.corpus = c;
    this.allItems = Object.keys(c).reduce((acc, k) => acc.concat(c[k]), [] as ResultItem[]);
    this.corpus['RECENT'] = this.readRecent();

    this.recompute();
  }

  /** Splits a source's own prefix off the title so it can render as a badge. */
  private splitTag(title: string, src: string): { tag: string, rest: string } {
    const t = String(title || '');
    let m = t.match(/^\[([^\]]{1,20})\]\s*(.+)$/);
    if (m && (src === 'MENTERPRISE' || src === 'MMOBILE')) {
      return { tag: m[1], rest: m[2] };
    }
    m = t.match(/^(CWE-\d+)\s*[-–]\s*(.+)$/i);
    if (m && src === 'CWE') {
      return { tag: m[1].toUpperCase(), rest: m[2] };
    }
    // "A01: …", "K01: …", "CICD-SEC-1: …" — only on the sets that number their
    // entries, so a hand-written template called "A1: something" is left alone.
    if (PREFIXED_SOURCES.indexOf(src) >= 0) {
      m = t.match(/^(CICD-SEC-\d{1,2}|[AMK]\d{1,2})\s*:\s*(.+)$/i);
      if (m) {
        const suffix = this.tagSuffix[src];
        return { tag: suffix ? m[1].toUpperCase() + ':' + suffix : m[1].toUpperCase(), rest: m[2] };
      }
    }
    return { tag: this.sourceShort[src] || src, rest: t };
  }

  private mapVuln(o: any, src: string, index: number): ResultItem {
    const raw = String(o.title || '');
    const split = this.splitTag(raw, src);
    return {
      uid: src + '::' + index,
      src: src,
      tag: split.tag,
      title: split.rest,
      rawtitle: raw,
      desc: String(o.desc || ''),
      severity: o.severity || 'Info',
      cvss: (o.cvss === 0 || o.cvss) ? String(o.cvss) : '',
      cvss_vector: o.cvss_vector || '',
      cve: o.cve || '',
      ref: o.ref || '',
      poc: o.poc || '',
      tags: o.tags || [],
      remote: o.api === 'remote',
      apiname: o.apiname || '',
      custom: false,
    };
  }

  /**
   * PCI requirements carry their testing procedures and guidance rather than a
   * description, so they are flattened here the way addPCIDSS() used to build
   * them at commit time.
   */
  private mapPCI(): ResultItem[] {
    const out: ResultItem[] = [];
    if (!this.pcidssv3) { return out; }
    let index = 0;

    for (const group of this.pcidssv3) {
      const reqno = (String(group.maincategory || '').match(/^Requirement\s+(\d+)/i) || [, ''])[1];

      for (const item of (group.items || [])) {
        let tytul = String(item.title || '').split(':')[0];
        if (tytul.length >= 100) { tytul = tytul.substring(0, 100) + '...'; }

        let testing = '';
        (item.testing || []).forEach(t => { testing = testing + t.title + '\n\n'; });

        out.push({
          uid: 'PCIDSS::' + (index++),
          src: 'PCIDSS',
          tag: reqno ? 'REQ ' + reqno : 'PCI DSS',
          title: item.title,
          rawtitle: tytul,
          desc: item.title,
          severity: 'Info',
          cvss: '',
          cvss_vector: '',
          cve: '',
          ref: 'https://www.pcisecuritystandards.org/\nhttps://www.pcisecuritystandards.org/documents/PCI_DSS_v3-2-1.pdf',
          poc: 'Testing:\n\n' + testing + '\nGuidance:\n\n' + (item.guidance || ''),
          tags: [],
          remote: false,
          apiname: '',
          custom: false,
        });
      }
    }
    return out;
  }

  // ── search ──────────────────────────────────────────────────────────────────

  get isLookupScope(): boolean {
    return this.scope === 'CVE' || this.scope === 'GHSA';
  }

  get scopeLabel(): string {
    return this.scope === 'ALL' ? 'all sources' : (this.sourceLabels[this.scope] || this.scope);
  }

  get searchPlaceholder(): string {
    if (this.scope === 'ALL') { return 'XSS, CVE-2024-5961, CWE-79, A03, T1190…'; }
    if (this.scope === 'CWE') { return 'type: CWE-20 or bypass, injection'; }
    if (this.scope === 'MENTERPRISE') { return 'e.g.: DNS Server'; }
    if (this.scope === 'MMOBILE') { return 'e.g.: Application Discovery'; }
    if (this.scope === 'PCIDSS') { return 'e.g. Firewall'; }
    return 'Filter ' + this.scopeLabel;
  }

  get allCount(): number {
    return this.allItems.length;
  }

  sourceCount(src: string): number {
    return (this.corpus[src] || []).length;
  }

  stagedFromSource(src: string): number {
    return this.staged.filter(s => s.src === src).length;
  }

  selectSource(value: string) {
    this.scope = value;
    this.expanded = '';
    this.activeIndex = -1;
    this.lookupError = '';
    this.lookupResult = null;
    this.err_msg = '';
    this.limit = PAGE_SIZE;
    this.recompute();

    if (!this.isLookupScope) {
      setTimeout(() => {
        if (this.searchInput) {
          this.searchInput.nativeElement.value = this.query;
          this.searchInput.nativeElement.focus();
        }
      });
    }
  }

  onSearch(value: string) {
    this.query = value;
    this.limit = PAGE_SIZE;
    this.activeIndex = -1;
    this.recompute();
  }

  clearSearch() {
    this.query = '';
    this.limit = PAGE_SIZE;
    this.activeIndex = -1;
    if (this.searchInput) { this.searchInput.nativeElement.value = ''; }
    this.recompute();
  }

  private pool(): ResultItem[] {
    if (this.scope === 'ALL') { return this.allItems; }
    return this.corpus[this.scope] || [];
  }

  private matched(): ResultItem[] {
    const q = this.query.trim().toLowerCase();
    const pool = this.pool();
    if (!q) { return pool; }
    return pool.filter(it => (it.rawtitle + ' ' + it.tag + ' ' + it.desc + ' ' + it.cve).toLowerCase().indexOf(q) >= 0);
  }

  private recompute() {
    const matched = this.matched();
    this.totalMatches = matched.length;
    this.results = matched.slice(0, this.limit);
  }

  /** Grows the rendered slice as the list is scrolled — no pagination. */
  onListScroll(event: Event) {
    const el = event.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 240 && this.limit < this.totalMatches) {
      this.limit = this.limit + PAGE_SIZE;
      this.recompute();
    }
  }

  onSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex = Math.min(this.activeIndex + 1, this.results.length - 1);
      this.scrollActiveIntoView();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex = Math.max(this.activeIndex - 1, -1);
      this.scrollActiveIntoView();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.activeIndex >= 0 && this.results[this.activeIndex]) {
        this.toggleStage(this.results[this.activeIndex]);
      } else if (this.query.trim()) {
        this.stageCustom();
      }
    }
  }

  private scrollActiveIntoView() {
    setTimeout(() => {
      const row = document.querySelector('.ai-row--active');
      if (row) { row.scrollIntoView({ block: 'nearest' }); }
    });
  }

  // ── staging ─────────────────────────────────────────────────────────────────

  isStaged(uid: string): boolean {
    return this.staged.some(s => s.uid === uid);
  }

  toggleStage(item: ResultItem) {
    if (this.isStaged(item.uid)) {
      this.staged = this.staged.filter(s => s.uid !== item.uid);
    } else {
      this.staged = [...this.staged, { ...item }];
    }
  }

  removeStaged(uid: string) {
    this.staged = this.staged.filter(s => s.uid !== uid);
  }

  clearStaged() {
    this.staged = [];
  }

  stageAllShown() {
    const next = [...this.staged];
    this.matched().forEach(it => { if (!next.some(s => s.uid === it.uid)) { next.push({ ...it }); } });
    this.staged = next;
  }

  /** Free text that matches nothing still becomes an issue — the old chip flow. */
  stageCustom() {
    const title = this.query.trim();
    if (!title) { return; }

    const uid = 'CUSTOM::' + title;
    if (this.isStaged(uid)) { return; }

    this.staged = [...this.staged, {
      uid: uid, src: 'CUSTOM', tag: 'CUSTOM', title: title, rawtitle: title,
      desc: '', severity: 'Info', cvss: '', cvss_vector: '', cve: '', ref: '', poc: '',
      tags: [], remote: false, apiname: '', custom: true,
    }];
  }

  toggleExpand(uid: string, event: Event) {
    event.stopPropagation();
    this.expanded = this.expanded === uid ? '' : uid;
  }

  /**
   * Severity chosen in the expanded row applies to the staged copy, and stages
   * the item if it was not staged yet — changing it is an act of intent.
   */
  setSeverity(item: ResultItem, severity: string) {
    item.severity = severity;
    const idx = this.staged.findIndex(s => s.uid === item.uid);
    if (idx >= 0) {
      const next = [...this.staged];
      next[idx] = { ...next[idx], severity: severity };
      this.staged = next;
    } else {
      this.staged = [...this.staged, { ...item, severity: severity }];
    }
  }

  isDuplicate(item: ResultItem): boolean {
    if (!this.existingTitles.size) { return false; }
    return this.existingTitles.has(item.rawtitle.trim().toLowerCase());
  }

  get duplicateCount(): number {
    return this.staged.filter(s => this.isDuplicate(s)).length;
  }

  severityBreakdown(): string {
    const order = ['Critical', 'High', 'Medium', 'Low', 'Info'];
    const counts: Record<string, number> = {};
    this.staged.forEach(s => { counts[s.severity] = (counts[s.severity] || 0) + 1; });

    // A source can label a severity something else ("None" from a CVE record);
    // list those after the known ones rather than dropping them from the count.
    const rest = Object.keys(counts).filter(k => order.indexOf(k) < 0);
    return order.filter(k => counts[k]).concat(rest).map(k => counts[k] + ' ' + k).join(', ');
  }

  // ── identifier lookup ───────────────────────────────────────────────────────

  onLookupInput(value: string) {
    this.lookupValue = value;
    this.lookupError = '';
  }

  lookup() {
    if (this.scope === 'CVE') { this.lookupCVE(); }
    if (this.scope === 'GHSA') { this.lookupGHSA(); }
  }

  lookupCVE() {
    this.lookupError = '';
    this.lookupResult = null;
    this.err_msg = '';

    const data = (this.lookupValue || '').trim();
    if (!data) {
      this.lookupError = 'Enter a CVE identifier.';
      return;
    }

    if (!/^CVE-\d{4}-\d{4,7}$/i.test(data)) {
      this.lookupError = 'That is not a CVE identifier. The format is CVE-YYYY-NNNN.';
      return;
    }

    this.lookupBusy = true;
    this.apiService.getCVE(data).then(resp => {

      if (resp !== null && resp !== undefined && Object.keys(resp.githubcve).length !== 0) {
        const githubcve = resp.githubcve;
        const githubpoc = resp.githubpoc;

        if (resp.error) {
          this.err_msg = resp.error;
          this.lookupBusy = false;
          return;
        }

        if (githubcve.cveMetadata.cveId) {
          let severity = 'Info';
          let cvss = '';
          const cvssv = '';
          let cvetitle = '';

          if (githubcve.containers.cna.title) {
            cvetitle = githubcve.containers.cna.title;
          }
          if (cvetitle === '' || cvetitle === undefined) {
            cvetitle = githubcve.cveMetadata.cveId;
          }

          if (githubcve.containers.cna.metrics) {
            for (let _i = 0; _i < githubcve.containers.cna.metrics.length; _i++) {
              const ss = Object.keys(githubcve.containers.cna.metrics[_i]);
              for (let x = 0; x < ss.length; x++) {
                if (githubcve.containers.cna.metrics[_i][ss[x]].baseScore !== undefined) {
                  cvss = githubcve.containers.cna.metrics[_i][ss[x]].baseScore;
                }
                if (githubcve.containers.cna.metrics[_i][ss[x]].baseSeverity !== undefined) {
                  const bs = String(githubcve.containers.cna.metrics[_i][ss[x]].baseSeverity).toLowerCase();
                  severity = bs.charAt(0).toUpperCase() + bs.slice(1);
                }
              }
            }
          }

          let refer = '';
          if (githubcve.containers.cna.references) {
            for (let _i = 0; _i < githubcve.containers.cna.references.length; _i++) {
              refer += githubcve.containers.cna.references[_i].url + '\n';
            }
          }

          let pocgithub = '';
          if (githubpoc && githubpoc.items) {
            for (let _i = 0; _i < githubpoc.items.length; _i++) {
              pocgithub += githubpoc.items[_i].html_url + '\n';
            }
          }

          let gdesc = '';
          if (githubcve.containers.cna.descriptions) {
            gdesc = githubcve.containers.cna.descriptions[0].value;
          }

          this.lookupResult = {
            uid: 'CVE::' + githubcve.cveMetadata.cveId,
            src: 'CVE',
            tag: githubcve.cveMetadata.cveId,
            title: cvetitle,
            rawtitle: cvetitle,
            desc: gdesc,
            severity: severity,
            cvss: cvss ? String(cvss) : '',
            cvss_vector: cvssv,
            cve: githubcve.cveMetadata.cveId,
            ref: refer,
            poc: pocgithub,
            tags: [],
            remote: false,
            apiname: '',
            custom: false,
          };
        }

        this.lookupBusy = false;
        if (!this.lookupResult) {
          this.lookupError = data.toUpperCase() + ' came back without a usable record.';
        }

      } else {
        this.lookupBusy = false;
        this.lookupError = data.toUpperCase() + ' was not found.';
      }

    }).catch(() => {
      this.lookupBusy = false;
      this.lookupError = 'The lookup failed. Check your connection and try again.';
    });
  }

  lookupGHSA() {
    this.lookupError = '';
    this.lookupResult = null;
    this.err_msg = '';

    const data = (this.lookupValue || '').trim();
    if (!data) {
      this.lookupError = 'Enter a GHSA identifier.';
      return;
    }

    if (!/GHSA(-[23456789cfghjmpqrvwx]{4}){3}/i.test(data)) {
      this.lookupError = 'That is not a GHSA identifier. The format is GHSA-xxxx-xxxx-xxxx.';
      return;
    }

    this.lookupBusy = true;
    this.apiService.getGHSA(data).then(resp => {

      if (resp !== null && resp !== undefined) {
        let sev = String(resp.severity || 'info');
        if (sev === 'moderate') { sev = 'medium'; }
        sev = sev.charAt(0).toUpperCase() + sev.slice(1);

        this.lookupResult = {
          uid: 'GHSA::' + data.toUpperCase(),
          src: 'GHSA',
          tag: data.toUpperCase(),
          title: resp.summary,
          rawtitle: resp.summary,
          desc: resp.description,
          severity: sev,
          cvss: resp.cvss && resp.cvss.score ? String(resp.cvss.score) : '',
          cvss_vector: resp.cvss ? (resp.cvss.vector_string || '') : '',
          cve: resp.cve_id || '',
          ref: (resp.references || []).join('\n'),
          poc: '',
          tags: [],
          remote: false,
          apiname: '',
          custom: false,
        };
        this.lookupBusy = false;

      } else {
        this.lookupBusy = false;
        this.lookupError = data.toUpperCase() + ' was not found.';
      }

    }).catch(() => {
      this.lookupBusy = false;
      this.lookupError = 'The lookup failed. Check your connection and try again.';
    });
  }

  stageLookup() {
    if (!this.lookupResult) { return; }
    if (!this.isStaged(this.lookupResult.uid)) {
      this.staged = [...this.staged, { ...this.lookupResult }];
    }
    this.lookupResult = null;
    this.lookupValue = '';
  }

  /** A failed lookup still leaves the identifier worth recording. */
  stageUnresolved() {
    const id = (this.lookupValue || '').trim().toUpperCase();
    if (!id) { return; }

    const uid = 'CUSTOM::' + id;
    if (!this.isStaged(uid)) {
      this.staged = [...this.staged, {
        uid: uid, src: 'CUSTOM', tag: this.scope, title: id, rawtitle: id,
        desc: '', severity: 'Info', cvss: '', cvss_vector: '',
        cve: this.scope === 'CVE' ? id : '', ref: '', poc: '',
        tags: [], remote: false, apiname: '', custom: true,
      }];
    }
    this.lookupError = '';
    this.lookupValue = '';
  }

  refLinks(ref: string): string[] {
    return String(ref || '').split('\n').map(r => r.trim()).filter(r => r.length > 0);
  }

  // ── recents ─────────────────────────────────────────────────────────────────

  /** `uid` carries a list position, so recents are keyed by source + title. */
  private recentKey(it: { src: string, rawtitle: string }): string {
    return it.src + ' ' + it.rawtitle;
  }

  private storedRecent(): string[] {
    let keys: any;
    try {
      keys = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch (e) {
      return [];
    }
    return Array.isArray(keys) ? keys.filter(k => typeof k === 'string') : [];
  }

  private readRecent(): ResultItem[] {
    const keys = this.storedRecent();
    if (!keys.length) { return []; }

    const byKey: Record<string, ResultItem> = {};
    this.allItems.forEach(it => { byKey[this.recentKey(it)] = it; });
    return keys.map(k => byKey[k]).filter(it => !!it);
  }

  private writeRecent() {
    const fresh = this.staged
      .filter(s => !s.custom && s.src !== 'CVE' && s.src !== 'GHSA')
      .map(s => this.recentKey(s));
    if (!fresh.length) { return; }

    const merged = fresh.concat(this.storedRecent().filter(k => fresh.indexOf(k) < 0)).slice(0, RECENT_MAX);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(merged));
    } catch (e) { /* storage unavailable — recents are a convenience only */ }
  }

  // ── commit ──────────────────────────────────────────────────────────────────

  private toIssue(it: ResultItem) {
    return {
      title: it.rawtitle,
      poc: it.poc || '',
      files: [],
      desc: it.desc || '',
      severity: it.severity || 'Info',
      status: 1,
      ref: it.ref || '',
      cvss: it.cvss || '',
      cvss_vector: it.cvss_vector || '',
      cve: it.cve || '',
      tags: it.tags || [],
      bounty: [],
      date: this.getcurrentDate()
    };
  }

  addStaged() {
    if (!this.staged.length) { return; }
    this.writeRecent();
    this.dialogRef.close(this.staged.map(s => this.toIssue(s)));
  }

  cancel(): void {
    this.dialogRef.close();
  }

  getcurrentDate(): number {
    return this.currentdateService.getcurrentDate();
  }
}
