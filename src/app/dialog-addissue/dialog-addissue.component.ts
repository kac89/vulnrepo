import { Component, ElementRef, ViewChild, inject, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { UntypedFormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent, MatChipsModule} from '@angular/material/chips';
import {LiveAnnouncer} from '@angular/cdk/a11y';
import {MatAutocompleteSelectedEvent, MatAutocompleteModule} from '@angular/material/autocomplete';
import { CurrentdateService } from '../currentdate.service';
import { IndexeddbService } from '../indexeddb.service';

export interface Vulns {
  title: string;
  cve: string;
  cvss: number;
  cvss_vector: string;
  desc: string;
  poc: string;
  ref: string;
  severity: string;
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
  selector: 'app-dialog-addissue',
  templateUrl: './dialog-addissue.component.html',
  styleUrls: ['./dialog-addissue.component.scss'],
})
export class DialogAddissueComponent implements OnInit {
  customissueform = new UntypedFormControl();
  gridaction = new UntypedFormControl();
  cwecontrol = new UntypedFormControl();
  mycve = new UntypedFormControl();
  mymobilemitre = new UntypedFormControl();
  myenterprisemitre = new UntypedFormControl();
  myPCI = new UntypedFormControl();
  myOWASP2017 = new UntypedFormControl();
  myOWASP2021 = new UntypedFormControl();
  myOWASPTOP10CICD = new UntypedFormControl();
  myOWASPTOP10k8s = new UntypedFormControl();
  options: Vulns[] = [];
  cwe: Vulns[] = [];
  mitremobile: Vulns[] = [];
  mitreenterprise: Vulns[] = [];
  pcidssv3: any;
  owasptop2017: Vulns[] = [];
  owasptop2021: Vulns[] = [];
  OWASPTOP10CICD: Vulns[] = [];
  OWASPTOP10k8s: Vulns[] = [];
  filteredOptions: Observable<Vulns[]>;
  filteredOptionsCWE: Observable<Vulns[]>;
  filteredOptionsmitremobile: Observable<Vulns[]>;
  filteredOptionsmitreenterprise: Observable<Vulns[]>;
  filteredOptionsPCIDSS: Observable<string[]>;
  filteredOptionsOWASPtop2017: Observable<Vulns[]>;
  filteredOptionsOWASPtop2021: Observable<Vulns[]>;
  filteredOptionsOWASPTOP10CICD: Observable<Vulns[]>;
  filteredOptionsOWASPTOP10k8s: Observable<Vulns[]>;
  err_msg: string;
  sourceSelect = 'VULNREPO';
  show = false;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  announcer = inject(LiveAnnouncer);
  chipsissue: string[] = [];

  constructor(public router: Router,
    public dialogRef: MatDialogRef<DialogAddissueComponent>, private http: HttpClient,
    private currentdateService: CurrentdateService,
    private apiService: ApiService, private datePipe: DatePipe,
    private indexeddbService: IndexeddbService) {

    this.filteredOptions = this.customissueform.valueChanges
      .pipe(
        startWith<string | Vulns>(''),
        map(value => typeof value === 'string' ? value : value.title),
        map(title => title ? this._filter(title) : this.options.slice())
      );

    this.filteredOptionsCWE = this.cwecontrol.valueChanges
      .pipe(
        startWith<string | Vulns>(''),
        map(value => typeof value === 'string' ? value : value.title),
        map(title => title ? this._filterCWE(title) : this.cwe.slice())
      );

    this.filteredOptionsmitremobile = this.mymobilemitre.valueChanges
      .pipe(
        startWith<string | Vulns>(''),
        map(value => typeof value === 'string' ? value : value.title),
        map(title => title ? this._filtermitremobile(title) : this.mitremobile.slice())
      );

    this.filteredOptionsmitreenterprise = this.myenterprisemitre.valueChanges
      .pipe(
        startWith<string | Vulns>(''),
        map(value => typeof value === 'string' ? value : value.title),
        map(title => title ? this._filtermitreenterprise(title) : this.mitreenterprise.slice())
      );

    this.filteredOptionsPCIDSS = this.myPCI.valueChanges
      .pipe(
        startWith(''),
        map(value => this._filterPCI(value))
      );

      this.filteredOptionsOWASPtop2017 = this.myOWASP2017.valueChanges
      .pipe(
        startWith<string | Vulns>(''),
        map(value => typeof value === 'string' ? value : value.title),
        map(title => title ? this._filterOWASP2017(title) : this.owasptop2017.slice())
      );

      this.filteredOptionsOWASPtop2021 = this.myOWASP2021.valueChanges
      .pipe(
        startWith<string | Vulns>(''),
        map(value => typeof value === 'string' ? value : value.title),
        map(title => title ? this._filterOWASP2021(title) : this.owasptop2021.slice())
      );

      this.filteredOptionsOWASPTOP10CICD = this.myOWASPTOP10CICD.valueChanges
      .pipe(
        startWith<string | Vulns>(''),
        map(value => typeof value === 'string' ? value : value.title),
        map(title => title ? this._filterOWASPTOP10CICD(title) : this.OWASPTOP10CICD.slice())
      );

      this.filteredOptionsOWASPTOP10k8s = this.myOWASPTOP10k8s.valueChanges
      .pipe(
        startWith<string | Vulns>(''),
        map(value => typeof value === 'string' ? value : value.title),
        map(title => title ? this._filterOWASPTOP10k8s(title) : this.OWASPTOP10k8s.slice())
      );
  }

  private _filter(name: string): Vulns[] {
    const filterValue = name.toLowerCase();
    return this.options.filter(option => option.title.toLowerCase().indexOf(filterValue) >= 0);
  }
  private _filterCWE(name: string): Vulns[] {
    const filterValue = name.toLowerCase();
    return this.cwe.filter(option => option.title.toLowerCase().indexOf(filterValue) >= 0);
  }

  private _filtermitremobile(name: string): Vulns[] {
    const filterValue = name.toLowerCase();
    return this.mitremobile.filter(option => option.title.toLowerCase().indexOf(filterValue) >= 0);
  }

  private _filtermitreenterprise(name: string): Vulns[] {
    const filterValue = name.toLowerCase();
    return this.mitreenterprise.filter(option => option.title.toLowerCase().indexOf(filterValue) >= 0);
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

  private _filterOWASP2017(name: string): Vulns[] {
    const filterValue = name.toLowerCase();
    return this.owasptop2017.filter(option => option.title.toLowerCase().indexOf(filterValue) >= 0);
  }

  private _filterOWASP2021(name: string): Vulns[] {
    const filterValue = name.toLowerCase();
    return this.owasptop2021.filter(option => option.title.toLowerCase().indexOf(filterValue) >= 0);
  }

  private _filterOWASPTOP10CICD(name: string): Vulns[] {
    const filterValue = name.toLowerCase();
    return this.OWASPTOP10CICD.filter(option => option.title.toLowerCase().indexOf(filterValue) >= 0);
  }

  private _filterOWASPTOP10k8s(name: string): Vulns[] {
    const filterValue = name.toLowerCase();
    return this.OWASPTOP10k8s.filter(option => option.title.toLowerCase().indexOf(filterValue) >= 0);
  }

  ngOnInit() {

    this.indexeddbService.retrieveReportTemplates().then(ret => {
      if (ret) {
        this.http.get<any>('/assets/vulns.json?v=' + + new Date()).subscribe(res => {
          this.options = [...res,...ret];
        });
      }
    });

    this.http.get<any>('/assets/CWE_V.4.3.json?v=' + + new Date()).subscribe(res => {
      this.cwe = res;
    });

    this.http.get<any>('/assets/mobile-attack.json?v=' + + new Date()).subscribe(res => {
      this.mitremobile = res;
    });

    this.http.get<any>('/assets/enterprise-attack.json?v=' + + new Date()).subscribe(res => {
      this.mitreenterprise = res;
    });

    this.http.get<any>('/assets/pcidssv3.2.1.json?v=' + + new Date()).subscribe(res => {
      this.pcidssv3 = res;
    });

    this.http.get<any>('/assets/OWASPtop102017.json?v=' + + new Date()).subscribe(res => {
      this.owasptop2017 = res;
    });

    this.http.get<any>('/assets/OWASPtop102021.json?v=' + + new Date()).subscribe(res => {
      this.owasptop2021 = res;
    });

    this.http.get<any>('/assets/OWASPtop10cicd.json?v=' + + new Date()).subscribe(res => {
      this.OWASPTOP10CICD = res;
    });

    this.http.get<any>('/assets/OWASPtop10k8s.json?v=' + + new Date()).subscribe(res => {
      this.OWASPTOP10k8s = res;
    });

  }

  cancel(): void {
    this.dialogRef.close();
  }

  getcurrentDate(): number {
    return this.currentdateService.getcurrentDate();
  }

  addIssue() {

    if (this.customissueform.value !== "" && this.customissueform.value !== null) {
      this.chipsissue.push(this.customissueform.value);
    }

    let exitel = [];
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
                tags: [],
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
      this.customissueform.setErrors({'notempty': true});
      this.gridaction.setErrors({'notempty': true});
    }

  }


  addIssueCWE() {
    const data = this.cwecontrol.value;
    if (data !== '' && data !== null) {
      for (const key in this.cwe) {
        if (this.cwe.hasOwnProperty(key)) {

          if (this.cwe[key].title === data) {
            const def = {
              title: this.cwe[key].title,
              poc: this.cwe[key].poc,
              files: [],
              desc: this.cwe[key].desc,
              severity: this.cwe[key].severity,
              status: 1,
              ref: this.cwe[key].ref,
              cvss: this.cwe[key].cvss,
              cvss_vector: '',
              cve: this.cwe[key].cve,
              tags: [],
              bounty: [],
              date: this.getcurrentDate()
            };
            this.dialogRef.close(def);
            break;

          } else {
            this.cwecontrol.setErrors({'cantfind': true});
          }

        }
      }
    } else {
      this.cwecontrol.setErrors({'notempty': true});
    }

  }

  displayFn(template?: Vulns): string | undefined {
    return template ? template.title : undefined;
  }

  changeselect() {
    this.err_msg = '';
    this.show = false;
  }

  addCVE() {
    this.err_msg = '';
    let severity = 'Info';
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

          if (resp !== null && resp !== undefined) {
            // if everything OK
            if (resp.id) {
              let cvetitle = '';

              if (resp.refmap) {

                if (resp.refmap.xf) {
                  cvetitle = resp.refmap.xf;
                }
                if (resp.refmap.vupen) {
                  cvetitle = resp.refmap.vupen;
                }
                if (resp.refmap.mlist) {
                  cvetitle = resp.refmap.mlist[0];
                }
                if (resp.refmap.bugtraq) {
                  cvetitle = resp.refmap.bugtraq[0];
                }
                if (resp.refmap.idefense) {
                  cvetitle = resp.refmap.idefense;
                }

              }

              if (resp.saint) {
                cvetitle = resp.saint[0].description;
              }

              if (resp.redhat) {
                if (resp.redhat.advisories) {
                  if (resp.redhat.advisories[0].bugzilla) {
                    cvetitle = resp.redhat.advisories[0].bugzilla.title;
                  }
                }
              }

              if (cvetitle === '') {
                cvetitle = resp.id;
              }

              if (resp.cvss) {
                for (let _i = 0; _i < severityRatings.length; _i++) {
                  if (severityRatings[_i].bottom <= resp.cvss && severityRatings[_i].top >= resp.cvss) {
                    severity = severityRatings[_i].name;
                  }
                }
              }
              let refer = '';
              if (resp.references) {

                for (let _i = 0; _i < resp.references.length; _i++) {
                  refer += resp.references[_i] + '\n';
                }

              }

              let pocgithub = '';
              for (let _i = 0; _i < resp.githubpoc.items.length; _i++) {
                pocgithub += resp.githubpoc.items[_i].html_url + '\n';
              }

              const def = {
                title: cvetitle,
                poc: pocgithub,
                files: [],
                desc: resp.summary,
                severity: severity,
                status: 1,
                ref: refer,
                cvss: resp.cvss,
                cvss_vector: '',
                cve: resp.id,
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
            this.mycve.setErrors({'cve_notfound': true});
          }

        });

      } else {
        this.show = false;
        this.mycve.setErrors({'cve_format_error': true});
      }

    } else {
      this.show = false;
      this.mycve.setErrors({'notempty': true});
    }

  }

  addattackMobile() {

    const data = this.mymobilemitre.value;
    if (data !== '' && data !== null) {
      for (const key in this.mitremobile) {
        if (this.mitremobile.hasOwnProperty(key)) {

          if (this.mitremobile[key].title === data) {
            const def = {
              title: this.mitremobile[key].title,
              poc: this.mitremobile[key].poc,
              files: [],
              desc: this.mitremobile[key].desc,
              severity: this.mitremobile[key].severity,
              status: 1,
              ref: this.mitremobile[key].ref,
              cvss: this.mitremobile[key].cvss,
              cvss_vector: '',
              cve: this.mitremobile[key].cve,
              tags: [],
              bounty: [],
              date: this.getcurrentDate()
            };
            this.dialogRef.close(def);
            break;

          } else {
            this.mymobilemitre.setErrors({'cantfind': true});
          }

        }
      }
    } else {
      this.mymobilemitre.setErrors({'notempty': true});
    }


  }

  addattackEnterprise() {

    const data = this.myenterprisemitre.value;
    if (data !== '' && data !== null) {
      for (const key in this.mitreenterprise) {
        if (this.mitreenterprise.hasOwnProperty(key)) {

          if (this.mitreenterprise[key].title === data) {
            const def = {
              title: this.mitreenterprise[key].title,
              poc: this.mitreenterprise[key].poc,
              files: [],
              desc: this.mitreenterprise[key].desc,
              severity: this.mitreenterprise[key].severity,
              status: 1,
              ref: this.mitreenterprise[key].ref,
              cvss: this.mitreenterprise[key].cvss,
              cvss_vector: '',
              cve: this.mitreenterprise[key].cve,
              tags: [],
              bounty: [],
              date: this.getcurrentDate()
            };
            this.dialogRef.close(def);
            break;

          } else {
            this.myenterprisemitre.setErrors({'cantfind': true});
          }

        }
      }
    } else {
      this.myenterprisemitre.setErrors({'notempty': true});
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
              this.myPCI.setErrors({'cantfind': true});
            }

          }

        }
      }
    } else {
      this.myPCI.setErrors({'notempty': true});
    }

  }


  addOWASPtop2017() {
    const data = this.myOWASP2017.value;
    if (data !== '' && data !== null) {
      for (const key in this.owasptop2017) {
        if (this.owasptop2017.hasOwnProperty(key)) {

          if (this.owasptop2017[key].title === data) {
            const def = {
              title: this.owasptop2017[key].title,
              poc: this.owasptop2017[key].poc,
              files: [],
              desc: this.owasptop2017[key].desc,
              severity: this.owasptop2017[key].severity,
              status: 1,
              ref: this.owasptop2017[key].ref,
              cvss: this.owasptop2017[key].cvss,
              cvss_vector: '',
              cve: this.owasptop2017[key].cve,
              tags: [],
              bounty: [],
              date: this.getcurrentDate()
            };
            this.dialogRef.close(def);
            break;

          } else {
            this.myOWASP2017.setErrors({'cantfind': true});
          }

        }
      }
    } else {
      this.myOWASP2017.setErrors({'notempty': true});
    }

  }

  addOWASPtop2021() {
    const data = this.myOWASP2021.value;
    if (data !== '' && data !== null) {
      for (const key in this.owasptop2021) {
        if (this.owasptop2021.hasOwnProperty(key)) {

          if (this.owasptop2021[key].title === data) {
            const def = {
              title: this.owasptop2021[key].title,
              poc: this.owasptop2021[key].poc,
              files: [],
              desc: this.owasptop2021[key].desc,
              severity: this.owasptop2021[key].severity,
              status: 1,
              ref: this.owasptop2021[key].ref,
              cvss: this.owasptop2021[key].cvss,
              cvss_vector: '',
              cve: this.owasptop2021[key].cve,
              tags: [],
              bounty: [],
              date: this.getcurrentDate()
            };
            this.dialogRef.close(def);
            break;

          } else {
            this.myOWASP2021.setErrors({'cantfind': true});
          }

        }
      }
    } else {
      this.myOWASP2021.setErrors({'notempty': true});
    }

  }


  addOWASPTOP10CICD() {
    const data = this.myOWASPTOP10CICD.value;
    if (data !== '' && data !== null) {
      for (const key in this.OWASPTOP10CICD) {
        if (this.OWASPTOP10CICD.hasOwnProperty(key)) {

          if (this.OWASPTOP10CICD[key].title === data) {
            const def = {
              title: this.OWASPTOP10CICD[key].title,
              poc: this.OWASPTOP10CICD[key].poc,
              files: [],
              desc: this.OWASPTOP10CICD[key].desc,
              severity: this.OWASPTOP10CICD[key].severity,
              status: 1,
              ref: this.OWASPTOP10CICD[key].ref,
              cvss: this.OWASPTOP10CICD[key].cvss,
              cvss_vector: '',
              cve: this.OWASPTOP10CICD[key].cve,
              tags: [],
              bounty: [],
              date: this.getcurrentDate()
            };
            this.dialogRef.close(def);
            break;

          } else {
            this.myOWASPTOP10CICD.setErrors({'cantfind': true});
          }

        }
      }
    } else {
      this.myOWASPTOP10CICD.setErrors({'notempty': true});
    }

  }

  addOWASPTOP10k8s() {
    const data = this.myOWASPTOP10k8s.value;
    if (data !== '' && data !== null) {
      for (const key in this.OWASPTOP10k8s) {
        if (this.OWASPTOP10k8s.hasOwnProperty(key)) {

          if (this.OWASPTOP10k8s[key].title === data) {
            const def = {
              title: this.OWASPTOP10k8s[key].title,
              poc: this.OWASPTOP10k8s[key].poc,
              files: [],
              desc: this.OWASPTOP10k8s[key].desc,
              severity: this.OWASPTOP10k8s[key].severity,
              status: 1,
              ref: this.OWASPTOP10k8s[key].ref,
              cvss: this.OWASPTOP10k8s[key].cvss,
              cvss_vector: '',
              cve: this.OWASPTOP10k8s[key].cve,
              tags: [],
              bounty: [],
              date: this.getcurrentDate()
            };
            this.dialogRef.close(def);
            break;

          } else {
            this.myOWASPTOP10k8s.setErrors({'cantfind': true});
          }

        }
      }
    } else {
      this.myOWASPTOP10k8s.setErrors({'notempty': true});
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
