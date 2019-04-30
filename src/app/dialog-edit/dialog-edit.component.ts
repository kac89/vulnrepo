import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-dialog-edit',
  templateUrl: './dialog-edit.component.html',
  styleUrls: ['./dialog-edit.component.scss']
})
export class DialogEditComponent implements OnInit {
  myControl = new FormControl();
  col1 = false;
  col2 = false;
  col3 = false;
  col4 = false;

  constructor(public dialogRef: MatDialogRef<DialogEditComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {


  }

  ngOnInit() {

    if (this.data.report_name) {
      this.col1 = true;
    }
    if (this.data.title) {
      this.col2 = true;
    }

    if (this.data[0] !== undefined) {
      if (this.data[0].remo === 'remove') {
        this.col3 = true;
      }
      if (this.data[0].remo === 'changelog') {
        this.col4 = true;
      }
    }


  }

  removeissue(item): void {
    this.dialogRef.close(item);
  }
  removechangelog(item): void {
    this.dialogRef.close(item);
  }
  cancel(): void {
    this.dialogRef.close();
  }


}
