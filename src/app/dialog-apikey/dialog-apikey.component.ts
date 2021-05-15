import { Component, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { IndexeddbService } from '../indexeddb.service';

@Component({
  selector: 'app-dialog-apikey',
  templateUrl: './dialog-apikey.component.html',
  styleUrls: ['./dialog-apikey.component.scss']
})
export class DialogApikeyComponent implements OnInit {
  hide = true;
  alert = '';

  constructor(public dialogRef: MatDialogRef<DialogApikeyComponent>,
    @Inject(MAT_DIALOG_DATA) public data, private indexeddbService: IndexeddbService) { }

  ngOnInit(): void {
  }

  cancel(): void {
    this.dialogRef.close();
  }

  onKeydown(event, keypass: string) {
    if (event.key === 'Enter') {
      this.decrypt(keypass);
    }
  }

  decrypt(keypass) {

    if (this.data === 'addtovault') {

      this.indexeddbService.retrieveAPIkey().then(ret => {

        if (ret) {
          this.indexeddbService.decryptKEY(ret, keypass).then(ret2 => {
            if (ret2) {
              this.dialogRef.close(keypass);
            } else {
              this.alert = 'Wrong password!';
            }
          });

        }
      });

    } else {
      this.indexeddbService.decryptKEY(this.data, keypass).then(ret => {
        if (ret) {
          this.dialogRef.close(ret);
        } else {
          this.alert = 'Wrong password!';
        }
      });
    }

  }
}
