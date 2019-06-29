import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { DatePipe } from '@angular/common';

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
  options: Vulns[] = [];
  filteredOptions: Observable<Vulns[]>;
  err_msg: string;


  constructor(public dialogRef: MatDialogRef<DialogAddissueComponent>, private http: Http, private datePipe: DatePipe) {

    this.filteredOptions = this.myControl.valueChanges
      .pipe(
        startWith<string | Vulns>(''),
        map(value => typeof value === 'string' ? value : value.title),
        map(title => title ? this._filter(title) : this.options.slice())
      );

  }

  private _filter(name: string): Vulns[] {
    const filterValue = name.toLowerCase();
    return this.options.filter(option => option.title.toLowerCase().indexOf(filterValue) >= 0);
  }

  ngOnInit() {

    this.http.get('/assets/vulns.json?v=' + + new Date()).subscribe(res => {
      this.options = res.json();
    });

  }

  cancel(): void {
    this.dialogRef.close();
  }

  addIssue(data) {

    if (data !== '') {
      for (const key in this.options) {
        if (this.options.hasOwnProperty(key)) {

          if (this.options[key].title === data) {
            console.log('found');

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
      console.log('Empty title!!!');
      this.err_msg = 'Please add title!';
    }

  }

  displayFn(template?: Vulns): string | undefined {
    return template ? template.title : undefined;
  }



}
