import { Component, inject, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { UntypedFormControl } from '@angular/forms';
import { Observable, forkJoin } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { CurrentdateService } from '../currentdate.service';
import { IndexeddbService } from '../indexeddb.service';
import { SessionstorageserviceService } from "../sessionstorageservice.service"
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

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

@Component({
  standalone: false,
  //imports: [],
  selector: 'app-dialog-addissue',
  templateUrl: './dialog-addissue.component.html',
  styleUrls: ['./dialog-addissue.component.scss'],
})
export class DialogAddissueComponent implements OnInit, AfterViewInit {
  customissueform = new UntypedFormControl();
  mobilecustomissueform = new UntypedFormControl();
  gridaction = new UntypedFormControl();
  mobilegridaction = new UntypedFormControl();
  filterinput = new UntypedFormControl();
  mycve = new UntypedFormControl();
  myghsa = new UntypedFormControl();

  myPCI = new UntypedFormControl();
  options: Vulns[] = [];

  optionsv: Vulns[] = [];
  cwe: Vulns[] = [];
  mitremobile: Vulns[] = [];
  mitreenterprise: Vulns[] = [];
  pcidssv3: any;
  owasptop2017: Vulns[] = [];
  owasptop2021: Vulns[] = [];
  OWASPTOP10CICD: Vulns[] = [];
  OWASPTOP10k8s: Vulns[] = [];
  AIVULNS: Vulns[] = [];
  owaspmobile2024: Vulns[] = [];
  filteredOptions: Observable<Vulns[]>;

  freeztype = true;
  hidecwe = true;

  filteredOptionsPCIDSS: Observable<string[]>;

  err_msg: string;
  sourceSelect = 'VULNREPO';
  show = false;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  announcer = inject(LiveAnnouncer);
  chipsissue: string[] = [];
  mobilechipsissue: string[] = [];
  reportTemplateList_int: any[] = [];

  displayedColumns: string[] = ['select', 'title'];
  placeholder = "";

  dataSource = new MatTableDataSource<any>([]);
  selection = new SelectionModel<any>(true, []);
  private paginator: MatPaginator;
  private sort: MatSort;

  @ViewChild(MatSort) set matSort(ms: MatSort) {
    this.sort = ms;
    this.setDataSourceAttributes();
  }

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
    this.setDataSourceAttributes();
  }

  setDataSourceAttributes() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  constructor(public router: Router,
    public dialogRef: MatDialogRef<DialogAddissueComponent>, private http: HttpClient,
    private currentdateService: CurrentdateService,
    private apiService: ApiService, public sessionsub: SessionstorageserviceService,
    private indexeddbService: IndexeddbService) {

    this.filteredOptions = this.customissueform.valueChanges
      .pipe(
        startWith<string | Vulns>(''),
        map(value => typeof value === 'string' ? value : value.title),
        map(title => title ? this._filter(title) : this.options.slice())
      );

    this.filteredOptionsPCIDSS = this.myPCI.valueChanges
      .pipe(
        startWith(''),
        map(value => this._filterPCI(value))
      );

  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  toggleAllRows() {

    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.dataSource.data);
  }

  checkboxLabel(row?): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.position + 1}`;
  }

  private _filter(name: string): Vulns[] {
    const filterValue = name.toLowerCase();
    return this.options.filter(option => option.title.toLowerCase().indexOf(filterValue) >= 0);
  }

  ////////////
  private _filterPCI(value: string): string[] {
    if (value) {
      return this.pcidssv3
        .map(group => ({ maincategory: group.maincategory, items: this._filt3r(group.items, value) }))
        .filter(group => group.items.length > 0);
    }
    return this.pcidssv3;
  }

  private _filt3r(opt, value: string): string[] {
    const filterValue = value.toString().toLowerCase();
    return opt.filter(item => item.title.toString().toLowerCase().indexOf(filterValue) >= 0);
  }
  ////////////

  ngOnInit() {
    this.freeztype = true;
    this.indexeddbService.retrieveReportTemplates().then(ret => {
      if (ret) {
        this.http.get<any>('/assets/vulns.json?v=' + + new Date()).subscribe(res => {
          this.options = [...res, ...ret];
          this.optionsv = this.options;
          this.getAPITemplates();
        });
      }
    });

    this.http.get<any>('/assets/pcidssv3.2.1.json?v=' + + new Date()).subscribe(res => {
      this.pcidssv3 = res;
    });

    this.retrieveSourcesTOP10();
  }


  retrieveSourcesTOP10(): void {
    const owasptop2017api = this.http.get<any>('/assets/OWASPtop102017.json?v=' + + new Date());
    const owasptop2021api = this.http.get<any>('/assets/OWASPtop102021.json?v=' + + new Date());
    const OWASPTOP10CICDapi = this.http.get<any>('/assets/OWASPtop10cicd.json?v=' + + new Date());
    const OWASPTOP10k8sapi = this.http.get<any>('/assets/OWASPtop10k8s.json?v=' + + new Date());
    const AIVULNSapi = this.http.get<any>('/assets/AIVULNS.json?v=' + + new Date());
    const owaspmobile2024api = this.http.get<any>('/assets/owasp_mobile_2024.json?v=' + + new Date());
    const cweapi = this.http.get<any>('/assets/CWE_V.4.3.json?v=' + + new Date());
    const mitreenterpriseapi = this.http.get<any>('/assets/enterprise-attack.json?v=' + + new Date());
    const mitremobileapi = this.http.get<any>('/assets/mobile-attack.json?v=' + + new Date());

    forkJoin([owasptop2017api, owasptop2021api, OWASPTOP10CICDapi, OWASPTOP10k8sapi, AIVULNSapi, owaspmobile2024api, cweapi, mitreenterpriseapi, mitremobileapi])
      .subscribe(
        result => {
          this.owasptop2017 = result[0];
          this.owasptop2021 = result[1];
          this.OWASPTOP10CICD = result[2];
          this.OWASPTOP10k8s = result[3];
          this.AIVULNS = result[4];
          this.owaspmobile2024 = result[5];
          this.cwe = result[6];
          this.mitreenterprise = result[7];
          this.mitremobile = result[8];
          this.freeztype = false;
        }
      )
  }

  cancel(): void {
    this.dialogRef.close();
  }

  getcurrentDate(): number {
    return this.currentdateService.getcurrentDate();
  }

  getAPITemplates() {

    const localkey = this.sessionsub.getSessionStorageItem('VULNREPO-API');
    if (localkey) {
      //this.msg = 'API connection please wait...';

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

          //this.msg = '';
        }).catch(() => { });

        //setTimeout(() => {
        // console.log('hide progress timeout');
        //this.msg = '';
        //}, 10000);

      });

    }
  }

  addIssue() {

    if (this.customissueform.value !== "" && this.customissueform.value !== null) {
      this.chipsissue.push(this.customissueform.value);
    }

    let exitel: any[] = [];
    if (this.chipsissue.length > 0) {
      for (var datael of this.chipsissue) {

        const found = this.options.find((obj) => {
          return obj.title === datael;
        });

        if (found !== undefined) {

          if (found.title === datael) {
            const def = {
              title: found.title,
              poc: found.poc,
              files: [],
              desc: found.desc,
              severity: found.severity,
              status: 1,
              ref: found.ref,
              cvss: found.cvss,
              cvss_vector: found.cvss_vector,
              cve: found.cve,
              tags: found.tags,
              bounty: [],
              date: this.getcurrentDate()
            };
            exitel.push(def);

          }


        } else {

          const def = {
            title: datael,
            poc: '',
            files: [],
            desc: '',
            severity: 'Info',
            status: 1,
            ref: '',
            cvss: '',
            cvss_vector: '',
            cve: '',
            tags: [],
            bounty: [],
            date: this.getcurrentDate()
          };
          exitel.push(def);
        }
      }

      this.dialogRef.close(exitel);


    } else {
      this.customissueform.setErrors({ 'notempty': true });
      this.gridaction.setErrors({ 'notempty': true });
    }

  }

  displayFn(template?: Vulns): string | undefined {
    return template ? template.title : undefined;
  }

  changeselect() {
    this.err_msg = '';
    this.show = false;
    this.hidecwe = true;
    
    this.dataSource.data = [];
    this.setDataSourceAttributes();
    this.filterinput.setValue("");
    this.dataSource.filter = "";
    this.selection.clear();

    if (this.sourceSelect === 'OWASP_mobile') {
      this.dataSource.data = this.owaspmobile2024;
    }

    if (this.sourceSelect === 'OWASPTOP10k8s') {
      this.dataSource.data = this.OWASPTOP10k8s;
    }

    if (this.sourceSelect === 'AIVULNS') {
      this.dataSource.data = this.AIVULNS;
    }

    if (this.sourceSelect === 'OWASPTOP2021') {
      this.dataSource.data = this.owasptop2021;
    }

    if (this.sourceSelect === 'OWASPTOP2017') {
      this.dataSource.data = this.owasptop2017;
    }

    if (this.sourceSelect === 'OWASPTOP10CICD') {
      this.dataSource.data = this.OWASPTOP10CICD;
    }

    if (this.sourceSelect === 'CWE') {

      this.hidecwe = false;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.dataSource.data = this.cwe;
      this.placeholder = "type: CWE-20 or bypass, injection";

    }

    if (this.sourceSelect === 'MENTERPRISE') {

      this.hidecwe = false;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.dataSource.data = this.mitreenterprise;
      this.placeholder = "e.g.: DNS Server";

    }

    if (this.sourceSelect === 'MMOBILE') {

      this.hidecwe = false;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.dataSource.data = this.mitremobile;
      this.placeholder = "e.g.: Application Discovery";

    }

  }

  addGHSA() {

    const data = this.myghsa.value;


    if (data !== '' && data !== null) {

      const reg = new RegExp(/GHSA(-[23456789cfghjmpqrvwx]{4}){3}/, 'i');
      if (reg.test(data)) {

        this.show = true;

        this.apiService.getGHSA(data).then(resp => {

          if (resp !== null && resp !== undefined) {

            function prepseverity(text) {

              if (text === 'moderate') {
                text = "medium";
              }

              return text.charAt(0).toUpperCase() + text.slice(1);
            }


            const def = {
              title: resp.summary,
              poc: "",
              files: [],
              desc: resp.description,
              severity: prepseverity(resp.severity),
              status: 1,
              ref: resp.references.join("\n"),
              cvss: resp.cvss.score,
              cvss_vector: resp.cvss.vector_string,
              cve: resp.cve_id,
              bounty: [],
              tags: [],
              date: this.getcurrentDate()
            };

            this.show = false;
            this.dialogRef.close(def);




          } else {
            this.show = false;
            this.myghsa.setErrors({ 'ghsa_notfound': true });
          }


        });


      } else {
        this.show = false;
        this.myghsa.setErrors({ 'ghsa_format_error': true });
      }

    } else {
      this.show = false;
      this.myghsa.setErrors({ 'notempty': true });
    }

  }

  addCVE() {
    this.err_msg = '';
    let severity = 'Info';
    let cvss = '';
    let cvssv = '';
    const severityRatings = [{
      name: 'Info',
      bottom: 0.0,
      top: 0.0
    }, {
      name: 'Low',
      bottom: 0.1,
      top: 3.9
    }, {
      name: 'Medium',
      bottom: 4.0,
      top: 6.9
    }, {
      name: 'High',
      bottom: 7.0,
      top: 8.9
    }, {
      name: 'Critical',
      bottom: 9.0,
      top: 10.0
    }];

    const data = this.mycve.value;
    if (data !== '' && data !== null) {

      const reg = new RegExp(/^CVE-\d{4}-\d{4,7}$/, 'i');
      if (reg.test(data)) {

        this.show = true;
        this.apiService.getCVE(data).then(resp => {

          if (resp !== null && resp !== undefined && Object.keys(resp.githubcve).length !== 0) {
            // if everything OK
            let githubcve = resp.githubcve;
            let githubpoc = resp.githubpoc;

            if (githubcve.cveMetadata.cveId) {
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

                      function FirstLetter(string) {
                        string = string.toLowerCase();
                        return string.charAt(0).toUpperCase() + string.slice(1);
                      }

                      severity = FirstLetter(githubcve.containers.cna.metrics[_i][ss[x]].baseSeverity);
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
              for (let _i = 0; _i < githubpoc.items.length; _i++) {
                pocgithub += githubpoc.items[_i].html_url + '\n';
              }

              let gdesc = '';
              if (githubcve.containers.cna.descriptions) {
                gdesc = githubcve.containers.cna.descriptions[0].value;
              }

              const def = {
                title: cvetitle,
                poc: pocgithub,
                files: [],
                desc: gdesc,
                severity: severity,
                status: 1,
                ref: refer,
                cvss: cvss,
                cvss_vector: cvssv,
                cve: githubcve.cveMetadata.cveId,
                bounty: [],
                tags: [],
                date: this.getcurrentDate()
              };
              this.show = false;
              this.dialogRef.close(def);
            }

            if (resp.error) {
              this.err_msg = resp.error;
              this.show = false;
            }

          } else {
            this.show = false;
            this.mycve.setErrors({ 'cve_notfound': true });
          }

        });

      } else {
        this.show = false;
        this.mycve.setErrors({ 'cve_format_error': true });
      }

    } else {
      this.show = false;
      this.mycve.setErrors({ 'notempty': true });
    }

  }



  addPCIDSS() {
    const data = this.myPCI.value;
    if (data !== '' && data !== null) {

      for (const key in this.pcidssv3) {

        if (this.pcidssv3.hasOwnProperty(key)) {

          for (const ile in this.pcidssv3[key].items) {

            if (this.pcidssv3[key].items[ile].title === data) {

              let tytul = this.pcidssv3[key].items[ile].title;

              tytul = tytul.split(':')[0];

              if (tytul.length >= 100) {
                tytul = tytul.substring(0, 100);
                tytul = tytul + '...';
              }

              let il = '';
              this.pcidssv3[key].items[ile].testing.forEach(item => {
                il = il + item.title + '\n\n';
              });

              const def = {
                title: tytul,
                poc: 'Testing:\n\n' + il + '\nGuidance:\n\n' + this.pcidssv3[key].items[ile].guidance,
                files: [],
                // tslint:disable-next-line:max-line-length
                desc: this.pcidssv3[key].items[ile].title,
                severity: 'Info',
                status: 1,
                ref: 'https://www.pcisecuritystandards.org/\nhttps://www.pcisecuritystandards.org/documents/PCI_DSS_v3-2-1.pdf',
                cvss: '',
                cvss_vector: '',
                cve: '',
                tags: [],
                bounty: [],
                date: this.getcurrentDate()
              };
              this.dialogRef.close(def);
              break;

            } else {
              this.myPCI.setErrors({ 'cantfind': true });
            }

          }

        }
      }
    } else {
      this.myPCI.setErrors({ 'notempty': true });
    }

  }

  addtop10(items) {

    let exitel: any[] = [];
    if (items.length > 0) {
      for (var datael of items) {

        const def = {
          title: datael.title,
          poc: datael.poc,
          files: [],
          desc: datael.desc,
          severity: datael.severity,
          status: 1,
          ref: datael.ref,
          cvss: datael.cvss,
          cvss_vector: "",
          cve: datael.cve,
          tags: [],
          bounty: [],
          date: this.getcurrentDate()
        };
        exitel.push(def);

      }

      this.dialogRef.close(exitel);


    }

  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      this.chipsissue.push(value);
    }

    // Clear the input value
    event.chipInput!.clear();

    this.customissueform.setValue('');
  }

  remove(fruit: string): void {
    const index = this.chipsissue.indexOf(fruit);

    if (index >= 0) {
      this.chipsissue.splice(index, 1);

      this.announcer.announce(`Removed ${fruit}`);
    }
  }



  selected(event: MatAutocompleteSelectedEvent): void {
    this.chipsissue.push(event.option.viewValue);
    //this.fruitInput.nativeElement.value = '';
    this.customissueform.setValue('');
  }
}
