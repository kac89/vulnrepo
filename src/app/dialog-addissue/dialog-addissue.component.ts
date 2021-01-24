import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Http } from '@angular/http';
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

@Component({
  selector: 'app-dialog-addissue',
  templateUrl: './dialog-addissue.component.html',
  styleUrls: ['./dialog-addissue.component.scss']
})
export class DialogAddissueComponent implements OnInit {
  myControl = new FormControl();
  myControl2 = new FormControl();
  mycve = new FormControl();
  options: Vulns[] = [];
  cwe: Vulns[] = [];
  filteredOptions: Observable<Vulns[]>;
  filteredOptionsCWE: Observable<Vulns[]>;
  err_msg: string;
  sourceSelect = 'VULNREPO';
  show = false;

  constructor(public router: Router,
    public dialogRef: MatDialogRef<DialogAddissueComponent>, private http: Http,
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
        map(title => title ? this._filter2(title) : this.cwe.slice())
      );

  }

  private _filter(name: string): Vulns[] {
    const filterValue = name.toLowerCase();
    return this.options.filter(option => option.title.toLowerCase().indexOf(filterValue) >= 0);
  }
  private _filter2(name: string): Vulns[] {
    const filterValue = name.toLowerCase();
    return this.cwe.filter(option => option.title.toLowerCase().indexOf(filterValue) >= 0);
  }
  ngOnInit() {

    this.http.get('/assets/vulns.json?v=' + + new Date()).subscribe(res => {
      this.options = res.json();
    });

    this.http.get('/assets/CWE_V.4.3.json?v=' + + new Date()).subscribe(res => {
      this.cwe = res.json();
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
              ref: this.options[key].ref,
              cvss: this.options[key].cvss,
              cve: this.options[key].cve,
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
              ref: '',
              cvss: '',
              cve: '',
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
              ref: this.cwe[key].ref,
              cvss: this.cwe[key].cvss,
              cve: this.cwe[key].cve,
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
                ref: refer,
                cvss: resp.cvss,
                cve: resp.id,
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

}
