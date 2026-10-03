import { Component, OnInit, Inject, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { CryptoUtilsService } from '../crypto-utils.service';
import { UtilsService } from '../utils.service';
import { SarifService } from '../sarif.service';

interface Exportsource {
  value: string;
  viewValue: string;
  viewImg: string;
  icon: string;
  desc: string;
  badge: string;
  badgeClass: string;
}

@Component({
  standalone: false,
  //imports: [],
  selector: 'app-dialog-exportissues',
  templateUrl: './dialog-exportissues.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dialog-exportissues.component.scss']
})
export class DialogExportissuesComponent implements OnInit {
  isReturn:any = [];
  fields: any;
  issues: any;
  curlhide = false;
  splitfilereport = false;
  multipartcurl = false;
  multicurlcmd = '';
  curlcmd = '';
  cmdHint = '';
  selected_export = 'vulnrepojson';
  // One flag per key field: a shared flag reveals both at once.
  hide1 = true;
  hide2 = true;
  exportKey = '';
  exportKeyConfirm = '';
  jiraUrl = '';
  jiraKey = '';
  jiraEmail = '';
  jiraLabel = '';
  splitcountval = '49';
  peek = false;
  estSize = '';
  sevCounts: Array<{ name: string, count: number, cls: string }> = [];
  jiraVars = ['$key', '$title', '$desc', '$poc', '$ref', '$severity', '$label'];
  fields_prop = `"project": {
    "key": "$key"
  },
  "summary": "$title",
  "description": "$desc \\n\\n POC: \\n $poc \\n\\n  Reference: \\n $ref",
  "issuetype": {
    "name": "Bug"
  },
  "priority": {
    "id": "$severity"
  },
  "labels": [
    "$label"
  ]`;

  sour: Exportsource[] = [
    {
      value: 'vulnrepojson', viewValue: 'VULNRΞPO', viewImg: '/favicon-32x32.png', icon: '',
      desc: 'AES-GCM archive · re-importable', badge: 'encrypted', badgeClass: 'enc'
    },
    {
      value: 'decrypted_json', viewValue: 'Raw JSON', viewImg: '', icon: 'data_object',
      desc: 'Issue objects as stored · for scripts', badge: 'plaintext', badgeClass: 'plain'
    },
    {
      value: 'sarif', viewValue: 'SARIF 2.1.0', viewImg: '/assets/vendors/sarif.svg', icon: '',
      desc: 'For CI and code-scanning dashboards', badge: 'plaintext', badgeClass: 'plain'
    },
    {
      value: 'jira', viewValue: 'Atlassian Jira', viewImg: '/assets/vendors/jira-logo.png', icon: '',
      desc: 'Bulk-create tickets with cURL', badge: 'rest api', badgeClass: 'api'
    }
  ];

  private severityOrder = [
    { name: 'Critical', cls: 'c' },
    { name: 'High', cls: 'h' },
    { name: 'Medium', cls: 'm' },
    { name: 'Low', cls: 'l' },
    { name: 'Info', cls: 'i' }
  ];

  // @ts-ignore
  constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: MatDialogRef<DialogExportissuesComponent>,
    private cryptoUtils: CryptoUtilsService,
    private utilsService: UtilsService,
    private sarifService: SarifService,
    private host: ElementRef<HTMLElement>) { }

    ngOnInit() {

      if (this.data.sel) {

        this.data.sel.forEach((item, index) => {
          if (item.data) {

            const index2: number = this.data.orig.findIndex(i => i === item.data)
            if (index2 !== -1) {
              this.isReturn.push(this.data.orig[index2]);
            }

          }
      });

      } else {
          this.isReturn = this.data;
      }

      this.countSeverities();
      this.estSize = this.payloadSize();

    }

  // Severity breakdown of the selection, so a filtered export (by tag, by severity)
  // can be verified before a key is typed.
  private countSeverities() {
    this.sevCounts = this.severityOrder.map(s => ({
      name: s.name,
      cls: s.cls,
      count: this.isReturn.filter(i => this.sevName(i.severity) === s.name).length
    })).filter(s => s.count > 0);
  }

  private payloadSize(): string {
    const bytes = new Blob([JSON.stringify(this.isReturn)]).size;
    if (bytes < 1024) {
      return '≈ ' + bytes + ' B';
    }
    if (bytes < 1024 * 1024) {
      return '≈ ' + Math.round(bytes / 1024) + ' KB';
    }
    return '≈ ' + (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Issue severity is stored as a name in some reports and as a numeric id in others.
  sevName(severity: any): string {
    return this.utilsService.setseverity(String(severity));
  }

  sevClass(severity: any): string {
    const entry = this.severityOrder.find(s => s.name === this.sevName(severity));
    return entry ? entry.cls : 'i';
  }

  pickFormat(value: string) {
    this.selected_export = value;
    this.resetCmd();
  }

  resetCmd() {
    this.curlhide = false;
    this.multipartcurl = false;
  }

  private revealCmd() {
    setTimeout(() => {
      const block = this.host.nativeElement.querySelector('.cmd-block');
      if (block) {
        block.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  get activeCmd(): string {
    return this.multipartcurl ? this.multicurlcmd : this.curlcmd;
  }

  get keyStrength(): { pct: number, label: string, cls: string } {
    const v = this.exportKey;
    if (!v) {
      return { pct: 0, label: 'key strength', cls: '' };
    }
    let s = 0;
    if (v.length >= 8) { s++; }
    if (v.length >= 14) { s++; }
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) { s++; }
    if (/[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v)) { s++; }
    const levels = [
      { pct: 28, label: 'weak', cls: 'weak' },
      { pct: 28, label: 'weak', cls: 'weak' },
      { pct: 55, label: 'fair', cls: 'fair' },
      { pct: 78, label: 'good', cls: 'good' },
      { pct: 100, label: 'strong', cls: 'strong' }
    ];
    return levels[s];
  }

  get keyMatch(): { text: string, cls: string } {
    if (!this.exportKey && !this.exportKeyConfirm) {
      return { text: 'Both fields must match before the archive can be written.', cls: '' };
    }
    if (this.exportKey.length < 8) {
      return { text: 'Use at least 8 characters.', cls: 'bad' };
    }
    if (!this.exportKeyConfirm) {
      return { text: 'Re-enter the key to confirm it.', cls: '' };
    }
    if (this.exportKey !== this.exportKeyConfirm) {
      return { text: 'Keys do not match.', cls: 'bad' };
    }
    return { text: 'Keys match — this archive cannot be opened without them.', cls: 'ok' };
  }

  get canExport(): boolean {
    if (this.isReturn.length === 0) {
      return false;
    }
    if (this.selected_export === 'vulnrepojson') {
      return this.exportKey.length >= 8 && this.exportKey === this.exportKeyConfirm;
    }
    if (this.selected_export === 'jira') {
      return this.jiraUrl.trim() !== '' && this.jiraKey.trim() !== '' && this.jiraEmail.trim() !== '';
    }
    return true;
  }

  get stepTwoLabel(): string {
    switch (this.selected_export) {
      case 'vulnrepojson': return 'Set key';
      case 'jira': return 'Connection';
      default: return 'Confirm';
    }
  }

  get outputName(): string {
    switch (this.selected_export) {
      case 'vulnrepojson': return 'VULNREPO issues export.vuln';
      case 'decrypted_json': return 'VULNREPO issues export.json';
      case 'sarif': return 'VULNREPO issues export.sarif';
      default: return this.splitfilereport ? 'data0.json … dataN.json' : 'data.json';
    }
  }

  get outputSecurity(): string {
    return this.selected_export === 'vulnrepojson' ? 'AES-GCM encrypted' : 'Not encrypted';
  }

  get primaryLabel(): string {
    switch (this.selected_export) {
      case 'vulnrepojson': return 'Export encrypted';
      case 'decrypted_json': return 'Download JSON';
      case 'sarif': return 'Download SARIF';
      default: return 'Build command';
    }
  }

  get primaryIcon(): string {
    return this.selected_export === 'jira' ? 'terminal' : 'file_download';
  }

  runExport() {
    switch (this.selected_export) {
      case 'vulnrepojson':
        this.vulnrepojsonexport(this.exportKey, this.exportKeyConfirm);
        break;
      case 'decrypted_json':
        this.downloaddecryptedJSON();
        break;
      case 'sarif':
        this.downloadSARIF();
        break;
      case 'jira':
        // A blank or zero count would make the chunking loop splice nothing and
        // spin forever, so it falls back to the default.
        const per = Math.max(1, parseInt(this.splitcountval, 10) || 49);
        this.splitcountval = String(per);
        this.jiraCloudExport(this.jiraUrl, this.jiraKey, this.jiraEmail, this.jiraLabel,
          this.fields_prop, per);
        break;
    }
  }

  insertVar(area: HTMLTextAreaElement, variable: string) {
    const start = area.selectionStart ?? area.value.length;
    const end = area.selectionEnd ?? start;
    this.fields_prop = area.value.slice(0, start) + variable + area.value.slice(end);
    this.resetCmd();
    setTimeout(() => {
      area.focus();
      area.selectionStart = area.selectionEnd = start + variable.length;
    });
  }

  flashCopied(tip: MatTooltip): void {
    setTimeout(() => {
      tip.show();
      tip.message = 'Copied!';
    });
    setTimeout(() => {
      tip.hide();
      tip.message = 'Copy command';
    }, 2000);
  }

  toggleSplit() {
    this.splitfilereport = !this.splitfilereport;
    this.resetCmd();
  }

  cancel(): void {
    this.dialogRef.close();
  }

  jiraCloudExport(jira_c_url, jira_c_key, jira_c_email, jira_c_label, workflow, splitcount) {
    this.curlhide = false;

    function sevret(text) {
      let ret = 0;

      if (text === 'Critical') {
        ret = 1;
      }
      if (text === 'High') {
        ret = 2;
      }

      if (text === 'Medium') {
        ret = 3;
      }

      if (text === 'Low') {
        ret = 4;
      }

      if (text === 'Info') {
        ret = 5;
      }

      return ret;
    }

    const dataownload = (datajson: string, filename: string | number) => {
      const blob = new Blob([datajson], { type: 'application/json;charset=utf-8' });
      this.utilsService.downloadWithIntegrity(blob, 'data' + String(filename) + '.json');
    };

    if (this.isReturn.length > 0) {
      this.data = this.isReturn;
    }

    const myClonedArray = Object.assign([], this.data);

    if (this.splitfilereport === true) {

      this.curlhide = false;
      this.multipartcurl = false;
      let fname = 0;
      while (myClonedArray.length > 0) {

        const chunk = myClonedArray.splice(0, splitcount);
        this.issues = '';

        chunk.forEach((item, index) => {
          let myStr = workflow;
          let des = item.desc.toString().replace(/(\\)/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
          if (des.length > 4000) {
            des = des.substring(0, 4000);
            des = des + '[TRUNCATE]';
          }
          // tslint:disable-next-line:max-line-length
          let po = item.poc.toString().replace(/(\\)/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
          if (po.length > 4000) {
            po = po.substring(0, 4000);
            po = po + '[TRUNCATE]';
          }

          myStr = myStr
            .replace('$key', jira_c_key)
            .replace('$title', item.title.toString())
            .replace('$desc', des)
            .replace('$poc', po)
            .replace('$ref', item.ref.toString().replace(/\n/g, '\\n'))
            .replace('$severity', sevret(item.severity))
            .replace('$label', jira_c_label);

          this.fields = `"fields": {
          ` + myStr + `
          }`;
          let sep = '';
          if (chunk.length > 1) {
            sep = ',';
          }

          this.issues = this.issues + `{
        "update": {},
        ` + this.fields + `
        }` + sep;

        });

        if (this.issues.slice(-1) === ',') {
          this.issues = this.issues.slice(0, -1);
        }

        const datajson = `{
        "issueUpdates": [
          ` + this.issues + `
        ]
      }`;

    this.multicurlcmd = `ls data*[0-9].json | while read file
do
curl -D- -u ` + jira_c_email + ` -X POST -d "@$file" -H "Content-Type: application/json" ` + jira_c_url + `/rest/api/2/issue/bulk
done`;

        dataownload(datajson, fname);
        this.multipartcurl = true;
        fname = fname + 1;

      }

      this.cmdHint = 'Split into ' + fname + ' file' + (fname !== 1 ? 's' : '') + ' of up to ' +
        splitcount + ' issues — run from your download folder.';
      this.revealCmd();

    } else {

    this.multipartcurl = false;
    this.curlhide = false;
    this.issues = '';
    if (this.isReturn.length > 0) {
      this.data = this.isReturn;
    }

    this.data.forEach((item, index) => {

      let myStr = workflow;

      let des = item.desc.toString().replace(/(\\)/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      if (des.length > 4000) {
        des = des.substring(0, 4000);
        des = des + '[TRUNCATE]';
      }

      let po = item.poc.toString().replace(/(\\)/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      if (po.length > 4000) {
        po = po.substring(0, 4000);
        po = po + '[TRUNCATE]';
      }

      myStr = myStr
        .replace('$key', jira_c_key)
        .replace('$title', item.title.toString())
        .replace('$desc', des)
        .replace('$poc', po)
        .replace('$ref', item.ref.toString().replace(/\n/g, '\\n'))
        .replace('$severity', sevret(item.severity))
        .replace('$label', jira_c_label);

      this.fields = `"fields": {
      ` + myStr + `
      }`;
      let sep = '';
      if (this.data.length > 1) {
        sep = ',';
      }

      this.issues = this.issues + `{
    "update": {},
    ` + this.fields + `
    }` + sep;

    });

    if (this.issues.slice(-1) === ',') {
      this.issues = this.issues.slice(0, -1);
    }

    const datajson = `{
    "issueUpdates": [
      ` + this.issues + `
    ]
  }`;

this.curlcmd = `curl \
-D- \
-u ` + jira_c_email + ` \
-X POST \
-d "@data.json" \
-H "Content-Type: application/json" \
` + jira_c_url + `/rest/api/2/issue/bulk`;

    dataownload(datajson, '');
    this.curlhide = true;
    this.cmdHint = 'data.json saved to your downloads — ' + this.isReturn.length + ' issue' +
      (this.isReturn.length !== 1 ? 's' : '') + ', SHA-256 recorded in the export log.';
    this.revealCmd();
  }
  }


  async vulnrepojsonexport(pass, pass2) {

    if (pass === pass2) {

      if (this.isReturn.length > 0) {
        this.data = this.isReturn;
      }

      const json = JSON.stringify(this.data);
      // Encrypt
      const ciphertext = await this.cryptoUtils.encrypt(json, pass);

      const blob = new Blob([ciphertext], { type: 'text/plain;charset=utf-8' });
      this.utilsService.downloadWithIntegrity(blob, 'VULNREPO issues export.vuln');
    }

  }

  downloaddecryptedJSON() {

      if (this.isReturn.length > 0) {
        this.data = this.isReturn;
      }

      const json = JSON.stringify(this.data);

      // Same integrity path as the other three exports, so every format gets a
      // recorded SHA-256 the recipient can verify.
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      this.utilsService.downloadWithIntegrity(blob, 'VULNREPO issues export.json');

  }


  downloadSARIF() {

    if (this.isReturn.length > 0) {
      this.data = this.isReturn;
    }

    const sarif = this.sarifService.build(this.data);

    const blob = new Blob([sarif], { type: 'application/sarif+json;charset=utf-8' });
    this.utilsService.downloadWithIntegrity(blob, 'VULNREPO issues export.sarif');

  }

}
