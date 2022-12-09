import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-reportcss',
  templateUrl: './dialog-reportcss.component.html',
  styleUrls: ['./dialog-reportcss.component.scss']
})
export class DialogReportcssComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<DialogReportcssComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit(): void {
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
