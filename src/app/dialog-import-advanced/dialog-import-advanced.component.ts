import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import * as xml2js from 'xml2js';
import { CurrentdateService } from '../currentdate.service';
import { ImportVectorService, ImportVector } from '../import-vector.service';

interface ImportSource {
  value: string;
  viewValue: string;
  viewImg: string;
  format: string;
}

interface OutputField {
  key: string;
  label: string;
  required?: boolean;
  placeholder: string;
  hint: string;
}

@Component({
  standalone: false,
  selector: 'app-dialog-import-advanced',
  templateUrl: './dialog-import-advanced.component.html',
  styleUrls: ['./dialog-import-advanced.component.scss']
})
export class DialogImportAdvancedComponent implements OnInit {

  @ViewChild('stepper') stepper!: MatStepper;

  mode: 'tiles' | 'wizard' = 'tiles';

  sources: ImportSource[] = [
    { value: 'vulnrepojson',  viewValue: 'VULNRΞPO Encrypted',   viewImg: '/favicon-32x32.png',                                  format: '.VULN'   },
    { value: 'decrypted_json',viewValue: 'VULNRΞPO Decrypted',   viewImg: '/favicon-32x32.png',                                  format: '.JSON'   },
    { value: 'burp',          viewValue: 'Burp Suite',            viewImg: '/assets/vendors/burp-logo.png',                       format: '.XML'    },
    { value: 'bugcrowd',      viewValue: 'Bugcrowd',              viewImg: '/assets/vendors/bugcrowd-logo.png',                   format: '.CSV'    },
    { value: 'nmap',          viewValue: 'Nmap',                  viewImg: '/assets/vendors/nmap-logo.png',                       format: '.XML'    },
    { value: 'openvas',       viewValue: 'OpenVAS 9',             viewImg: '/assets/vendors/openvas-logo.png',                    format: '.XML'    },
    { value: 'nessus_xml',    viewValue: 'Nessus',                viewImg: '/assets/vendors/nessus-logo.png',                     format: '.NESSUS' },
    { value: 'nessus',        viewValue: 'Nessus CSV',            viewImg: '/assets/vendors/nessus-logo.png',                     format: '.CSV'    },
    { value: 'trivy',         viewValue: 'Trivy',                 viewImg: '/assets/vendors/trivy-logo.png',                      format: '.JSON'   },
    { value: 'jira_xml',      viewValue: 'Jira',                  viewImg: '/assets/vendors/jira-logo.png',                       format: '.XML'    },
    { value: 'npm_audit',     viewValue: 'NPM Audit',             viewImg: '/assets/vendors/npm-logo.png',                        format: '.JSON'   },
    { value: 'semgrep',       viewValue: 'Semgrep',               viewImg: '/assets/vendors/semgrep-logo.png',                    format: '.JSON'   },
    { value: 'composer',      viewValue: 'Composer',              viewImg: '/assets/vendors/Logo-composer-transparent.png',       format: '.JSON'   },
    { value: 'wiz',           viewValue: 'WIZ',                   viewImg: '/assets/vendors/wiz.jpeg',                            format: '.CSV'    },
    { value: 'zaproxy',       viewValue: 'ZAP',                   viewImg: '/assets/vendors/zap-by-checkmarx.svg',                format: '.JSON'   },
    { value: 'codesight',     viewValue: 'BlackDuck Code Sight',  viewImg: '/assets/vendors/bd.png',                              format: '.JSON'   },
  ];

  // ── Wizard state ────────────────────────────────────────────────────────────

  wizardFormat: 'json' | 'xml' | 'csv' = 'json';
  uploadedFile: File | null = null;
  parsedRaw: any = null;
  parseError = '';
  isLoading = false;

  // Step 2 – structure
  detectedArrayPaths: string[] = [];
  itemsPath = '';
  records: any[] = [];
  availableKeys: string[] = [];
  structurePreview = '';

  // Step 3 – mapping
  readonly outputFields: OutputField[] = [
    { key: 'title',       label: 'Title',              required: true, placeholder: '{{name}}',          hint: 'Required. Will be used as the issue title.' },
    { key: 'desc',        label: 'Description',                        placeholder: '{{description}}',   hint: 'Full description of the vulnerability.' },
    { key: 'poc',         label: 'Proof of Concept',                   placeholder: '{{poc}}',            hint: 'Steps to reproduce, screenshots, evidence.' },
    { key: 'severity',    label: 'Severity',                           placeholder: '{{severity}}',       hint: 'Critical / High / Medium / Low / Info' },
    { key: 'ref',         label: 'References',                         placeholder: '{{references}}',     hint: 'URLs, advisory links (newline-separated).' },
    { key: 'cvss',        label: 'CVSS Score',                         placeholder: '{{cvss_score}}',     hint: 'Numeric score, e.g. 7.5' },
    { key: 'cvss_vector', label: 'CVSS Vector',                        placeholder: '{{cvss_vector}}',    hint: 'CVSS vector string, e.g. AV:N/AC:L/…' },
    { key: 'cve',         label: 'CVE',                                placeholder: '{{cve_id}}',         hint: 'CVE identifier, e.g. CVE-2024-1234' },
    { key: 'tags',        label: 'Tags',                               placeholder: '{{category}},pentest', hint: 'Comma-separated tag names.' },
  ];

  fieldMappings: Record<string, string> = {};
  activeSuggestions: Record<string, string[]> = {};
  showSuggestions: Record<string, boolean> = {};

  // Step 4 – preview & vector
  previewItems: any[] = [];
  vectorName = '';
  vectorSaving = false;
  vectorSaved = false;
  vectorSaveError = '';

  // ── Saved vectors / auto-detect (tiles mode) ──────────────────────────────

  savedVectors: ImportVector[] = [];
  vectorsLoading = false;

  /** Per-vector: the file the user dropped for quick-apply */
  vectorQuickFile: Record<string, File | null> = {};
  vectorQuickLoading: Record<string, boolean> = {};
  vectorQuickError: Record<string, string> = {};

  /** Matched vector from auto-detect drop zone */
  autoDetectFile: File | null = null;
  autoDetectLoading = false;
  autoDetectError = '';
  autoDetectMatch: ImportVector | null = null;
  autoDetectScore = 0;
  autoDetectKeys: string[] = [];
  autoDetectParsedRaw: any = null;

  constructor(
    public dialogRef: MatDialogRef<DialogImportAdvancedComponent>,
    private currentdateService: CurrentdateService,
    private vectorService: ImportVectorService
  ) {}

  ngOnInit() {
    this.outputFields.forEach(f => {
      this.fieldMappings[f.key] = '';
      this.activeSuggestions[f.key] = [];
      this.showSuggestions[f.key] = false;
    });
    this.loadVectors();
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  cancel() { this.dialogRef.close(); }

  selectExistingSource(value: string) {
    this.dialogRef.close({ delegateTo: value });
  }

  openWizard() { this.mode = 'wizard'; }

  backToTiles() {
    this.mode = 'tiles';
    this.resetWizard();
    this.loadVectors();
  }

  resetWizard() {
    this.uploadedFile = null;
    this.parsedRaw = null;
    this.parseError = '';
    this.isLoading = false;
    this.detectedArrayPaths = [];
    this.itemsPath = '';
    this.records = [];
    this.availableKeys = [];
    this.structurePreview = '';
    this.outputFields.forEach(f => {
      this.fieldMappings[f.key] = '';
      this.activeSuggestions[f.key] = [];
      this.showSuggestions[f.key] = false;
    });
    this.previewItems = [];
    this.vectorName = '';
    this.vectorSaved = false;
    this.vectorSaveError = '';
  }

  // ── Saved vectors ──────────────────────────────────────────────────────────

  async loadVectors() {
    this.vectorsLoading = true;
    try {
      this.savedVectors = await this.vectorService.getAll();
      this.savedVectors.sort((a, b) => b.createdAt - a.createdAt);
      this.savedVectors.forEach(v => {
        this.vectorQuickFile[v.id]    = null;
        this.vectorQuickLoading[v.id] = false;
        this.vectorQuickError[v.id]   = '';
      });
    } catch { /* silent */ }
    finally { this.vectorsLoading = false; }
  }

  async deleteVector(id: string) {
    await this.vectorService.delete(id);
    await this.loadVectors();
  }

  /** Format label for a vector card */
  vectorFieldCount(v: ImportVector): number {
    return Object.values(v.fieldMappings).filter(e => e).length;
  }

  // ── Vector quick-apply (tile) ──────────────────────────────────────────────

  onVectorFileSelected(event: Event, vectorId: string) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.vectorQuickFile[vectorId]  = input.files[0];
      this.vectorQuickError[vectorId] = '';
    }
  }

  async applyVectorImport(vector: ImportVector) {
    const file = this.vectorQuickFile[vector.id];
    if (!file) return;
    this.vectorQuickLoading[vector.id] = true;
    this.vectorQuickError[vector.id]   = '';
    try {
      const raw = await this.parseFileByFormat(file, vector.format);
      const recs = this.extractRecords(raw, vector.itemsPath);
      const result = recs.map(r => this.mapRecordWithMappings(r, vector.fieldMappings));
      this.dialogRef.close(result);
    } catch (e: any) {
      this.vectorQuickError[vector.id] = 'Error: ' + (e?.message ?? String(e));
    } finally {
      this.vectorQuickLoading[vector.id] = false;
    }
  }

  // ── Auto-detect drop zone ──────────────────────────────────────────────────

  async onAutoDetectFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.autoDetectFile    = file;
    this.autoDetectError   = '';
    this.autoDetectMatch   = null;
    this.autoDetectScore   = 0;
    this.autoDetectKeys    = [];
    this.autoDetectLoading = true;
    try {
      const fmt = this.guessFormat(file.name);
      this.autoDetectParsedRaw = await this.parseFileByFormat(file, fmt);
      // Detect keys
      const recs = this.extractRecords(this.autoDetectParsedRaw, '');
      if (recs.length > 0) {
        this.autoDetectKeys = this.extractFlatKeys(recs[0], '', 0);
      } else if (Array.isArray(this.autoDetectParsedRaw) && this.autoDetectParsedRaw.length > 0) {
        this.autoDetectKeys = this.extractFlatKeys(this.autoDetectParsedRaw[0], '', 0);
      }
      // Find best match
      const match = this.vectorService.findBestMatch(this.savedVectors, this.autoDetectKeys);
      if (match) {
        this.autoDetectMatch = match;
        this.autoDetectScore = Math.round(this.vectorService.score(match, this.autoDetectKeys) * 100);
      } else {
        this.autoDetectError = 'No matching vector found for this file. Try uploading via a specific vector tile, or use the Custom Import Wizard.';
      }
    } catch (e: any) {
      this.autoDetectError = 'Parse error: ' + (e?.message ?? String(e));
    } finally {
      this.autoDetectLoading = false;
    }
  }

  async applyAutoDetected() {
    if (!this.autoDetectMatch || !this.autoDetectParsedRaw) return;
    const v = this.autoDetectMatch;
    const recs = this.extractRecords(this.autoDetectParsedRaw, v.itemsPath);
    const result = recs.map(r => this.mapRecordWithMappings(r, v.fieldMappings));
    this.dialogRef.close(result);
  }

  private guessFormat(filename: string): 'json' | 'xml' | 'csv' {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'xml' || ext === 'nessus') return 'xml';
    if (ext === 'csv') return 'csv';
    return 'json';
  }

  // ── Shared parse helpers ───────────────────────────────────────────────────

  private async parseFileByFormat(file: File, format: 'json' | 'xml' | 'csv'): Promise<any> {
    const text = await this.readFileAsText(file);
    if (format === 'json')  return JSON.parse(text);
    if (format === 'csv')   return this.parseCSV(text);
    return this.parseXML(text);
  }

  private extractRecords(raw: any, path: string): any[] {
    if (!path || path === '$') {
      // Try root array first, else auto-detect first array property
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === 'object') {
        for (const key of Object.keys(raw)) {
          if (Array.isArray(raw[key]) && raw[key].length > 0) return raw[key];
        }
      }
      return [];
    }
    const val = this.resolvePath(raw, path);
    return Array.isArray(val) ? val : (val ? [val] : []);
  }

  // ── Step 1 – Upload ──────────────────────────────────────────────────────────

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadedFile = input.files[0];
      this.parseError = '';
    }
  }

  async parseUploadedFile() {
    if (!this.uploadedFile) return;
    this.isLoading = true;
    this.parseError = '';
    try {
      const text = await this.readFileAsText(this.uploadedFile);
      if (this.wizardFormat === 'json') {
        this.parsedRaw = JSON.parse(text);
      } else if (this.wizardFormat === 'csv') {
        this.parsedRaw = this.parseCSV(text);
      } else {
        this.parsedRaw = await this.parseXML(text);
      }
      this.detectArrayPaths();
      setTimeout(() => this.stepper?.next(), 0);
    } catch (e: any) {
      this.parseError = 'Parse error: ' + (e?.message ?? String(e));
    } finally {
      this.isLoading = false;
    }
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file, 'UTF-8');
    });
  }

  private parseCSV(text: string): any[] {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return [];
    const parseRow = (line: string): string[] => {
      const fields: string[] = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
          else { inQuote = !inQuote; }
        } else if (ch === ',' && !inQuote) {
          fields.push(cur); cur = '';
        } else {
          cur += ch;
        }
      }
      fields.push(cur);
      return fields;
    };
    const headers = parseRow(lines[0]);
    const records: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = parseRow(lines[i]);
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h.trim()] = values[idx] ?? ''; });
      records.push(obj);
    }
    return records;
  }

  private parseXML(text: string): Promise<any> {
    return new Promise((resolve, reject) => {
      xml2js.parseString(text, { explicitArray: false, mergeAttrs: true }, (err: any, result: any) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  // ── Step 2 – Structure ───────────────────────────────────────────────────────

  private detectArrayPaths() {
    this.detectedArrayPaths = [];
    if (Array.isArray(this.parsedRaw)) {
      this.detectedArrayPaths.push('$');
    }
    this.findArrayPaths(this.parsedRaw, '', 0);
    const pretty = JSON.stringify(this.parsedRaw, null, 2);
    this.structurePreview = pretty.length > 2000 ? pretty.slice(0, 2000) + '\n…' : pretty;
    if (this.detectedArrayPaths.length > 0) {
      this.applyItemsPath(this.detectedArrayPaths[0]);
    }
  }

  private findArrayPaths(obj: any, prefix: string, depth: number) {
    if (depth > 5 || !obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    for (const key of Object.keys(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const val = obj[key];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        this.detectedArrayPaths.push(path);
      }
      this.findArrayPaths(val, path, depth + 1);
    }
  }

  applyItemsPath(path: string) {
    this.itemsPath = path;
    if (path === '$') {
      this.records = Array.isArray(this.parsedRaw) ? this.parsedRaw : [];
    } else {
      const val = this.resolvePath(this.parsedRaw, path);
      this.records = Array.isArray(val) ? val : (val ? [val] : []);
    }
    if (this.records.length > 0) {
      this.availableKeys = this.extractFlatKeys(this.records[0], '', 0);
    }
  }

  private extractFlatKeys(obj: any, prefix: string, depth: number): string[] {
    if (depth > 4 || !obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
    const keys: string[] = [];
    for (const key of Object.keys(obj)) {
      const full = prefix ? `${prefix}.${key}` : key;
      keys.push(full);
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        keys.push(...this.extractFlatKeys(obj[key], full, depth + 1));
      }
    }
    return keys;
  }

  goToMapping() {
    this.applyItemsPath(this.itemsPath);
    setTimeout(() => this.stepper?.next(), 0);
  }

  // ── Step 3 – Mapping ────────────────────────────────────────────────────────

  onMappingInput(fieldKey: string) {
    const expr = this.fieldMappings[fieldKey] ?? '';
    const m = expr.match(/\{\{([^}]*)$/);
    if (m) {
      const partial = m[1].toLowerCase();
      this.activeSuggestions[fieldKey] = this.availableKeys
        .filter(k => k.toLowerCase().includes(partial))
        .slice(0, 10);
      this.showSuggestions[fieldKey] = this.activeSuggestions[fieldKey].length > 0;
    } else {
      this.showSuggestions[fieldKey] = false;
    }
  }

  insertSuggestion(fieldKey: string, key: string) {
    const expr = this.fieldMappings[fieldKey] ?? '';
    this.fieldMappings[fieldKey] = expr.replace(/\{\{([^}]*)$/, `{{${key}}}`);
    this.showSuggestions[fieldKey] = false;
  }

  dismissSuggestions(fieldKey: string) {
    setTimeout(() => { this.showSuggestions[fieldKey] = false; }, 150);
  }

  evaluateExpression(expr: string, record: any): string {
    if (!expr || !record) return '';
    return expr.replace(/\{\{([^}]+)\}\}/g, (_m, inner) => {
      const [rawPath, rawFilter] = inner.split('|');
      const val = this.resolvePath(record, rawPath.trim());
      let str =
        val === undefined || val === null ? '' :
        Array.isArray(val) ? val.map((v: any) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ') :
        String(val);
      const filter = rawFilter?.trim();
      if (filter) {
        if (filter === 'upper') str = str.toUpperCase();
        else if (filter === 'lower') str = str.toLowerCase();
        else if (filter === 'trim') str = str.trim();
        else if (filter.startsWith('default:')) { if (!str) str = filter.slice(8); }
        else if (filter.startsWith('prefix:')) str = filter.slice(7) + str;
        else if (filter.startsWith('suffix:')) str = str + filter.slice(7);
        else if (filter.startsWith('replace:')) {
          const parts = filter.slice(8).split(':');
          if (parts.length >= 2) str = str.split(parts[0]).join(parts[1]);
        }
      }
      return str;
    });
  }

  resolvePath(obj: any, path: string): any {
    if (!path || obj == null) return undefined;
    return path.split('.').reduce((cur, key) => {
      if (cur == null) return undefined;
      const m = key.match(/^(.+)\[(\d+)\]$/);
      return m ? cur[m[1]]?.[+m[2]] : cur[key];
    }, obj);
  }

  getLivePreview(fieldKey: string): string {
    if (!this.records.length || !this.fieldMappings[fieldKey]) return '';
    return this.evaluateExpression(this.fieldMappings[fieldKey], this.records[0]);
  }

  buildPreview() {
    this.previewItems = this.records.slice(0, 5).map(r => this.mapRecord(r));
    setTimeout(() => this.stepper?.next(), 0);
  }

  // ── Step 4 – Preview, Vector & Import ──────────────────────────────────────

  /** Serialised view of the current wizard config shown as a vector block */
  get vectorConfig(): string {
    const lines: string[] = [
      `format:     ${this.wizardFormat.toUpperCase()}`,
      `items_path: ${this.itemsPath || '$'}`,
      `mappings:`,
    ];
    this.outputFields.forEach(f => {
      const expr = this.fieldMappings[f.key];
      if (expr) lines.push(`  ${f.key.padEnd(12)} → ${expr}`);
    });
    return lines.join('\n');
  }

  async saveVector() {
    if (!this.vectorName.trim()) return;
    this.vectorSaving   = true;
    this.vectorSaveError = '';
    try {
      await this.vectorService.save({
        name:          this.vectorName.trim(),
        format:        this.wizardFormat,
        itemsPath:     this.itemsPath,
        fieldMappings: { ...this.fieldMappings },
        sampleKeys:    [...this.availableKeys],
      });
      this.vectorSaved = true;
      this.vectorName  = '';
    } catch (e: any) {
      this.vectorSaveError = 'Could not save: ' + (e?.message ?? String(e));
    } finally {
      this.vectorSaving = false;
    }
  }

  private mapRecord(record: any): any {
    return this.mapRecordWithMappings(record, this.fieldMappings);
  }

  private mapRecordWithMappings(record: any, mappings: Record<string, string>): any {
    const tagsExpr = mappings['tags'];
    let tags: { name: string }[] = [{ name: 'custom-import' }];
    if (tagsExpr) {
      const raw = this.evaluateExpression(tagsExpr, record);
      const parsed = raw.split(',').map((t: string) => t.trim()).filter((t: string) => t).map((t: string) => ({ name: t }));
      if (parsed.length > 0) tags = parsed;
    }
    return {
      title:       this.evaluateExpression(mappings['title'],       record),
      desc:        this.evaluateExpression(mappings['desc'],        record),
      poc:         this.evaluateExpression(mappings['poc'],         record),
      severity:    this.evaluateExpression(mappings['severity'],    record) || 'Info',
      ref:         this.evaluateExpression(mappings['ref'],         record),
      cvss:        this.evaluateExpression(mappings['cvss'],        record),
      cvss_vector: this.evaluateExpression(mappings['cvss_vector'], record),
      cve:         this.evaluateExpression(mappings['cve'],         record),
      tags,
      files:   [],
      status:  1,
      bounty:  [],
      date:    this.currentdateService.getcurrentDate()
    };
  }

  doImport() {
    const result = this.records.map(r => this.mapRecord(r));
    this.dialogRef.close(result);
  }
}
