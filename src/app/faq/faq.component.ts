import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

export type FaqCatId = 'basics' | 'security' | 'reports' | 'integrations';
export type FaqTone = 'accent' | 'warn' | 'danger' | 'neutral';

/** One inline fragment of an answer: plain text, a link, inline code or bold. */
export interface FaqRun {
  t: string;
  href?: string;
  code?: boolean;
  b?: boolean;
}

export interface FaqBullet {
  badge?: string;
  tone?: FaqTone;
  runs: FaqRun[];
}

export interface FaqBlock {
  kind: 'p' | 'bullets' | 'links' | 'code';
  runs?: FaqRun[];
  items?: FaqBullet[];
  links?: { label: string, href: string }[];
  text?: string;
}

export interface FaqEntry {
  /** Stable anchor id — /faq?q=<id> links live in settings, report and the wild. */
  id: string;
  cat: FaqCatId;
  /** Short label for the sidebar and the copy-link confirmation. */
  short: string;
  title: string;
  /** Synonyms a reader might search for that the prose does not contain. */
  tags?: string;
  blocks: FaqBlock[];
  /** Lower-cased searchable text, built from everything above in ngOnInit. */
  haystack?: string;
}

export interface FaqGroup {
  id: FaqCatId;
  label: string;
  items: FaqEntry[];
}

@Component({
  standalone: false,
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent implements OnInit, AfterViewInit, OnDestroy {

  readonly categories: { id: FaqCatId, label: string }[] = [
    { id: 'basics', label: 'Basics' },
    { id: 'security', label: 'Security & keys' },
    { id: 'reports', label: 'Reports & export' },
    { id: 'integrations', label: 'Integrations' }
  ];

  readonly entries: FaqEntry[] = [

    // ── Basics ────────────────────────────────────────────────────────────────
    {
      id: 'Browser-support', cat: 'basics',
      short: 'Browser support',
      title: 'Which browsers are supported?',
      tags: 'incognito private window chromium',
      blocks: [
        { kind: 'p', runs: [
          { t: 'VULNREPO runs on the current version of every major browser. ' },
          { t: 'Private browsing mode is not supported', b: true },
          { t: ' — IndexedDB is discarded when the window closes, so reports would be lost.' }
        ] },
        { kind: 'bullets', items: [
          { runs: [{ t: 'Google Chrome' }] },
          { runs: [{ t: 'Mozilla Firefox' }] },
          { runs: [{ t: 'Microsoft Edge (Chromium)' }] },
          { runs: [{ t: 'iOS Safari and Chrome' }] },
          { runs: [{ t: 'Android Chrome' }] }
        ] }
      ]
    },
    {
      id: 'Displaying-attachments', cat: 'basics',
      short: 'Attachments in HTML',
      title: 'How are attachments shown in the HTML report?',
      tags: 'screenshot evidence file embed',
      blocks: [
        { kind: 'p', runs: [
          { t: 'Images and ' },
          { t: '.txt', code: true },
          { t: ' files are embedded inline. Every other file type is rendered as a download link.' }
        ] }
      ]
    },
    {
      id: 'VULN-VULNR', cat: 'basics',
      short: '.VULN vs .VULNR',
      title: 'What is the difference between .VULN and .VULNR?',
      tags: 'extension file format export import difference',
      blocks: [
        { kind: 'p', runs: [{ t: 'Two file extensions, two scopes:' }] },
        { kind: 'bullets', items: [
          { badge: '.VULN', tone: 'neutral', runs: [{ t: 'Issues only — useful for moving findings between reports.' }] },
          { badge: '.VULNR', tone: 'neutral', runs: [{ t: 'The full report — issues, metadata, author, scope and settings.' }] }
        ] }
      ]
    },
    {
      id: 'What-is-the-issue-status', cat: 'basics',
      short: 'Issue status',
      title: 'What does each issue status mean?',
      tags: 'retest remediation triage workflow',
      blocks: [
        { kind: 'p', runs: [{ t: 'Status tracks where a finding sits in the fix cycle. It is visible to the researcher and in the delivered report.' }] },
        { kind: 'bullets', items: [
          { badge: 'Open', tone: 'danger', runs: [{ t: 'Reported, waiting for review.' }] },
          { badge: 'Fix in progress', tone: 'warn', runs: [{ t: 'Acknowledged, remediation under way.' }] },
          { badge: 'Fixed', tone: 'accent', runs: [{ t: 'Remediated and retested.' }] },
          { badge: 'Won’t fix', tone: 'neutral', runs: [{ t: 'Accepted as a risk, or out of scope.' }] }
        ] }
      ]
    },

    // ── Security & keys ───────────────────────────────────────────────────────
    {
      id: 'How-are-reports-stored', cat: 'security',
      short: 'Where reports live',
      title: 'How and where are reports stored?',
      tags: 'indexeddb offline cloud privacy data at rest',
      blocks: [
        { kind: 'p', runs: [
          { t: 'Encrypted reports are written to the browser’s ' },
          { t: 'IndexedDB', b: true },
          { t: ' on your machine. By default nothing leaves the browser.' }
        ] },
        { kind: 'p', runs: [
          { t: 'Decryption keys are held in short-lived ' },
          { t: 'memory only', b: true },
          { t: ' — they are never written to sessionStorage, localStorage or any other persistent medium.' }
        ] },
        { kind: 'p', runs: [
          { t: 'Reports can also be kept on a database or server you control. Encryption still happens in the browser, so the server never sees plaintext.' }
        ] },
        { kind: 'links', links: [
          { label: 'API integration guide', href: 'https://github.com/kac89/vulnrepo/blob/master/API-INTEGRATION.md' },
          { label: 'Video tutorial', href: 'https://www.youtube.com/watch?v=cW_kVPtUJbU' }
        ] }
      ]
    },
    {
      id: 'Key-lifetime-auto-lock', cat: 'security',
      short: 'Key lifetime & auto-lock',
      title: 'When is my decryption key cleared?',
      tags: 'idle timeout inactivity vault wipe relock unattended',
      blocks: [
        { kind: 'p', runs: [{ t: 'Decryption passwords live only in memory and are never persisted to browser storage. The key vault clears itself automatically when any of these happens:' }] },
        { kind: 'bullets', items: [
          { badge: 'Tab hidden', tone: 'neutral', runs: [{ t: 'Switching away from the tab clears the vault immediately.' }] },
          { badge: 'Tab closed', tone: 'neutral', runs: [{ t: 'The vault is wiped before the page unloads or reloads.' }] },
          { badge: '15 min idle', tone: 'neutral', runs: [{ t: 'The timer resets on any keyboard, mouse or touch input.' }] }
        ] },
        { kind: 'p', runs: [{ t: 'After the vault clears, re-opening a report asks for the password again. This keeps decryption keys out of browser developer tools and off any disk dump.' }] }
      ]
    },
    {
      id: 'Key-Storage-Security-Level', cat: 'security',
      short: 'Key storage level',
      title: 'Why am I asked for my key again after switching tabs?',
      tags: 'prompt asking again annoying re-enter mode setting',
      blocks: [
        { kind: 'p', runs: [
          { t: 'Because you are on the default ' },
          { t: 'Secure', b: true },
          { t: ' mode, which clears keys the moment the tab loses focus. ' },
          { t: 'Settings → Key Storage Security Level', b: true },
          { t: ' offers two modes:' }
        ] },
        { kind: 'bullets', items: [
          { badge: 'Secure', tone: 'accent', runs: [
            { t: 'Memory only (default). Keys never touch browser storage, so they cannot be read from developer tools or recovered from a disk dump. The vault clears on tab switch, 15-minute idle or reload.' }
          ] },
          { badge: 'Legacy', tone: 'warn', runs: [
            { t: 'Keys are persisted in ' },
            { t: 'sessionStorage', code: true },
            { t: ' and survive tab switches and reloads until the tab is closed. More convenient, but readable in developer tools for as long as the session lives.' }
          ] }
        ] },
        { kind: 'p', runs: [{ t: 'Switch modes in Settings if the re-prompting is disruptive — but choose it knowing the trade-off.' }] }
      ]
    },
    {
      id: 'I-forgot-my-security-key', cat: 'security',
      short: 'Forgot the key',
      title: 'I forgot my security key — can the report be recovered?',
      tags: 'lost password reset recover bruteforce backdoor',
      blocks: [
        { kind: 'p', runs: [{ t: 'No. There is no recovery path, no backdoor and no reset: the key never leaves your browser, so nobody — including this project — can decrypt the report without it. Bruteforcing your own report is the only remaining option.' }] }
      ]
    },
    {
      id: 'Can-I-change-report-security-key', cat: 'security',
      short: 'Change the key',
      title: 'Can I change a report’s security key?',
      tags: 'rotate re-encrypt new password',
      blocks: [
        { kind: 'p', runs: [{ t: 'Yes, as long as you can still decrypt the report with the current key. The report is then re-encrypted under the new one.' }] }
      ]
    },

    // ── Reports & export ──────────────────────────────────────────────────────
    {
      id: 'How-to-create-PDF-report', cat: 'reports',
      short: 'Create a PDF',
      title: 'How do I create a PDF report?',
      tags: 'print export deliverable latex',
      blocks: [
        { kind: 'p', runs: [{ t: 'Two routes, depending on how much control you need:' }] },
        { kind: 'bullets', items: [
          { badge: 'Simple', tone: 'accent', runs: [
            { t: 'Download the HTML report, open it and use the browser’s ' },
            { t: 'Print to PDF', b: true },
            { t: ' — ' },
            { t: 'Ctrl+P', code: true }
          ] },
          { badge: 'Advanced', tone: 'neutral', runs: [
            { t: 'Download the report as JSON and render it through a LaTeX template for full control over the layout.' }
          ] }
        ] },
        { kind: 'links', links: [
          { label: 'vulnrepo-json-to-latex-pdf', href: 'https://github.com/kac89/vulnrepo-json-to-latex-pdf' },
          { label: 'Video tutorial', href: 'https://www.youtube.com/watch?v=cW_kVPtUJbU' },
          { label: 'Print to PDF in Chrome', href: 'https://www.google.com/search?q=print%20to%20pdf%20how%20to%20chrome' },
          { label: 'Print to PDF in Firefox', href: 'https://www.google.com/search?q=print%20to%20pdf%20how%20to%20firefox%20browser' }
        ] }
      ]
    },
    {
      id: 'Report-Profiles', cat: 'reports',
      short: 'Report profiles',
      title: 'Can I reuse settings across reports?',
      tags: 'template defaults preset save configuration',
      blocks: [
        { kind: 'p', runs: [
          { t: 'Yes. ' },
          { t: 'Report Profiles', b: true },
          { t: ' in Settings save a reusable set of report settings that you can apply to new or existing reports.' }
        ] },
        { kind: 'links', links: [
          { label: 'Video tutorial', href: 'https://www.youtube.com/watch?v=cW_kVPtUJbU' }
        ] }
      ]
    },

    // ── Integrations ──────────────────────────────────────────────────────────
    {
      id: 'API', cat: 'integrations',
      short: 'External storage',
      title: 'Can I store encrypted reports on my own server?',
      tags: 'self-hosted sync backend team share database',
      blocks: [
        { kind: 'p', runs: [{ t: 'Yes — a local or a remote server both work. Point VULNREPO at it and the already-encrypted reports are stored there; encryption happens in the browser, so the server never sees plaintext.' }] },
        { kind: 'links', links: [
          { label: 'vulnrepo-server', href: 'https://github.com/kac89/vulnrepo-server' },
          { label: 'API integration guide', href: 'https://github.com/kac89/vulnrepo/blob/master/API-INTEGRATION.md' },
          { label: 'Video tutorial', href: 'https://www.youtube.com/watch?v=cW_kVPtUJbU' }
        ] }
      ]
    },
    {
      id: 'API-VAULT', cat: 'integrations',
      short: 'API VAULT',
      title: 'What is the API VAULT?',
      tags: 'aes credentials token endpoint secret',
      blocks: [
        { kind: 'p', runs: [{ t: 'A single AES-encrypted store holding all your API configurations, so endpoints and tokens are never kept in the clear. You have one VAULT, and it covers every API you have configured.' }] }
      ]
    },
    {
      id: 'Search-CVE', cat: 'integrations',
      short: 'CVE search (NVD)',
      title: 'What does CVE Search (NVD) do?',
      tags: 'nist lookup vulnerability database cvss import',
      blocks: [
        { kind: 'p', runs: [{ t: 'It queries the public NVD API and pulls CVE details straight into a finding, so you do not have to copy descriptions and scores by hand.' }] },
        { kind: 'links', links: [
          { label: 'NVD database', href: 'https://nvd.nist.gov/vuln' }
        ] }
      ]
    },
    {
      id: 'Private-LLM', cat: 'integrations',
      short: 'Private LLM',
      title: 'How do I connect a private LLM?',
      tags: 'ai ollama local model llama offline assistant cors',
      blocks: [
        { kind: 'p', runs: [
          { t: 'Run a model locally with ' },
          { t: 'Ollama', href: 'https://ollama.com' },
          { t: ' and allow this origin to reach it.' }
        ] },
        { kind: 'bullets', items: [
          { badge: 'Step 1', tone: 'neutral', runs: [
            { t: 'Install ' },
            { t: 'ollama.com', href: 'https://ollama.com' },
            { t: '.' }
          ] },
          { badge: 'Step 2', tone: 'neutral', runs: [
            { t: 'Download and run a model — ' },
            { t: 'ollama run llama3.2:latest', code: true },
            { t: ' — or browse the ' },
            { t: 'model library', href: 'https://ollama.com/search' },
            { t: '.' }
          ] },
          { badge: 'Step 3', tone: 'neutral', runs: [
            { t: 'Allow additional web origins so the browser may call Ollama. For vulnrepo.com, set ' },
            { t: 'OLLAMA_ORIGINS=https://vulnrepo.com', code: true }
          ] }
        ] },
        { kind: 'links', links: [
          { label: 'Ollama: allowing web origins', href: 'https://github.com/ollama/ollama/blob/main/docs/faq.md#how-can-i-allow-additional-web-origins-to-access-ollama' }
        ] }
      ]
    }
  ];

  searchQuery = '';
  category: FaqCatId | 'all' = 'all';
  activeSection = '';
  highlightId = '';

  /** Answers passing both the search and the topic filter, in reading order. */
  visible: FaqEntry[] = [];
  /** The same set, grouped for the sidebar — empty groups dropped. */
  groups: FaqGroup[] = [];
  /** Result counts per chip, keyed by category id plus 'all'. */
  counts: { [key: string]: number } = {};

  private open = new Set<string>();
  private subs = new Subscription();
  private spy: IntersectionObserver;
  private highlightTimer: any;

  @ViewChild('searchInput') private searchInput: ElementRef<HTMLInputElement>;
  @ViewChildren('entrySection') private sections: QueryList<ElementRef<HTMLElement>>;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private zone: NgZone
  ) { }

  ngOnInit(): void {

    this.entries.forEach(entry => { entry.haystack = this.buildHaystack(entry); });
    this.applyFilters();

    this.subs.add(this.activatedRoute.queryParams.subscribe(params => {
      const id: string = params['q'];
      if (!id || id === this.activeSection) { return; }
      if (!this.entries.some(entry => entry.id === id)) { return; }

      this.open.add(id);
      this.activeSection = id;
      this.highlight(id);
      this.scheduleScroll(id);
    }));

  }

  ngAfterViewInit(): void {
    this.observeSections();
    this.subs.add(this.sections.changes.subscribe(() => this.observeSections()));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    clearTimeout(this.highlightTimer);
    if (this.spy) { this.spy.disconnect(); }
  }

  // ── Search & filtering ──────────────────────────────────────────────────────

  onSearch(value: string): void {
    this.searchQuery = value;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
    this.focusSearch();
  }

  selectCategory(cat: FaqCatId | 'all'): void {
    this.category = cat;
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.category = 'all';
    this.applyFilters();
  }

  focusSearch(): void {
    if (this.searchInput) {
      this.searchInput.nativeElement.focus();
      this.searchInput.nativeElement.select();
    }
  }

  get noResults(): boolean {
    return this.visible.length === 0;
  }

  /**
   * Every whitespace-separated term has to appear somewhere in the answer —
   * its title, its prose, its badges, its link labels or its extra tags.
   */
  private applyFilters(): void {

    const terms = this.searchQuery.trim().toLowerCase().split(/\s+/).filter(term => term.length > 0);

    const byText = terms.length
      ? this.entries.filter(entry => terms.every(term => entry.haystack.indexOf(term) !== -1))
      : this.entries.slice();

    this.counts = { all: byText.length };
    this.categories.forEach(cat => {
      this.counts[cat.id] = byText.filter(entry => entry.cat === cat.id).length;
    });

    this.visible = byText.filter(entry => this.category === 'all' || entry.cat === this.category);

    this.groups = this.categories
      .map(cat => ({
        id: cat.id,
        label: cat.label,
        items: this.visible.filter(entry => entry.cat === cat.id)
      }))
      .filter(group => group.items.length > 0);

    // A search that lands on exactly one answer opens it — no second click.
    if (terms.length > 0 && this.visible.length === 1) {
      this.open.add(this.visible[0].id);
    }
  }

  private buildHaystack(entry: FaqEntry): string {

    const parts: string[] = [entry.title, entry.short, entry.tags || ''];

    entry.blocks.forEach(block => {
      if (block.runs) { parts.push(block.runs.map(run => run.t).join('')); }
      if (block.items) {
        block.items.forEach(item => {
          if (item.badge) { parts.push(item.badge); }
          parts.push(item.runs.map(run => run.t).join(''));
        });
      }
      if (block.links) { parts.push(block.links.map(link => link.label).join(' ')); }
      if (block.text) { parts.push(block.text); }
    });

    return parts.join(' ').toLowerCase();
  }

  // ── Open / collapse ─────────────────────────────────────────────────────────

  isOpen(id: string): boolean {
    return this.open.has(id);
  }

  toggle(id: string): void {
    if (this.open.has(id)) {
      this.open.delete(id);
    } else {
      this.open.add(id);
      this.activeSection = id;
    }
  }

  get anyOpen(): boolean {
    return this.visible.some(entry => this.open.has(entry.id));
  }

  toggleAll(): void {
    if (this.anyOpen) {
      this.visible.forEach(entry => this.open.delete(entry.id));
    } else {
      this.visible.forEach(entry => this.open.add(entry.id));
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  goto(id: string): void {
    this.open.add(id);
    this.activeSection = id;
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { q: id },
      replaceUrl: true
    });
    this.scheduleScroll(id);
  }

  copyLink(entry: FaqEntry, event: Event): void {
    event.stopPropagation();
    const url = window.location.origin + '/faq?q=' + entry.id;
    navigator.clipboard.writeText(url)
      .then(() => this.notify('Link to “' + entry.short + '” copied to clipboard', true))
      .catch(() => this.notify('Could not access the clipboard.', false));
  }

  categoryLabel(cat: FaqCatId): string {
    const found = this.categories.find(item => item.id === cat);
    return found ? found.label : '';
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {

    const target = event.target as HTMLElement;
    const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.focusSearch();
      return;
    }

    if (event.key === 'Escape' && this.searchQuery && this.searchInput && target === this.searchInput.nativeElement) {
      this.searchQuery = '';
      this.applyFilters();
    }
  }

  /**
   * Keeps the sidebar marker on whichever answer is nearest the top of the
   * viewport, instead of on whatever was last deep-linked.
   */
  private observeSections(): void {

    if (typeof IntersectionObserver === 'undefined' || !this.sections) { return; }

    if (this.spy) {
      this.spy.disconnect();
    } else {
      this.spy = new IntersectionObserver(records => {
        const top = records
          .filter(record => record.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) {
          this.zone.run(() => { this.activeSection = top.target.id; });
        }
      }, { rootMargin: '-120px 0px -60% 0px', threshold: 0 });
    }

    this.sections.forEach(ref => this.spy.observe(ref.nativeElement));
  }

  /**
   * Waits for the answer's body to be laid out before scrolling. Measuring on
   * the collapsed height decides "already visible" on the wrong geometry, and
   * clamps against a page that is about to get taller.
   */
  private scheduleScroll(id: string): void {
    if (typeof requestAnimationFrame === 'undefined') {
      setTimeout(() => this.scrollTo(id), 0);
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => this.scrollTo(id)));
  }

  /**
   * Scrolls the one container that actually scrolls — `mat-sidenav-content` —
   * and leaves the page alone when the answer is already on screen.
   *
   * scrollIntoView() is not usable here: it scrolls every scrollable ancestor,
   * so it dragged the window down by the toolbar's height as well, which lifted
   * `.container` out from under the navbar even for answers needing no scroll.
   */
  private scrollTo(id: string): void {

    const node = document.getElementById(id);
    if (!node) { return; }

    const scroller = this.scrollParent(node);
    const isDocument = scroller === document.documentElement || scroller === document.body;

    const nodeRect = node.getBoundingClientRect();
    const viewTop = isDocument ? 0 : scroller.getBoundingClientRect().top;
    const viewBottom = isDocument ? window.innerHeight : scroller.getBoundingClientRect().bottom;

    // Offset for the fixed toolbar, matching .faq-entry's scroll-margin-top.
    const offset = 100;
    const top = nodeRect.top - viewTop;

    // Already sitting clear of the toolbar and fully visible — don't move.
    if (top >= offset && nodeRect.bottom <= viewBottom) { return; }

    const target = scroller.scrollTop + top - offset;

    if (isDocument) {
      window.scrollTo({ top: Math.max(target, 0), behavior: 'smooth' });
    } else {
      scroller.scrollTo({ top: Math.max(target, 0), behavior: 'smooth' });
    }
  }

  /** Nearest ancestor that really scrolls, falling back to the document. */
  private scrollParent(node: HTMLElement): HTMLElement {

    let el = node.parentElement;

    while (el) {
      const overflowY = getComputedStyle(el).overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        return el;
      }
      el = el.parentElement;
    }

    return (document.scrollingElement || document.documentElement) as HTMLElement;
  }

  private highlight(id: string): void {
    this.highlightId = id;
    clearTimeout(this.highlightTimer);
    this.highlightTimer = setTimeout(() => { this.highlightId = ''; }, 2500);
  }

  private notify(message: string, ok: boolean): void {
    this.snackBar.open(message, 'OK', {
      duration: 4000,
      panelClass: [ok ? 'notify-snackbar-success' : 'notify-snackbar-fail']
    });
  }

}
