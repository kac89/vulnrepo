import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-changekey',
  templateUrl: './dialog-changekey.component.html',
  styleUrls: ['./dialog-changekey.component.scss']
})
export class DialogChangekeyComponent implements OnInit {
  alert: string;
  hide = true;

  constructor(public dialogRef: MatDialogRef<DialogChangekeyComponent>) { }

  ngOnInit() {
  }

  changeseckey(pass: string, pass2: string) {

    if ((pass.length >= 8) && (pass2.length >= 8)) {

      if (pass === pass2) {
        this.dialogRef.close(pass);
      } else {
        this.alert = 'The given passwords do not match. Try again.';
      }

    } else {
      this.alert = 'Security key is too weak. Try again.';
    }


  }

  cancel(): void {
    this.dialogRef.close();
  }

}
