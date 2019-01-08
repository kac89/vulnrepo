import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

export interface Vulns {
  title: string;
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


  constructor(public dialogRef: MatDialogRef<DialogAddissueComponent>, private http: Http) {

    this.filteredOptions = this.myControl.valueChanges
      .pipe(
        startWith<string | Vulns>(''),
        map(value => typeof value === 'string' ? value : value.title),
        map(title => title ? this._filter(title) : this.options.slice())
      );

  }



  ngOnInit() {

    this.http.get('/assets/vulns.json?v=' + new Date()).subscribe(res => {
      this.options = res.json();
    });

  }

  cancel(): void {
    this.dialogRef.close();
  }

  addIssue(data) {

    for (const key in this.options) {
      if (this.options.hasOwnProperty(key)) {

        if (this.options[key].title === data) {
          console.log('found');
          this.dialogRef.close(this.options[key]);
          break;

        } else if (Number(key) + 1 === this.options.length) {

          const today: number = Date.now();

          const def = {
            title: data,
            poc: '',
            files: [],
            desc: '',
            severity: '',
            ref: '',
            cvss: '',
            cve: '',
            date: today
          };
          this.dialogRef.close(def);
        }


      }
    }


  }

  displayFn(template?: Vulns): string | undefined {
    return template ? template.title : undefined;
  }

  private _filter(name: string): Vulns[] {
    const filterValue = name.toLowerCase();
    return this.options.filter(option => option.title.toLowerCase().indexOf(filterValue) === 0);
  }

}
