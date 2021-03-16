import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-customcontent',
  templateUrl: './dialog-customcontent.component.html',
  styleUrls: ['./dialog-customcontent.component.scss']
})
export class DialogCustomcontentComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<DialogCustomcontentComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit(): void {
  }

  cancel(): void {
    this.dialogRef.close();
  }

}
