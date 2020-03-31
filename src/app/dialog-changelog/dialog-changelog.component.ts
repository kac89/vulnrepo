import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-changelog',
  templateUrl: './dialog-changelog.component.html',
  styleUrls: ['./dialog-changelog.component.scss']
})
export class DialogChangelogComponent implements OnInit {

  mydata: any;
  today = Date.now();

  constructor(public dialogRef: MatDialogRef<DialogChangelogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit() {
  }

  addChangelog(date, desc) {
    this.dialogRef.close({date: new Date(date).getTime(), desc: desc});
  }

  editChangelog(date, desc, data) {
    const xta = {date: new Date(date).getTime(), desc: desc, origi: data};
    this.dialogRef.close(xta);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
