import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  standalone: false,
  //imports: [],
  selector: 'app-dialog-changelog',
  templateUrl: './dialog-changelog.component.html',
  styleUrls: ['./dialog-changelog.component.scss']
})
export class DialogChangelogComponent implements OnInit {

  mydata: any;
  today = Date.now();
  // @ts-ignore
  constructor(public dialogRef: MatDialogRef<DialogChangelogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit() {
  }

  addChangelog(date, desc, version) {
    const entry: any = {date: new Date(date).getTime(), desc: desc};
    if (version && version.trim()) { entry.version = version.trim(); }
    this.dialogRef.close(entry);
  }

  editChangelog(date, desc, version, data) {
    const entry: any = {date: new Date(date).getTime(), desc: desc, origi: data};
    if (version && version.trim()) { entry.version = version.trim(); }
    this.dialogRef.close(entry);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
