import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-removeitems',
  templateUrl: './dialog-removeitems.component.html',
  styleUrls: ['./dialog-removeitems.component.scss']
})
export class DialogRemoveitemsComponent implements OnInit {
  isReturn = [];
  constructor(public dialogRef: MatDialogRef<DialogRemoveitemsComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit() {

    this.data.sel.forEach((item, index) => {
        if (item === true) {
          this.isReturn.push(this.data.orig[index]);
        }
    });

  }

  cancel(): void {
    this.dialogRef.close();
  }

  removefromreport() {
    this.dialogRef.close(this.isReturn);
  }

}
