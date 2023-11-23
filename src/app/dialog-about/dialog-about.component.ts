import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { version } from "../../version";

@Component({
  selector: 'app-dialog-about',
  templateUrl: './dialog-about.component.html',
  styleUrls: ['./dialog-about.component.scss']
})
export class DialogAboutComponent implements OnInit {

  app_ver = '';
  app_ver_short = '';

  constructor(public dialogRef: MatDialogRef<DialogAboutComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {

  }


  ngOnInit() {
    this.app_ver = version.number;
    
    if (this.app_ver !== ''){
      this.app_ver_short = this.app_ver.substring(0, 7)
    } else {
      this.app_ver_short = 'N/A';
    }
  }

  closedialog(): void {
    this.dialogRef.close();
  }



}
