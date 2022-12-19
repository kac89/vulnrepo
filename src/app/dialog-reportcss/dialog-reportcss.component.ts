import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dialog-reportcss',
  templateUrl: './dialog-reportcss.component.html',
  styleUrls: ['./dialog-reportcss.component.scss']
})
export class DialogReportcssComponent implements OnInit {

  report_css = "";
  constructor(private http: HttpClient, public dialogRef: MatDialogRef<DialogReportcssComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit(): void {
  }

  cancel(): void {
    this.dialogRef.close();
  }


  savechange() {
    this.dialogRef.close(this.data.report_settings.report_css);
  }


  selectcss(event) {

    console.log(event);
    console.log(this.data);

    if (event.value === 'monospace') {

      this.http.get('/assets/report-css/monospace.css', { responseType: 'text' }).subscribe(ret => {
        this.report_css = ret;
        console.log(this.report_css);
        this.data.report_settings.report_css = ret;
      });

    }



  }

}
