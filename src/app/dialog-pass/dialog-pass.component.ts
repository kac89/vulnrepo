import { Component, OnInit } from '@angular/core';
import { Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { IndexeddbService } from '../indexeddb.service';
import { UntypedFormControl } from '@angular/forms';

@Component({
  selector: 'app-dialog-pass',
  templateUrl: './dialog-pass.component.html',
  styleUrls: ['./dialog-pass.component.scss']
})
export class DialogPassComponent implements OnInit {
  hide = true;
  msg = '';
  insertpass = new UntypedFormControl();

  constructor(public router: Router, private indexeddbService: IndexeddbService,
    public dialogRef: MatDialogRef<DialogPassComponent>,
    @Inject(MAT_DIALOG_DATA) public data) {
    }

  cancel(): void {
    this.dialogRef.close();
    this.router.navigate(['/my-reports']);
  }
  ngOnInit() {
    this.insertpass.setValue("");
  }

  onKeydown(event, pass: string, report_id: string) {
    if (event.key === 'Enter') {
      this.decrypt(pass, report_id);
    }
  }

  decrypt(pass: string, report_id: string) {
    this.msg = 'Report is decrypted please wait...';

    this.indexeddbService.decrypt(pass, report_id).then(returned => {
      if (returned) {
        this.dialogRef.close({ data: pass });
      } else {

        if (this.indexeddbService.decodeAES(this.data, pass)) {
          this.insertpass.setErrors(null);
          this.dialogRef.close({ data: pass });
        } else {
          this.msg = '';
          this.insertpass.setErrors({'incorrect': true});
        }

      }

  });

  }

}
