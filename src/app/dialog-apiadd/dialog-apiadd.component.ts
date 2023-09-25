import { Component, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiService } from '../api.service';
import { IndexeddbService } from '../indexeddb.service';
import { Inject } from '@angular/core';
import { SessionstorageserviceService } from "../sessionstorageservice.service"

interface Apisource {
  value: string;
  viewValue: string;
}

@Component({
  selector: 'app-dialog-apiadd',
  templateUrl: './dialog-apiadd.component.html',
  styleUrls: ['./dialog-apiadd.component.scss']
})
export class DialogApiaddComponent implements OnInit {
  apiconneted = false;
  hide = true;
  addapihide = false;
  apiname = '';
  apiurl = '';
  alert = '';
  status = 'Not connected!';
  sour: Apisource[] = [
    { value: 'api.vulnrepo.com', viewValue: 'VULNRΞPO REMOTE API' },
    { value: '', viewValue: 'Custom API' },
  ];
  selectedAPIDEF = this.sour[0];

  constructor(public dialogRef: MatDialogRef<DialogApiaddComponent>, private apiService: ApiService,
    private indexeddbService: IndexeddbService, @Inject(MAT_DIALOG_DATA) public data, public sessionsub: SessionstorageserviceService) { }

  ngOnInit(): void {

    if (this.data) {
      this.addapihide = true;
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  apiconnectManual(apik: string, pass: string, selected) {

  let setapiurl = selected.value;
  let setapiname = selected.viewValue;

  if (selected.value === '' && selected.viewValue === 'Custom API') {
    setapiurl = this.apiurl;
    setapiname = this.apiname;
  }

    if (apik !== undefined && apik !== '' && pass !== undefined && pass !== '' && setapiurl !== undefined && setapiname !== undefined) {

      this.status = 'Connecting...';
      const url = new URL(setapiurl);
      // url.port;     // => "443"
      this.apiService.APISend(url.hostname, apik, 'apiconnect', '').then(resp => {
        if (resp.AUTH === 'OK') {
          this.apiconneted = true;

          const savejson = { apikey: apik, value: url.hostname, viewValue: setapiname };

          this.sessionsub.setSessionStorageItem('VULNREPO-API', JSON.stringify([savejson]));
          this.saveAPIKEY([savejson], pass);
          this.dialogRef.close('OK');

        } else {
          this.status = 'Not connected!';
        }
      }).catch(err => {
        this.status = 'Can\'t connect, try again!';
      });
    }
  }

  saveAPIKEY(key, pass) {

    this.indexeddbService.encryptKEY(JSON.stringify(key), pass).then(data => {
      if (data) {
        this.indexeddbService.saveKEYinDB(data).then(ret => {});
      }
    });

  }

  addapi(apikey, selectedAPIDEF) {

    let setapiurl = selectedAPIDEF.value;
    let setapiname = selectedAPIDEF.viewValue;

    if (selectedAPIDEF.value === '' && selectedAPIDEF.viewValue === 'Custom API') {
      setapiurl = this.apiurl;
      setapiname = this.apiname;
    }

    const apik = apikey;

    // tslint:disable-next-line:max-line-length
    if (apik !== undefined && apik !== '' && this.data !== undefined && this.data !== '' && setapiurl !== undefined && setapiname !== undefined) {

      this.status = 'Connecting...';
      const url = new URL(setapiurl);
      // url.port;     // => "443"
      this.apiService.APISend(url.hostname, apik, 'apiconnect', '').then(resp => {
        if (resp.AUTH === 'OK') {
          this.apiconneted = true;

          const localkey = this.sessionsub.getSessionStorageItem('VULNREPO-API');
          let list = [];
          const savejson = { apikey: apik, value: url.hostname, viewValue: setapiname };

          if (localkey) {
            list = JSON.parse(localkey);
            list.push(savejson);
            this.sessionsub.setSessionStorageItem('VULNREPO-API', JSON.stringify(list));
            this.saveAPIKEY(list, this.data);
          }

          this.dialogRef.close('OK');

        } else {
          this.status = 'Not connected!';
        }
      }).catch(err => {
        this.status = 'Can\'t connect, try again!';
      });
    }





  }

}
