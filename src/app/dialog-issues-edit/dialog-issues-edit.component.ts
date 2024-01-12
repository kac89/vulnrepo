import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UtilsService } from '../utils.service';

@Component({
  selector: 'app-dialog-issues-edit',
  templateUrl: './dialog-issues-edit.component.html',
  styleUrl: './dialog-issues-edit.component.scss',
  standalone: false
})
export class DialogIssuesEditComponent implements OnInit {

  isReturn = [];
  selected_items_true = [];
  selseverity = '';
  selstatus = '';

  tableseverity = [];
  tablestatus = [];

  constructor(public dialogRef: MatDialogRef<DialogIssuesEditComponent>, @Inject(MAT_DIALOG_DATA) public data: any, private utilsService: UtilsService) {

  }


  ngOnInit() {

    this.data.sel.forEach((item, index) => {
      if (item === true) {
        this.isReturn.push(this.data.orig[index]);
      }
  });

  this.selected_items_true = this.data.sel.filter(item => item === true);

  this.tableseverity = this.utilsService.severitytable;
  this.tablestatus = this.utilsService.issueStatustable;
  
  }

  applychanges() {

    if(this.selseverity !== '0' && this.selseverity !== '') {

      console.log('severity change');

      this.isReturn.forEach((itemGroup, index) => {
        if (this.isReturn[index]) {
          this.isReturn[index].severity = this.utilsService.setseverity(this.selseverity);
        }
      });


    }

    if(this.selstatus !== '0' && this.selstatus !== '') {

      console.log('status change');
      this.isReturn.forEach((itemGroup, index) => {
        if (this.isReturn[index]) {
          this.isReturn[index].status = Number(this.selstatus);
        }
      });

    }
    this.dialogRef.close(this.isReturn);
  }

  closedialog(): void {
    this.dialogRef.close();
  }
}
