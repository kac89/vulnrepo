import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UntypedFormControl } from '@angular/forms';

@Component({
  selector: 'app-dialog-edit',
  templateUrl: './dialog-edit.component.html',
  styleUrls: ['./dialog-edit.component.scss']
})
export class DialogEditComponent implements OnInit {
  title = new UntypedFormControl();
  reportname = new UntypedFormControl();
  col1 = false;
  col2 = false;
  col3 = false;
  col4 = false;
  col5 = false;

  constructor(public dialogRef: MatDialogRef<DialogEditComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {


  }

  ngOnInit() {

    if (this.data.report_name) {
      this.col1 = true;
      this.reportname.setValue(this.data.report_name);
    }
    if (this.data.title) {
      this.col2 = true;
      this.title.setValue(this.data.title);
    }

    if (this.data[0] !== undefined) {
      if (this.data[0].remo === 'remove') {
        this.col3 = true;
      }
      if (this.data[0].remo === 'changelog') {
        this.col4 = true;
      }
      if (this.data[0].remo === 'removereport') {
        this.col5 = true;
      }
    }


  }

  removeissue(item): void {
    this.dialogRef.close(item);
  }
  removechangelog(item): void {
    this.dialogRef.close(item);
  }
  removeReport(item): void {
    this.dialogRef.close(item);
  }
  cancel(): void {
    this.dialogRef.close();
  }

  changeissuetitle() {
    if (this.title.value !== '') {
      if (this.data.title !== this.title.value) {
        this.data.title = this.title.value;
        this.dialogRef.close(this.data);
      } else {
        this.dialogRef.close('nochanges');
      }
    } else {
      this.title.setErrors({'notempty': true});
    }

    
  }

  changereportname() {


    if (this.reportname.value !== '') {
      if (this.data.report_name !== this.reportname.value) {
        this.data.report_name = this.reportname.value;
        this.dialogRef.close(this.reportname.value);
      } else {
        this.dialogRef.close('nochanges');
      }
    } else {
      this.reportname.setErrors({'notempty': true});
    }


    
  }

}
