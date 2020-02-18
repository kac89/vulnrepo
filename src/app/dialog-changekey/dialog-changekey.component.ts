import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-changekey',
  templateUrl: './dialog-changekey.component.html',
  styleUrls: ['./dialog-changekey.component.scss']
})
export class DialogChangekeyComponent implements OnInit {
  alert: string;

  constructor(public dialogRef: MatDialogRef<DialogChangekeyComponent>) { }

  ngOnInit() {
  }

  changeseckey(pass: string, pass2: string) {

    if (pass === pass2) {
      this.dialogRef.close(pass);
    } else {
      this.alert = 'The given passwords do not match. Try again.';
    }

  }

  cancel(): void {
    this.dialogRef.close();
  }

}
