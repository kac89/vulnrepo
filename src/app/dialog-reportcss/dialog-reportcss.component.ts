import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { UntypedFormControl } from '@angular/forms';

@Component({
  selector: 'app-dialog-reportcss',
  templateUrl: './dialog-reportcss.component.html',
  styleUrls: ['./dialog-reportcss.component.scss']
})
export class DialogReportcssComponent implements OnInit {

  report_css = new UntypedFormControl();

  constructor(private http: HttpClient, public dialogRef: MatDialogRef<DialogReportcssComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit(): void {
    if(this.data.report_settings) {
      this.report_css.setValue(this.data.report_settings.report_css);
    } else {
      this.report_css.setValue(this.data);
    }
    
  }

  cancel(): void {
    this.dialogRef.close();
  }

  savechange() {
    this.dialogRef.close(this.report_css.value);
  }

  selectcss(event) {
    if (event.value === 'none') {
      this.report_css.setValue('');
    }
    if (event.value === 'monospace') {
      this.http.get('/assets/report-css/monospace.css', { responseType: 'text' }).subscribe(ret => {
        this.report_css.setValue(ret);
      });
    }
    if (event.value === 'cypher') {
      this.http.get('/assets/report-css/cypher.css', { responseType: 'text' }).subscribe(ret => {
        this.report_css.setValue(ret);
      });
    }
  }

}
