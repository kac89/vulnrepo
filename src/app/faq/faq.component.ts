import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  standalone: false,
  //imports: [],
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent implements OnInit {

  searchQuery = '';
  activeSection = '';

  private sectionKeywords: Record<string, string[]> = {
    'Browser-support':               ['browser', 'support', 'chrome', 'firefox', 'edge', 'safari', 'android', 'ios'],
    'How-are-reports-stored':        ['stored', 'storage', 'indexeddb', 'session', 'local', 'data', 'reports'],
    'How-to-create-PDF-report':      ['pdf', 'report', 'print', 'latex', 'create', 'export'],
    'I-forgot-my-security-key':      ['forgot', 'security', 'key', 'decrypt', 'bruteforce', 'restore', 'encrypted'],
    'Can-I-change-report-security-key': ['change', 'security', 'key', 'report'],
    'Displaying-attachments':        ['attachments', 'images', 'inline', 'download', 'display', 'files', 'txt'],
    'VULN-VULNR':                    ['vuln', 'vulnr', 'difference', 'extension', 'issues', 'metadata'],
    'What-is-the-issue-status':      ['issue', 'status', 'open', 'fixed', 'progress', 'review', 'won\'t fix'],
    'API':                           ['external', 'storage', 'api', 'server', 'database', 'encrypted'],
    'API-VAULT':                     ['vault', 'api', 'aes', 'encrypted', 'configuration', 'credentials'],
    'Report-Profiles':               ['profiles', 'settings', 'configuration', 'reusable', 'save', 'template'],
    'Search-CVE':                    ['cve', 'search', 'nvd', 'database', 'vulnerability', 'nist'],
    'Private-LLM':                   ['llm', 'ollama', 'local', 'model', 'ai', 'private', 'language model'],
  };

  constructor(private activatedRoute: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {

    this.activatedRoute.queryParams.subscribe(params => {
      const param: string = params['q'];
      if (param) {
        this.activeSection = param;
        this.scroll(param);
      }
    });

  }

  sectionVisible(id: string): boolean {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return true;
    const keywords = this.sectionKeywords[id] || [];
    return keywords.some(k => k.includes(q));
  }

  get noResults(): boolean {
    if (!this.searchQuery.trim()) return false;
    return Object.keys(this.sectionKeywords).every(id => !this.sectionVisible(id));
  }

  scroll(id: string) {

    const node = document.getElementById(id);
    const yourHeight = 105 + 20;

    if (node) {
      node.scrollIntoView(true);

      // now account for fixed header
      const scrolledY = window.scrollY;
      if (scrolledY) {
        window.scroll(0, scrolledY - yourHeight);
      }

      // highlight the targeted section
      node.classList.add('faq-item--highlighted');
      setTimeout(() => node.classList.remove('faq-item--highlighted'), 2500);
    }

  }

}
