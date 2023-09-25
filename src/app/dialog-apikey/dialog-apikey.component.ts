import { Component, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { IndexeddbService } from '../indexeddb.service';
import { UntypedFormControl } from '@angular/forms';
import { SessionstorageserviceService } from "../sessionstorageservice.service"

@Component({
  selector: 'app-dialog-apikey',
  templateUrl: './dialog-apikey.component.html',
  styleUrls: ['./dialog-apikey.component.scss']
})
export class DialogApikeyComponent implements OnInit {
  hide = true;
  alert = '';
  removedialog = false;
  insertkeypass = new UntypedFormControl();

  constructor(public dialogRef: MatDialogRef<DialogApikeyComponent>,
    @Inject(MAT_DIALOG_DATA) public data, private indexeddbService: IndexeddbService, public sessionsub: SessionstorageserviceService) { }

  ngOnInit(): void {
    this.insertkeypass.setValue("");
    if (this.sessionsub.getSessionStorageItem('hidedialog') === 'true') {
      this.removedialog = true;
    }

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
              this.insertkeypass.setErrors(null);
              this.dialogRef.close(keypass);
            } else {
              this.insertkeypass.setErrors({'incorrect': true});
              
            }
          });

        }
      });

    } else {
      this.indexeddbService.decryptKEY(this.data, keypass).then(ret => {
        if (ret) {
          this.insertkeypass.setErrors(null);
          this.dialogRef.close(ret);
        } else {
          this.insertkeypass.setErrors({'incorrect': true});
        }
      });
    }

  }

  removedialogFunc(event) {
    if (event.checked === true) {
      this.sessionsub.setSessionStorageItem('hidedialog', 'true');
    }
    if (event.checked === false) {
      this.sessionsub.removeSessionStorageItem('hidedialog');
    }
  }
}
