import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';

export interface Vulns {
  title: string;
  cve: string;
  cvss: number;
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
  styleUrls: ['./dialog-addissue.component.scss']
})
export class DialogAddissueComponent implements OnInit {
  myControl = new FormControl();
  myControl2 = new FormControl();
  mycve = new FormControl();
  mymobilemitre = new FormControl();
  myenterprisemitre = new FormControl();
  myPCI = new FormControl();
  myOWASP = new FormControl();
  options: Vulns[] = [];
  cwe: Vulns[] = [];
  mitremobile: Vulns[] = [];
  mitreenterprise: Vulns[] = [];
  pcidssv3: any;
  owasptop: Vulns[] = [];
  filteredOptions: Observable<Vulns[]>;
  filteredOptionsCWE: Observable<Vulns[]>;
  filteredOptionsmitremobile: Observable<Vulns[]>;
  filteredOptionsmitreenterprise: Observable<Vulns[]>;
  filteredOptionsPCIDSS: Observable<string[]>;
  filteredOptionsOWASPtop: Observable<Vulns[]>;
  err_msg: string;
  sourceSelect = 'VULNREPO';
  show = false;

  constructor(public router: Router,
    public dialogRef: MatDialogRef<DialogAddissueComponent>, private http: HttpClient,
    private apiService: ApiService, private datePipe: DatePipe) {

    this.filteredOptions = this.myControl.valueChanges
      .pipe(
        startWith<string | Vulns>(''),
        map(value => typeof value === 'string' ? value : value.title),
        map(title => title ? this._filter(title) : this.options.slice())
      );

    this.filteredOptionsCWE = this.myControl2.valueChanges
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

      this.filteredOptionsOWASPtop = this.myOWASP.valueChanges
      .pipe(
        startWith<string | Vulns>(''),
        map(value => typeof value === 'string' ? value : value.title),
        map(title => title ? this._filterOWASP(title) : this.owasptop.slice())
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

  private _filterOWASP(name: string): Vulns[] {
    const filterValue = name.toLowerCase();
    return this.owasptop.filter(option => option.title.toLowerCase().indexOf(filterValue) >= 0);
  }

  ngOnInit() {

    this.http.get<any>('/assets/vulns.json?v=' + + new Date()).subscribe(res => {
      this.options = res;
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

    this.http.get<any>('/assets/OWASPtop10.json?v=' + + new Date()).subscribe(res => {
      this.owasptop = res;
    });

  }

  redir(): void {
    this.dialogRef.close();
    this.router.navigate(['/vuln-list']);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  addIssue() {
    const data = this.myControl.value;
    if (data !== '' && data !== null) {
      for (const key in this.options) {
        if (this.options.hasOwnProperty(key)) {

          if (this.options[key].title === data) {
            const date = new Date();
            const today = this.datePipe.transform(date, 'yyyy-MM-dd');
            const def = {
              title: this.options[key].title,
              poc: this.options[key].poc,
              files: [],
              desc: this.options[key].desc,
              severity: this.options[key].severity,
              status: 1,
              ref: this.options[key].ref,
              cvss: this.options[key].cvss,
              cve: this.options[key].cve,
              tags: [],
              bounty: [],
              date: today + ''
            };
            this.dialogRef.close(def);
            break;

          } else if (Number(key) + 1 === this.options.length) {

            const date = new Date();
            const today = this.datePipe.transform(date, 'yyyy-MM-dd');

            const def = {
              title: data,
              poc: '',
              files: [],
              desc: '',
              severity: '',
              status: 1,
              ref: '',
              cvss: '',
              cve: '',
              tags: [],
              bounty: [],
              date: today + ''
            };
            this.dialogRef.close(def);
          }


        }
      }
    } else {
      this.err_msg = 'Please add title!';
    }

  }


  addIssueCWE() {
    const data = this.myControl2.value;
    if (data !== '' && data !== null) {
      for (const key in this.cwe) {
        if (this.cwe.hasOwnProperty(key)) {

          if (this.cwe[key].title === data) {
            const date = new Date();
            const today = this.datePipe.transform(date, 'yyyy-MM-dd');
            const def = {
              title: this.cwe[key].title,
              poc: this.cwe[key].poc,
              files: [],
              desc: this.cwe[key].desc,
              severity: this.cwe[key].severity,
              status: 1,
              ref: this.cwe[key].ref,
              cvss: this.cwe[key].cvss,
              cve: this.cwe[key].cve,
              tags: [],
              bounty: [],
              date: today + ''
            };
            this.dialogRef.close(def);
            break;

          } else {
            this.err_msg = 'Can\'t find ' + data;
          }

        }
      }
    } else {
      this.err_msg = 'Please add title!';
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
              const date = new Date();
              const today = this.datePipe.transform(date, 'yyyy-MM-dd');

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

              const def = {
                title: cvetitle,
                poc: '',
                files: [],
                desc: resp.summary,
                severity: severity,
                status: 1,
                ref: refer,
                cvss: resp.cvss,
                cve: resp.id,
                bounty: [],
                tags: [],
                date: today + ''
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
            this.err_msg = 'CVE not found.';
          }

        });

      } else {
        this.show = false;
        this.err_msg = 'CVE format error.';
      }

    } else {
      this.show = false;
      this.err_msg = 'Empty field?.';
    }

  }

  addattackMobile() {

    const data = this.mymobilemitre.value;
    if (data !== '' && data !== null) {
      for (const key in this.mitremobile) {
        if (this.mitremobile.hasOwnProperty(key)) {

          if (this.mitremobile[key].title === data) {
            const date = new Date();
            const today = this.datePipe.transform(date, 'yyyy-MM-dd');
            const def = {
              title: this.mitremobile[key].title,
              poc: this.mitremobile[key].poc,
              files: [],
              desc: this.mitremobile[key].desc,
              severity: this.mitremobile[key].severity,
              status: 1,
              ref: this.mitremobile[key].ref,
              cvss: this.mitremobile[key].cvss,
              cve: this.mitremobile[key].cve,
              tags: [],
              bounty: [],
              date: today + ''
            };
            this.dialogRef.close(def);
            break;

          } else {
            this.err_msg = 'Can\'t find ' + data;
          }

        }
      }
    } else {
      this.err_msg = 'Please add title!';
    }


  }

  addattackEnterprise() {

    const data = this.myenterprisemitre.value;
    if (data !== '' && data !== null) {
      for (const key in this.mitreenterprise) {
        if (this.mitreenterprise.hasOwnProperty(key)) {

          if (this.mitreenterprise[key].title === data) {
            const date = new Date();
            const today = this.datePipe.transform(date, 'yyyy-MM-dd');
            const def = {
              title: this.mitreenterprise[key].title,
              poc: this.mitreenterprise[key].poc,
              files: [],
              desc: this.mitreenterprise[key].desc,
              severity: this.mitreenterprise[key].severity,
              status: 1,
              ref: this.mitreenterprise[key].ref,
              cvss: this.mitreenterprise[key].cvss,
              cve: this.mitreenterprise[key].cve,
              tags: [],
              bounty: [],
              date: today + ''
            };
            this.dialogRef.close(def);
            break;

          } else {
            this.err_msg = 'Can\'t find ' + data;
          }

        }
      }
    } else {
      this.err_msg = 'Please add title!';
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

              const date = new Date();
              const today = this.datePipe.transform(date, 'yyyy-MM-dd');
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
                cve: '',
                tags: [],
                bounty: [],
                date: today + ''
              };
              this.dialogRef.close(def);
              break;

            } else {
              this.err_msg = 'Can\'t find ' + data;
            }

          }

        }
      }
    } else {
      this.err_msg = 'Please add title!';
    }


  }


  addOWASPtop() {
    const data = this.myOWASP.value;
    if (data !== '' && data !== null) {
      for (const key in this.owasptop) {
        if (this.owasptop.hasOwnProperty(key)) {

          if (this.owasptop[key].title === data) {
            const date = new Date();
            const today = this.datePipe.transform(date, 'yyyy-MM-dd');
            const def = {
              title: this.owasptop[key].title,
              poc: this.owasptop[key].poc,
              files: [],
              desc: this.owasptop[key].desc,
              severity: this.owasptop[key].severity,
              status: 1,
              ref: this.owasptop[key].ref,
              cvss: this.owasptop[key].cvss,
              cve: this.owasptop[key].cve,
              tags: [],
              bounty: [],
              date: today + ''
            };
            this.dialogRef.close(def);
            break;

          } else {
            this.err_msg = 'Can\'t find ' + data;
          }

        }
      }
    } else {
      this.err_msg = 'Please add title!';
    }

  }


}
