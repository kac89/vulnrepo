import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { HttpClient } from '@angular/common/http';
import { MatSort } from '@angular/material/sort';
import { IndexeddbService } from '../indexeddb.service';
import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import { DialogAddCustomTemplateComponent } from '../dialog-add-custom-template/dialog-add-custom-template.component';
import { MatDialog } from '@angular/material/dialog';
import { SessionstorageserviceService } from "../sessionstorageservice.service"
import { KeyVaultService } from '../key-vault.service';
import { ApiService } from '../api.service';

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

@Component({
  standalone: false,
  selector: 'app-templates-list',
  templateUrl: './templates-list.component.html',
  styleUrls: ['./templates-list.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      )
    ])
  ]
})
export class TemplatesListComponent implements OnInit {

  readonly sources = [
    { value: 'VULNREPO',       label: 'VULNRΞPO' },
    { value: 'CWE',            label: 'CWE Research Concepts' },
    { value: 'MENTERPRISE',    label: 'MITRE ATT&CK Enterprise' },
    { value: 'MMOBILE',        label: 'MITRE ATT&CK Mobile' },
    { value: 'OWASPTOP2025',   label: 'OWASP Top 10 2025' },
    { value: 'OWASPTOP2021',   label: 'OWASP Top 10 2021' },
    { value: 'OWASPTOP2017',   label: 'OWASP Top 10 2017' },
    { value: 'OWASPTOP10CICD', label: 'OWASP Top 10 CI/CD' },
    { value: 'OWASPTOP10k8s',  label: 'OWASP Kubernetes Top 10' },
  ];
  readonly sourceLabels: Record<string, string> = Object.fromEntries(
    this.sources.map(s => [s.value, s.label])
  );

  displayedColumns: string[] = ['title', 'severity', 'cvss', 'cve', 'expand'];
  dataSource = new MatTableDataSource<VulnsList>();
  getvulnlistStatus = '';
  countvulns: any[] = [];
  filterValue = '';
  sourceSelect = 'VULNREPO';
  reportTemplateList_int: any[] = [];
  reportTemplateList: any[] = [];
  local: any[] = [];
  json: any[] = [];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

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

  constructor(private http: HttpClient, public dialog: MatDialog, private indexeddbService: IndexeddbService,
    private apiService: ApiService, public sessionsub: SessionstorageserviceService,
    private keyVault: KeyVaultService) {

    this.getvulnlistStatus = 'Loading...';
  }

  ngOnInit() {
    this.gettemplates();
  }

  private setTableData(data: any[]) {
    this.countvulns = data;
    this.dataSource.data = data;
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.getvulnlistStatus = '';
  }

  applyFilter(value: string) {
    this.filterValue = value;
    this.dataSource.filter = value.trim().toLowerCase();
  }

  gettemplates() {
    this.indexeddbService.retrieveReportTemplates().then(ret => {
      if (ret) {
        this.local = ret;

        this.http.get<any>('/assets/vulns.json?v=' + +new Date()).subscribe(res => {
          if (res) {
            this.json = res;
            const merged = [...this.local, ...this.json];
            this.dataSource = new MatTableDataSource<VulnsList>(merged);
            this.reportTemplateList = merged;
            this.setTableData(merged);
            this.getAPITemplates();
          }
        });
      }
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
    this.sourceSelect = value;
    this.changeselect();
  }

  changeselect() {
    if (this.sourceSelect === 'VULNREPO') {
      this.getvulnlistStatus = 'Loading...';
      this.gettemplates();
      return;
    }

    const assetPath = this.SOURCE_ASSETS[this.sourceSelect];
    if (!assetPath) return;

    this.getvulnlistStatus = 'Loading...';
    this.http.get<any>(assetPath + '?v=' + +new Date()).subscribe(res => {
      this.setTableData(res);
    });
  }

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
        });
      }
      this.gettemplates();
    });
  }
}
