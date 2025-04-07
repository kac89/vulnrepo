import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  standalone: false,
  //imports: [],
  selector: 'app-dialog-removeitems',
  templateUrl: './dialog-removeitems.component.html',
  styleUrls: ['./dialog-removeitems.component.scss']
})
export class DialogRemoveitemsComponent implements OnInit {
  isReturn:any = [];
  // @ts-ignore
  constructor(public dialogRef: MatDialogRef<DialogRemoveitemsComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit() {

    if(this.data.sel) {
      this.data.sel.forEach((item, index) => {
        if (item.data) {
          
          const index2: number = this.data.orig.findIndex(i => i === item.data)
          if (index2 !== -1) {
            this.isReturn.push(this.data.orig[index2]);
          }
  
        }
    });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  removefromreport() {
    this.dialogRef.close(this.isReturn);
  }

}
