import { Component, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { XMLParser } from 'fast-xml-parser';
import { UntypedFormControl } from '@angular/forms';
import { CurrentdateService } from '../currentdate.service';
import { ImportVectorService, ImportVector } from '../import-vector.service';
import { UtilsService } from '../utils.service';
import { CryptoUtilsService } from '../crypto-utils.service';
import { SarifService } from '../sarif.service';

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
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dialog-import-advanced.component.scss']
})
export class DialogImportAdvancedComponent implements OnInit {

  @ViewChild('stepper') stepper!: MatStepper;

  mode: 'tiles' | 'wizard' | 'source' = 'tiles';

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
    { value: 'sarif',         viewValue: 'SARIF 2.1.0',           viewImg: '/assets/vendors/sarif.svg',                           format: '.SARIF'  },
  ];

  // ── Source-upload sub-mode state ───────────────────────────────────────────
  selectedSource = '';
  sourceBusy = false;
  sourceError = '';

  // .VULN encrypted password flow
  vulnFile: File | null = null;
  hidePassword = true;
  vulnWrongPass = false;

  // Nmap option
  removeStateDownIps = true;

  // Semgrep option
  mergeperpath = new UntypedFormControl(true);

  // ── Wizard state ────────────────────────────────────────────────────────────

  wizardFormat: 'json' | 'xml' | 'csv' = 'json';
  uploadedFile: File | null = null;
  parsedRaw: any = null;
  parseError = '';
  isLoading = false;

  // Step 2 – structure
  detectedArrayPaths: string[] = [];
  itemsPaths: string[] = [];
  itemsPathDraft = '';
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
    private vectorService: ImportVectorService,
    private utilsService: UtilsService,
    private cryptoUtils: CryptoUtilsService,
    private sarifService: SarifService
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
    this.selectedSource = value;
    this.mode = 'source';
    this.resetSourceState();
  }

  openWizard() { this.mode = 'wizard'; }

  backToTiles() {
    this.mode = 'tiles';
    this.resetWizard();
    this.resetSourceState();
    this.loadVectors();
  }

  private resetSourceState() {
    this.sourceBusy = false;
    this.sourceError = '';
    this.vulnFile = null;
    this.hidePassword = true;
    this.vulnWrongPass = false;
  }

  resetWizard() {
    this.uploadedFile = null;
    this.parsedRaw = null;
    this.parseError = '';
    this.isLoading = false;
    this.detectedArrayPaths = [];
    this.itemsPaths = [];
    this.itemsPathDraft = '';
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
      const recs = this.extractRecordsMulti(raw, this.vectorPaths(vector));
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
    const recs = this.extractRecordsMulti(this.autoDetectParsedRaw, this.vectorPaths(v));
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

  /** Union of records across multiple paths (used at import time for stored vectors). */
  private extractRecordsMulti(raw: any, paths: string[]): any[] {
    if (!paths || paths.length === 0) return this.extractRecords(raw, '');
    const out: any[] = [];
    for (const p of paths) out.push(...this.extractRecords(raw, p));
    return out;
  }

  /** Read either the new itemsPaths array or fall back to the legacy itemsPath. */
  private vectorPaths(v: ImportVector): string[] {
    if (v.itemsPaths && v.itemsPaths.length > 0) return v.itemsPaths;
    return v.itemsPath ? [v.itemsPath] : [];
  }

  // ── Source-upload helpers ──────────────────────────────────────────────────

  get sourceMeta(): ImportSource | undefined {
    return this.sources.find(s => s.value === this.selectedSource);
  }

  private readSourceFile(input: HTMLInputElement, parseFn: (text: string) => void) {
    const files = input.files;
    if (!files || !files.length) return;
    this.sourceBusy = true;
    this.sourceError = '';
    const fileReader = new FileReader();
    fileReader.onload = () => {
      try {
        parseFn(fileReader.result as string);
      } catch (e: any) {
        this.sourceBusy = false;
        this.sourceError = 'Parse error: ' + (e?.message ?? String(e));
      }
    };
    fileReader.onerror = () => {
      this.sourceBusy = false;
      this.sourceError = 'Failed to read file.';
    };
    fileReader.readAsText(files[0], 'UTF-8');
  }

  // ── .VULN encrypted ────────────────────────────────────────────────────────

  vulnFileChanged(e: any) {
    this.vulnFile = e.target.files[0];
    this.vulnWrongPass = false;
  }

  startVulnUpload(pass: string) {
    if (!pass || !this.vulnFile) return;
    this.sourceBusy = true;
    this.vulnWrongPass = false;
    const fileReader = new FileReader();
    fileReader.onload = () => this.decryptVulnrepoJson(fileReader.result, pass);
    fileReader.readAsText(this.vulnFile, 'UTF-8');
  }

  private async decryptVulnrepoJson(json: any, pass: string) {
    try {
      const plaintext = await this.cryptoUtils.decrypt(json.toString(), pass);
      const decryptedData = JSON.parse(plaintext);
      if (decryptedData) {
        this.dialogRef.close(decryptedData);
      }
    } catch {
      this.sourceBusy = false;
      this.vulnWrongPass = true;
    }
  }

  // ── Decrypted JSON ─────────────────────────────────────────────────────────

  decryptedJsonOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => {
      const data = JSON.parse(text);
      if (data) this.dialogRef.close(data);
    });
  }

  // ── Nessus CSV ─────────────────────────────────────────────────────────────

  nessusCsvOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => this.parseNessusCsv(text));
  }

  private parseNessusCsv(csvData: string): void {
    const allTextLines = (csvData || '').split(/\r\n/);
    const headers = allTextLines[0].split(',');
    const lines: any[] = [];

    for (let i = 0; i < allTextLines.length; i++) {
      const data = allTextLines[i].split('","');
      const tarr: any[] = [];
      for (let j = 0; j < headers.length; j++) {
        tarr.push(data[j]);
      }
      lines.push(tarr);
    }

    const unique = (array: any[], propertyName: any) =>
      array.filter((e, i) => array.findIndex(a => a[propertyName] === e[propertyName]) === i);

    const group_issues = (array: any[]) => {
      const ret: any[] = [];
      array.forEach((item: any) => {
        ret.forEach((retit: any) => {
          if (retit[0] === item[0]) {
            if (retit[1] !== '') {
              retit[1] = retit[1] + ',' + item[1];
            }
            if (retit[4] !== item[4]) {
              if (retit[4] !== '') {
                const doesContains = retit[4].match(item[4]);
                if (doesContains !== null) {
                  // already contains
                } else {
                  if (item[6] === '0') {
                    retit[4] = retit[4] + '\n' + item[4];
                  } else {
                    retit[4] = retit[4] + '\n' + item[5] + '://' + item[4] + ':' + item[6];
                  }
                }
              }
            }
          }
        });

        if (item[6] !== '0') {
          item[4] = item[5] + '://' + item[4] + ':' + item[6];
        }
        ret.push(item);
      });
      return ret;
    };

    const parsedCsv2 = group_issues(lines);
    const parsedCsv = unique(parsedCsv2, 0);
    const info = parsedCsv.map((res: any) => ({
      title: res[7],
      poc: res[4],
      files: [],
      desc: res[8] + '\n\n' + res[9],
      severity: res[3],
      ref: res[11],
      cvss: res[2],
      cvss_vector: '',
      cve: res[1],
      tags: [{ name: 'nessus' }],
      status: 1,
      bounty: [],
      date: this.currentdateService.getcurrentDate()
    }));

    info.splice(info.length - 1, 1);
    info.splice(0, 1);
    this.dialogRef.close(info);
  }

  // ── Bugcrowd CSV ───────────────────────────────────────────────────────────

  bugcrowdOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => this.parseBugcrowd(text));
  }

  private parseBugcrowd(csvData: string) {
    let m: any;
    const issuelist: any[] = [];
    let text = (csvData || '').substring((csvData || '').indexOf('\n') + 1);
    text = text.replace(/, /g, '. ');

    const setseverity = (severity: string) => {
      if (severity === '5') return 'Info';
      if (severity === '4') return 'Low';
      if (severity === '3') return 'Medium';
      if (severity === '2') return 'High';
      if (severity === '1') return 'Critical';
      return severity;
    };

    const regex = /(.*),(.*),(.*),(.*),(.*),(.*),([\S\s]*?),([\S\s]*?),(.*),(.*),(.*),(.*),(.*)/gm;
    while ((m = regex.exec(text)) !== null) {
      if (m.index === regex.lastIndex) regex.lastIndex++;
      issuelist.push({
        title: m[4],
        poc: m[6] + '\n\n' + m[8],
        files: [],
        desc: m[7],
        severity: setseverity(m[11]),
        ref: 'https://bugcrowd.com/vulnerability-rating-taxonomy',
        cvss: '',
        cvss_vector: '',
        cve: '',
        tags: [{ name: 'bugcrowd' }],
        status: 1,
        bounty: [],
        date: this.currentdateService.getcurrentDate()
      });
    }
    this.dialogRef.close(issuelist);
  }

  // ── Burp Suite XML ─────────────────────────────────────────────────────────

  burpOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => this.parseBurp(text));
  }

  private parseBurp(xml: string) {
    const returnhost = (host: any[], path: any[]) => {
      let ret = '';
      host.forEach((res: any, key: number) => {
        ret = ret + res.$.ip + ' ' + res._ + path[key] + '\n';
      });
      return ret;
    };

    const setcvss = (severity: string) => {
      if (severity === 'High') return 8;
      if (severity === 'Medium') return 5;
      if (severity === 'Low') return 2;
      return 0;
    };

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', attributesGroupName: '$', textNodeName: '_', isArray: (_n: string, jpath: any) => typeof jpath === 'string' && jpath.includes('.'), trimValues: true, parseTagValue: false, parseAttributeValue: false });
    const xmltojson: any[] = parser.parse(xml).issues.issue;

    const emp: any[] = [];
    xmltojson.forEach((res: any) => {
      if (!emp.find(x => x.serialNumber[0] === res.serialNumber[0])) {
        emp.push(res);
      } else {
        const index = emp.findIndex(x => x.serialNumber[0] === res.serialNumber[0]);
        emp[index].location.push(res.location[0]);
        emp[index].path.push(res.path[0]);
        emp[index].host.push(res.host[0]);
      }
    });

    const info = emp.map((res: any) => {
      const item = res.vulnerabilityClassifications !== undefined ? this.utilsService.removeHTMLTags(res.vulnerabilityClassifications[0]) : '';
      const itempoc = res.issueDetail !== undefined ? this.utilsService.removeHTMLTags(res.issueDetail[0]) : '';
      const itemrem = res.remediationBackground !== undefined ? this.utilsService.removeHTMLTags(res.remediationBackground[0]) : '';
      const itemback = res.issueBackground !== undefined ? this.utilsService.removeHTMLTags(res.issueBackground[0]) : '';
      if (res.severity[0] === 'Information') res.severity[0] = 'Info';

      return {
        title: res.name[0],
        poc: returnhost(res.host, res.path),
        files: [],
        desc: itempoc + '\n\n' + itemback + '\n\n' + itemrem,
        severity: res.severity[0],
        ref: item,
        cvss: setcvss(res.severity[0]),
        cvss_vector: '',
        cve: '',
        tags: [{ name: 'burp' }],
        status: 1,
        bounty: [],
        date: this.currentdateService.getcurrentDate()
      };
    });

    this.dialogRef.close(info);
  }

  // ── OpenVAS 9 XML ──────────────────────────────────────────────────────────

  openvasOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => this.parseOpenvas9(text));
  }

  private parseOpenvas9(xml: string) {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', attributesGroupName: '$', textNodeName: '_', isArray: (_n: string, jpath: any) => typeof jpath === 'string' && jpath.includes('.'), trimValues: true, parseTagValue: false, parseAttributeValue: false });
    const result = parser.parse(xml);
    let xmltojson: any[] = [];
    if (result.report !== undefined) {
      if (result.report.report) {
        xmltojson = result.report.report;
      }
    } else {
      if (result.get_results_response !== undefined) {
        this.parseOpenvasxml(result.get_results_response.result);
      }
    }

    (xmltojson || []).forEach((myObject: any) => {
      if (myObject.results) {
        myObject.results.forEach((myarrdeep: any) => {
          this.parseOpenvasxml(myarrdeep.result);
        });
      }
    });
  }

  private parseOpenvasxml(xml: any) {
    const isarr = (arr: any) => Array.isArray(arr);

    const info = xml.map((res: any) => {
      let zref = '';
      if (res.nvt[0].xref || res.nvt[0].refs) {
        const references = res.nvt[0].xref ?? res.nvt[0].refs[0].ref;
        references.forEach((value: any) => {
          if (value.$.id) zref = zref + value.$.id + '\n';
        });
      }

      let res_name = '';
      if (isarr(res.name) === true) res_name = res.name[0];
      if (isarr(res.name) === false) res_name = res.name;

      let res_desc = '';
      if (isarr(res.description) === true) res_desc = res.description[0];
      if (isarr(res.description) === false) res_desc = res.description;

      if (res.threat[0] === 'Log') res.threat[0] = 'Info';

      return {
        title: res_name,
        poc: res.port[0] + '\n\n' + res.host[0]._,
        files: [],
        desc: res_desc,
        severity: res.threat[0],
        ref: zref,
        cvss: res.severity[0],
        cvss_vector: '',
        cve: '',
        tags: [{ name: 'openvas' }],
        status: 1,
        bounty: [],
        date: this.currentdateService.getcurrentDate()
      };
    });

    this.dialogRef.close(info);
  }

  // ── Nessus XML (.nessus) ───────────────────────────────────────────────────

  nessusXmlOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => this.parseNessusXml(text));
  }

  private parseNessusXml(xml: string) {
    const getSafe = (fn: () => any, defaultVal: any) => {
      try { return fn(); } catch { return defaultVal; }
    };

    const issues: any[] = [];
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', attributesGroupName: '$', textNodeName: '_', isArray: (_n: string, jpath: any) => typeof jpath === 'string' && jpath.includes('.'), trimValues: true, parseTagValue: false, parseAttributeValue: false });
    const xmltojson: any[] = parser.parse(xml).NessusClientData_v2.Report;

    (xmltojson || []).forEach((myObject: any) => {
      if (myObject.ReportHost) {
        myObject.ReportHost.forEach((myarrdeep: any) => {
          myarrdeep.ReportItem.forEach((itemissue: any) => {
            const arr: Array<{ ip: string; port: string; protocol: string; hostfqdn: string; hostname: string; pluginout: string }> = [
              {
                ip: myarrdeep.$.name,
                port: itemissue.$.port,
                protocol: itemissue.$.protocol,
                hostfqdn: getSafe(() => myarrdeep.HostProperties[0].tag[2]._, ''),
                hostname: getSafe(() => myarrdeep.HostProperties[0].tag[14]._, ''),
                pluginout: itemissue.plugin_output
              }
            ];
            issues.push([itemissue.$.pluginName, itemissue.$.pluginID, arr, itemissue.cvss_base_score, itemissue.solution, itemissue.description, itemissue.cve, itemissue.see_also, itemissue.risk_factor]);
          });
        });
      }
    });

    const uniq_items: any[] = [];
    issues.forEach((myissues: any) => {
      if (!uniq_items.some(item => item[1] === myissues[1])) {
        uniq_items.push(myissues);
      } else {
        const ind = uniq_items.findIndex(x => x[1] === myissues[1]);
        uniq_items[ind][2].push(myissues[2]);
      }
    });

    const info = uniq_items.map((res: any) => {
      if (res[8].toString() === 'Information') res[8] = 'Info';
      if (res[8].toString() === 'None') { res[8] = 'Info'; res[3] = '0'; }

      let out_hosts = 'IP List:\n\n';
      res[2].forEach((myObject: any) => {
        if (myObject.ip !== undefined) {
          let port = '';
          if (myObject.port.toString() === '0') port = '';
          else port = 'Port: ' + myObject.protocol + '/' + myObject.port;
          if (myObject.hostname.toString() === 'true') myObject.hostname = '';
          out_hosts = out_hosts + myObject.ip + ' ' + myObject.hostname + ' ' + port + '\n';
        } else {
          let port = '';
          if (myObject[0].port.toString() === '0') port = '';
          else port = 'Port: ' + myObject[0].protocol + '/' + myObject[0].port;
          if (myObject[0].hostname.toString() === 'true') myObject[0].hostname = '';
          out_hosts = out_hosts + myObject[0].ip + ' ' + myObject[0].hostname + ' ' + port + '\n';
        }
      });

      let out_ip = 'Output:\n\n';
      res[2].forEach((myObject: any) => {
        if (myObject.ip !== undefined) {
          let port = '';
          if (myObject.port.toString() === '0') port = '';
          else port = 'Port: ' + myObject.protocol + '/' + myObject.port;
          if (myObject.hostname.toString() === 'true') myObject.hostname = '';
          if (myObject.pluginout === undefined) myObject.pluginout = '';
          out_ip = out_ip + '===\n' + myObject.ip + '\n' + myObject.hostname + '\n' + port + '\n\n' + myObject.pluginout + '\n\n';
        } else {
          let port = '';
          if (myObject[0].port.toString() === '0') port = '';
          else port = 'Port: ' + myObject[0].protocol + '/' + myObject[0].port;
          if (myObject[0].hostname.toString() === 'true') myObject[0].hostname = '';
          if (myObject[0].pluginout === undefined) myObject[0].pluginout = '';
          out_ip = out_ip + '===\n' + myObject[0].ip + '\n' + myObject[0].hostname + '\n' + port + '\n\n' + myObject[0].pluginout + '\n\n';
        }
      });

      res[3] = getSafe(() => res[3], '0');
      if (res[7] === undefined) res[7] = '';
      if (res[5] === undefined) res[5] = '';

      return {
        title: res[0],
        poc: out_hosts + '\n\n' + out_ip,
        files: [],
        desc: res[5],
        severity: res[8].toString(),
        ref: res[7],
        cvss: res[3],
        cvss_vector: '',
        cve: '',
        tags: [{ name: 'nessus' }],
        status: 1,
        bounty: [],
        date: this.currentdateService.getcurrentDate()
      };
    });

    this.dialogRef.close(info);
  }

  // ── Nmap XML ───────────────────────────────────────────────────────────────

  nmapOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => this.parseNmap(text));
  }

  private parseNmap(xml: string) {
    let hosts: any[] = [];
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', attributesGroupName: '$', textNodeName: '_', isArray: (_n: string, jpath: any) => typeof jpath === 'string' && jpath.includes('.'), trimValues: true, parseTagValue: false, parseAttributeValue: false });
    const parseResult = parser.parse(xml);
    const json = parseResult.nmaprun;
    hosts = parseResult.nmaprun.host;

    if (this.removeStateDownIps) {
      hosts = hosts.filter((el: any) => el.status[0]['$'].state === 'up');
    }

    const info = hosts.map((res: any) => {
      let addre = '';
      if (res.address[0]['$'].addr !== undefined) addre = res.address[0]['$'].addr + ' ';

      let hostt = '';
      if (res.hostnames && res.hostnames[0].hostname && res.hostnames[0].hostname[0]['$'].name !== undefined) {
        hostt = ' - ' + res.hostnames[0].hostname[0]['$'].name;
      }

      let cmd = '';
      if (json['$'].args !== undefined) cmd = 'Execute: ' + json['$'].args + '\n\n';

      let status = '';
      let ipstat = '';
      if (res.status && res.status[0]['$'].state !== undefined) {
        status = 'IP: ' + res.address[0]['$'].addr + '\nStatus: ' + res.status[0]['$'].state + '\nReason: ' + res.status[0]['$'].reason + '\nReason TTL: ' + res.status[0]['$'].reason_ttl + '\n';
        ipstat = ' (' + res.status[0]['$'].state + ')';
      }

      let ports = 'Open ports:\n';
      let filteredports = '';
      if (res.ports) {
        if (res.ports[0].port !== undefined) {
          res.ports[0].port.forEach((myObject: any) => {
            let service = '';
            let service_name = '';
            if (myObject.service !== undefined && myObject.service[0]['$'].name !== undefined) service_name = myObject.service[0]['$'].name;
            let service_product = '';
            if (myObject.service !== undefined && myObject.service[0]['$'].product !== undefined) service_product = myObject.service[0]['$'].product;
            service = service_product === '' ? service_name : service_name + ' - ' + service_product;
            ports = ports + myObject['$'].protocol + '/' + myObject['$'].portid + ' - ' + service + '\n';
          });
        }
        if (res.ports[0].extraports !== undefined) {
          const title = '\nFiltered ports:\n';
          res.ports[0].extraports.forEach((myObject: any) => {
            filteredports = myObject['$'].state + '/' + myObject['$'].count + '\n';
          });
          filteredports = title + filteredports;
        }
      }

      let osdetect = '';
      if (res.os && res.os[0].osmatch !== undefined) {
        const title = '\n====================\nOS detection:\n';
        res.os[0].osmatch.forEach((myObject: any) => {
          osdetect = osdetect + myObject['$'].name + ' - ' + myObject['$'].accuracy + '% \n';
        });
        osdetect = title + osdetect;
      }

      return {
        title: 'Nmap scan for: ' + addre + hostt + ipstat,
        poc: ports + filteredports + osdetect + '',
        files: [],
        desc: cmd + status + '',
        severity: 'Info',
        ref: 'https://nmap.org/',
        cvss: '',
        cvss_vector: '',
        cve: '',
        tags: [{ name: 'nmap' }],
        status: 1,
        bounty: [],
        date: this.currentdateService.getcurrentDate()
      };
    });

    this.dialogRef.close(info);
  }

  // ── Trivy JSON ─────────────────────────────────────────────────────────────

  trivyOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => this.parseTrivy(text));
  }

  private parseTrivy(json: string) {
    const data = JSON.parse(json);
    const issuelist: any[] = [];

    const setseverity = (severity: string) => {
      if (severity === 'INFO') return 'Info';
      if (severity === 'LOW') return 'Low';
      if (severity === 'MEDIUM') return 'Medium';
      if (severity === 'HIGH') return 'High';
      if (severity === 'CRITICAL') return 'Critical';
      return severity;
    };

    data.Results.forEach((myObject: any) => {
      const intvulns: any[] = [];
      myObject.Vulnerabilities.forEach((myObject2: any) => {
        if (Object.values(intvulns).indexOf(myObject2.VulnerabilityID) > -1) return;
        const reff = myObject2.References.join('\n');
        let cvss = '';
        if (typeof myObject2.CVSS !== 'undefined' && typeof myObject2.CVSS.nvd !== 'undefined') {
          cvss = myObject2.CVSS.nvd.V3Score;
        }

        issuelist.push({
          title: myObject2.Title,
          poc: 'Target: ' + myObject.Target + '\nClass: ' + myObject.Class + '\nType: ' + myObject.Type + '\nPkgID: ' + myObject2.PkgID + '\nPkgName: ' + myObject2.PkgName + '\nInstalled Version: ' + myObject2.InstalledVersion + '\nFixed Version: ' + myObject2.FixedVersion + '\n',
          files: [],
          desc: myObject2.Description,
          severity: setseverity(myObject2.Severity),
          ref: reff,
          cvss,
          cvss_vector: '',
          cve: '',
          tags: [{ name: 'trivy' }],
          status: 1,
          bounty: [],
          date: this.currentdateService.getcurrentDate()
        });
        intvulns.push(myObject2.VulnerabilityID);
      });
    });

    this.dialogRef.close(issuelist);
  }

  // ── Jira XML ───────────────────────────────────────────────────────────────

  jiraOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => this.parseJiraxml(text));
  }

  private parseJiraxml(xml: string) {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', attributesGroupName: '$', textNodeName: '_', isArray: (_n: string, jpath: any) => typeof jpath === 'string' && jpath.includes('.'), trimValues: true, parseTagValue: false, parseAttributeValue: false });
    const xmltojson: any[] = parser.parse(xml).rss.channel[0].item;

    const info = xmltojson.map((res: any) => {
      if (res.priority[0]._.toString() === 'Blocker') res.priority[0]._ = 'Critical';
      if (res.priority[0]._.toString() === 'Major') res.priority[0]._ = 'High';
      if (res.priority[0]._.toString() === 'Minor') res.priority[0]._ = 'Medium';
      if (res.priority[0]._.toString() === 'Trivial') res.priority[0]._ = 'Low';

      const rrr = res.description[0].split('POC:');
      let nn2: any = '';
      if (rrr[1] == undefined) nn2 = rrr[0].split('\n\n');
      else nn2 = rrr[1].split('\n\n');

      if (nn2[0] === rrr[0]) rrr[0] = '';

      const html_desc = this.utilsService.removeHTMLTags(rrr[0]);
      const html_poc = this.utilsService.removeHTMLTags(nn2[0]);

      const exref = res.description[0].split('Reference:');
      let refn: any = '';
      if (exref[1] == undefined) refn = exref[0].split('\n\n');
      else refn = exref[1].split('\n\n');
      if (exref[0] === nn2[0]) refn = '';
      if (exref[0] === rrr[0]) refn = '';

      const html_ref = this.utilsService.removeHTMLTags(refn);

      return {
        title: res.summary[0],
        poc: html_poc,
        files: [],
        desc: html_desc,
        severity: res.priority[0]._,
        ref: html_ref + '\n' + res.link[0],
        cvss: '',
        cvss_vector: '',
        cve: '',
        tags: [{ name: 'jira' }],
        status: 1,
        bounty: [],
        date: this.currentdateService.getcurrentDate()
      };
    });

    this.dialogRef.close(info);
  }

  // ── NPM Audit JSON ─────────────────────────────────────────────────────────

  npmAuditOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => this.parseNpmAudit(text));
  }

  private parseNpmAudit(json: string) {
    const data = JSON.parse(json);
    if (!data.vulnerabilities) return;

    const setseverity = (severity: any) => {
      if (severity === 'moderate') severity = 'Medium';
      if (typeof severity !== 'string' || severity.length === 0) return 'Info';
      return severity.charAt(0).toUpperCase() + severity.slice(1);
    };

    const arr: any[] = [];
    for (const [, value] of Object.entries<any>(data.vulnerabilities)) {
      if (!value) continue;
      value['via'].forEach((item: any) => {
        if (typeof item !== 'object' || item === null) return;
        arr.push({
          title: item.name + ' ' + item.range + ' ' + item.title,
          poc: 'Result of execution command: $ npm audit --json',
          files: [],
          desc: 'Full description on: ' + item.url,
          severity: setseverity(item.severity),
          ref: item.url,
          cvss: '',
          cvss_vector: '',
          cve: '',
          tags: [{ name: 'npm-audit' }],
          status: 1,
          bounty: [],
          date: this.currentdateService.getcurrentDate()
        });
      });
    }

    this.dialogRef.close(arr);
  }

  // ── Semgrep JSON ───────────────────────────────────────────────────────────

  semgrepOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => this.parseSemgrep(text));
  }

  private parseSemgrep(json: string) {
    const setseverity = (severity: any) => {
      if (severity === 'HIGH') return 'High';
      if (severity === 'MEDIUM') return 'Medium';
      if (severity === 'LOW') return 'Low';
      return severity;
    };

    const gethigherseverity = (array: any[]) => {
      if (array.includes('HIGH')) return 'High';
      if (array.includes('MEDIUM')) return 'Medium';
      if (array.includes('LOW')) return 'Low';
      return '';
    };

    const data = JSON.parse(json);

    if (this.mergeperpath.value) {
      const groupBy = (x: any[], f: any) => x.reduce((a: any, b: any, i: any) => ((a[f(b, i, x)] ||= []).push(b), a), {});
      const grouped = groupBy(data.results, (v: any) => v.path);
      const arr: any[] = [];
      for (const [key, value] of Object.entries<any>(grouped)) {
        const ref: any[] = [];
        const poc: any[] = [];
        const desc: any[] = [];
        const severity: any[] = [];
        const vuln_class: any[] = [];

        if (value) {
          for (const [, subvalue] of Object.entries<any>(value)) {
            if (!ref.includes(subvalue['extra']['metadata']['source'])) ref.push(subvalue['extra']['metadata']['source']);
            if (!poc.includes(subvalue['path'] + ':' + subvalue['start']['line'] + '\n\n`' + subvalue['extra']['lines'] + '`')) {
              poc.push(subvalue['path'] + ':' + subvalue['start']['line'] + '\n\n`' + subvalue['extra']['lines'].replaceAll('`', "'") + '`');
            }
            if (!desc.includes(subvalue['extra']['message'])) desc.push(subvalue['extra']['message']);
            if (!severity.includes(subvalue['extra']['metadata']['impact'])) severity.push(subvalue['extra']['metadata']['impact']);
            if (!vuln_class.includes(subvalue['extra']['metadata']['vulnerability_class'].join(', '))) {
              vuln_class.push(subvalue['extra']['metadata']['vulnerability_class'].join(', '));
            }
          }
        }

        arr.push({
          title: 'File: ' + key + ' ' + vuln_class.join(', '),
          poc: poc.join('\n\n'),
          files: [],
          desc: desc.join('\n\n'),
          severity: gethigherseverity(severity),
          ref: ref.join('\n'),
          status: 1,
          cvss: '',
          cvss_vector: '',
          cve: '',
          tags: [{ name: 'semgrep' }],
          bounty: [],
          date: this.currentdateService.getcurrentDate()
        });
      }
      this.dialogRef.close(arr);
    } else {
      const arr: any[] = [];
      for (const [, value] of Object.entries<any>(data.results)) {
        if (!value) continue;
        arr.push({
          title: value['check_id'],
          poc: value['path'] + ':' + value['start']['line'] + '\n\n`' + value['extra']['lines'] + '`',
          files: [],
          desc: value['extra']['message'],
          severity: setseverity(value['extra']['metadata']['impact']),
          ref: value['extra']['metadata']['source'],
          status: 1,
          cvss: '',
          cvss_vector: '',
          cve: '',
          tags: [{ name: 'semgrep' }],
          bounty: [],
          date: this.currentdateService.getcurrentDate()
        });
      }
      this.dialogRef.close(arr);
    }
  }

  // ── Composer audit JSON ────────────────────────────────────────────────────

  composerOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => this.parseComposer(text));
  }

  private parseComposer(json: string) {
    const data = JSON.parse(json);
    const setseverity = (severity: any) => {
      if (severity === 'critical') return 'Critical';
      if (severity === 'high') return 'High';
      if (severity === 'medium') return 'Medium';
      if (severity === 'low') return 'Low';
      if (severity === 'none') return 'Info';
      return severity;
    };

    const arr: any[] = [];
    for (const [, value] of Object.entries<any>(data.advisories)) {
      if (!value) continue;
      for (const [, subvalue] of Object.entries<any>(value)) {
        if (!subvalue) continue;
        arr.push({
          title: subvalue.title,
          poc: 'Package Name: ' + subvalue.packageName + '\nAffected Versions: ' + subvalue.affectedVersions,
          files: [],
          desc: 'All details information: ' + subvalue.link,
          severity: setseverity(subvalue.severity),
          ref: subvalue.link,
          status: 1,
          cvss: '',
          cvss_vector: '',
          cve: subvalue.cve,
          tags: [{ name: 'composer' }],
          bounty: [],
          date: this.currentdateService.getcurrentDate()
        });
      }
    }

    this.dialogRef.close(arr);
  }

  // ── ZAProxy JSON ───────────────────────────────────────────────────────────

  zaproxyOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => this.parseZaproxy(text));
  }

  private parseZaproxy(json: string) {
    const data = JSON.parse(json);
    const setseverity = (severity: any) => {
      if (severity === '4') return 'Critical';
      if (severity === '3') return 'High';
      if (severity === '2') return 'Medium';
      if (severity === '1') return 'Low';
      if (severity === '0') return 'Info';
      return severity;
    };

    const stripHtml = (html: string) => this.utilsService.removeHTMLTags(html);
    const parseRef = (html: string) => this.utilsService.removeHTMLTags(html.replaceAll('</p><p>', '</p>\n<p>'));

    const arr: any[] = [];
    for (const [, value] of Object.entries<any>(data.site)) {
      if (!value) continue;
      for (const [, subvalue] of Object.entries<any>(value['alerts'])) {
        if (!subvalue) continue;
        let scopedesc = '';
        if (subvalue['instances']) {
          scopedesc = 'Request header:\n' + subvalue['instances'][0]['method'] + ' ' + subvalue['instances'][0]['uri'];
        }
        arr.push({
          title: subvalue['alert'],
          poc: scopedesc,
          files: [],
          desc: stripHtml(subvalue['desc']) + '\n\n' + stripHtml(subvalue['otherinfo']),
          severity: setseverity(subvalue['riskcode']),
          ref: parseRef(subvalue['reference']),
          status: 1,
          cvss: '',
          cvss_vector: '',
          cve: '',
          tags: [{ name: 'zaproxy' }],
          bounty: [],
          date: this.currentdateService.getcurrentDate()
        });
      }
    }

    this.dialogRef.close(arr);
  }

  // ── WIZ CSV ────────────────────────────────────────────────────────────────

  wizOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => this.parseWiz(text));
  }

  private parseWiz(csv: string) {
    const csvData = csv || '';
    const issuelist: any[] = [];
    let text = csvData.substring(csvData.indexOf('\n') + 1);
    text = text.replace(/, /g, '. ');
    const issues = this.utilsService.parseCSV(text);

    const setseverity = (severity: any) => {
      if (severity === 'CRITICAL') return 'Critical';
      if (severity === 'HIGH') return 'High';
      if (severity === 'MEDIUM') return 'Medium';
      if (severity === 'LOW') return 'Low';
      if (severity === 'INFORMATIONAL') return 'Info';
      return severity;
    };

    issues.forEach((myObject: any) => {
      if (!myObject) return;
      issuelist.push({
        title: myObject[1],
        poc: myObject[27],
        files: [],
        desc: myObject[4] + '\n\n' + myObject[24].replaceAll('###', '#'),
        severity: setseverity(myObject[2]),
        ref: myObject[26],
        cvss: '',
        cvss_vector: '',
        cve: '',
        tags: [{ name: 'wiz' }],
        status: 1,
        bounty: [],
        date: this.currentdateService.getcurrentDate()
      });
    });

    this.dialogRef.close(issuelist);
  }

  // ── BlackDuck Code Sight JSON ──────────────────────────────────────────────

  codesightOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => this.parseCodesight(text));
  }

  private parseCodesight(json: string) {
    const data = JSON.parse(json);
    const arr: any[] = [];
    for (const [, value] of Object.entries<any>(data.results.issues.issues)) {
      if (!value) continue;
      arr.push({
        title: value.summary,
        poc: 'File: ' + value.filepath + ':' + value.location.start.line + '-' + value.location.end.line,
        files: [],
        desc: value.desc + '\n\n' + value.remediation,
        severity: value.severity.impact,
        ref: 'https://cwe.mitre.org/data/definitions/' + value.taxonomies.cwe[0] + '.html',
        status: 1,
        cvss: '',
        cvss_vector: '',
        cve: '',
        tags: [{ name: 'codesight' }],
        bounty: [],
        date: this.currentdateService.getcurrentDate()
      });
    }

    this.dialogRef.close(arr);
  }

  // ── SARIF 2.1.0 ────────────────────────────────────────────────────────────

  sarifOnFileSelect(input: HTMLInputElement) {
    this.readSourceFile(input, (text) => {
      const arr = this.sarifService.parse(text);
      if (arr.length === 0) {
        this.sourceBusy = false;
        this.sourceError = 'No results found in this SARIF file.';
        return;
      }
      this.dialogRef.close(arr);
    });
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
    try {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', trimValues: true, parseTagValue: false, parseAttributeValue: false });
      return Promise.resolve(parser.parse(text));
    } catch (e) {
      return Promise.reject(e);
    }
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
    if (this.detectedArrayPaths.length > 0 && this.itemsPaths.length === 0) {
      this.itemsPaths = [this.detectedArrayPaths[0]];
      this.refreshRecords();
    }
  }

  private findArrayPaths(obj: any, prefix: string, depth: number) {
    if (depth > 5 || !obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    for (const key of Object.keys(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const val = obj[key];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        this.detectedArrayPaths.push(path);
      } else if (this.isObjectMap(val)) {
        // Dynamic-keyed map (e.g. npm-audit `vulnerabilities`) → suggest wildcard
        this.detectedArrayPaths.push(`${path}.*`);
      }
      this.findArrayPaths(val, path, depth + 1);
    }
  }

  private isObjectMap(val: any): boolean {
    if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
    const keys = Object.keys(val);
    if (keys.length < 2) return false;
    // All entries are non-null objects with similar shape → looks like a map
    const first = val[keys[0]];
    if (!first || typeof first !== 'object' || Array.isArray(first)) return false;
    return keys.every(k => {
      const v = val[k];
      return v && typeof v === 'object' && !Array.isArray(v);
    });
  }

  /** Toggle a detected path on or off in the multi-selection. */
  togglePath(path: string) {
    const i = this.itemsPaths.indexOf(path);
    if (i >= 0) this.itemsPaths.splice(i, 1);
    else this.itemsPaths.push(path);
    this.refreshRecords();
  }

  /** Push the draft input as a new active path. */
  addDraftPath() {
    const p = this.itemsPathDraft.trim();
    if (!p || this.itemsPaths.includes(p)) { this.itemsPathDraft = ''; return; }
    this.itemsPaths.push(p);
    this.itemsPathDraft = '';
    this.refreshRecords();
  }

  removePath(path: string) {
    this.itemsPaths = this.itemsPaths.filter(p => p !== path);
    this.refreshRecords();
  }

  isPathActive(path: string): boolean {
    return this.itemsPaths.includes(path);
  }

  recordsForPath(path: string): number {
    if (path === '$') {
      if (Array.isArray(this.parsedRaw)) return this.parsedRaw.length;
      return this.parsedRaw ? 1 : 0;
    }
    const val = this.resolvePath(this.parsedRaw, path);
    return Array.isArray(val) ? val.length : (val ? 1 : 0);
  }

  /** Recompute records as the union across all active paths. */
  refreshRecords() {
    if (this.itemsPaths.length === 0) {
      this.records = [];
      this.availableKeys = [];
      return;
    }
    const all: any[] = [];
    for (const path of this.itemsPaths) {
      if (path === '$') {
        if (Array.isArray(this.parsedRaw)) all.push(...this.parsedRaw);
        else if (this.parsedRaw && typeof this.parsedRaw === 'object') all.push(this.parsedRaw);
      } else {
        const val = this.resolvePath(this.parsedRaw, path);
        if (Array.isArray(val)) all.push(...val);
        else if (val) all.push(val);
      }
    }
    this.records = all;
    if (this.records.length > 0) {
      this.availableKeys = this.extractFlatKeys(this.records[0], '', 0);
    } else {
      this.availableKeys = [];
    }
  }

  private extractFlatKeys(obj: any, prefix: string, depth: number): string[] {
    if (depth > 4 || !obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
    const keys: string[] = [];
    for (const key of Object.keys(obj)) {
      const full = prefix ? `${prefix}.${key}` : key;
      keys.push(full);
      const val = obj[key];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && !Array.isArray(val[0])) {
        // Suggest wildcard traversal for arrays of objects: e.g. "Results.*.title"
        keys.push(...this.extractFlatKeys(val[0], `${full}.*`, depth + 1));
      } else if (typeof val === 'object' && !Array.isArray(val)) {
        keys.push(...this.extractFlatKeys(val, full, depth + 1));
      }
    }
    return keys;
  }

  goToMapping() {
    this.refreshRecords();
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
    return this.walkPath(obj, path.split('.'), 0);
  }

  private walkPath(cur: any, parts: string[], idx: number): any {
    if (cur == null) return undefined;
    if (idx >= parts.length) return cur;
    const key = parts[idx];

    // Wildcard: iterate array elements OR object values (for dynamic-keyed maps),
    // descend remaining path for each, flatten one level.
    if (key === '*') {
      let items: any[];
      if (Array.isArray(cur)) {
        items = cur;
      } else if (typeof cur === 'object') {
        items = Object.values(cur);
      } else {
        return undefined;
      }
      const out: any[] = [];
      for (const item of items) {
        const val = this.walkPath(item, parts, idx + 1);
        if (val === undefined || val === null) continue;
        if (Array.isArray(val)) out.push(...val);
        else out.push(val);
      }
      return out;
    }

    const m = key.match(/^(.+)\[(\d+)\]$/);
    const next = m ? cur[m[1]]?.[+m[2]] : cur[key];
    return this.walkPath(next, parts, idx + 1);
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
    const pathDisplay = this.itemsPaths.length === 0
      ? '$'
      : this.itemsPaths.length === 1
        ? this.itemsPaths[0]
        : `[ ${this.itemsPaths.join(', ')} ]`;
    const lines: string[] = [
      `format:     ${this.wizardFormat.toUpperCase()}`,
      `items_path: ${pathDisplay}`,
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
        itemsPath:     this.itemsPaths[0] ?? '',
        itemsPaths:    [...this.itemsPaths],
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
