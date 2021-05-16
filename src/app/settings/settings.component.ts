import { Component, OnInit } from '@angular/core';
import { IndexeddbService } from '../indexeddb.service';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import { DialogApikeyComponent } from '../dialog-apikey/dialog-apikey.component';
import { DialogApiaddComponent } from '../dialog-apiadd/dialog-apiadd.component';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';

export interface ApiList {
  apikey: string;
  apiname: string;
  apiurl: string;
  status: string;
  created: string;
  expires: string;
  current_storage: number;
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})

export class SettingsComponent implements OnInit {
  color = 'accent';
  info = '';
  listkey = false;
  checked = false;
  hide = true;
  remain: any;
  tryconnectdb = false;
  wipechecked = false;
  enableAPI = true;
  wipehide = false;
  showregapi = true;
  wipemsg = '';
  apiconneted = false;
  user = '';
  today = new Date().toISOString().slice(0, 10);
  createdate: any;
  pro: any;
  expirydate: any;
  current_storage: any;
  max_storage: any;
  status = 'Not connected!';

  displayedColumns: string[] = ['apiname', 'status', 'created', 'expires', 'storage', 'settings'];
  dataSource = new MatTableDataSource([]);


  constructor(public router: Router, private indexeddbService: IndexeddbService, private apiService: ApiService,
    public dialog: MatDialog) { }

  ngOnInit() {

    const localkey = sessionStorage.getItem('VULNREPO-API');
    if (localkey) {

      console.log('Key found');
      this.apiconnect(localkey);
      this.listkey = true;
      this.showregapi = false;

    } else {

      this.indexeddbService.retrieveAPIkey().then(ret => {
        if (ret) {
          this.tryconnectdb = true;
          this.listkey = true;
          this.showregapi = false;
          setTimeout(_ => this.openDialog(ret));
        } else {
          this.showregapi = true;
        }
      });

    }

  }


  wipeDatachanged() {

    if (this.wipechecked === true) {
      this.wipehide = true;
    }
    if (this.wipechecked === false) {
      this.wipehide = false;
    }

  }


  wipealldata() {
    indexedDB.deleteDatabase('vulnrepo-settings');
    indexedDB.deleteDatabase('vulnrepo-api');
    indexedDB.deleteDatabase('vulnrepo-db');
    this.wipemsg = 'Deleted database successfully!';
    window.location.href = window.location.protocol + '//' + window.location.host;
  }

  dumpallmyreports() {

    this.indexeddbService.getReports().then(data => {
      if (data) {
        // download dump
        const blob = new Blob([JSON.stringify(data)], { type: 'text/plain' });
        const link = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'Dumped My Reports (vulnrepo.com).txt');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } else {
        console.log('DB read error');
      }

    });

  }

  parseandrestorereports(array) {

    const parsed = JSON.parse(array);

    for (let _i = 0; _i < parsed.length; _i++) {
        const num = parsed[_i];
        this.indexeddbService.importReportfromfileSettings(num);

        if (_i + 1 === parsed.length) {
          this.router.navigate(['/my-reports']);
        }
    }


  }

  restoreMyReports(input: HTMLInputElement) {

    const files = input.files;
    if (files && files.length) {

      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
       this.parseandrestorereports(fileReader.result);

      };
      fileReader.readAsText(fileToRead, 'UTF-8');
    }

  }

  gettimebetweendates(date11, date22) {
    let date1 = date11;
    let date2 = date22;
    date1 = date1.split('-');
    date2 = date2.split('-');
    date1 = new Date(date1[0], date1[1], date1[2]);
    date2 = new Date(date2[0], date2[1], date2[2]);
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(Math.abs((date1 - date2) / oneDay));
    return diffDays;
  }

  apiconnect(vault: string) {

    const elementlist: ApiList[] = [];
    const vaultobj = JSON.parse(vault);

    vaultobj.forEach( (element) => {

      if (element.apikey !== undefined && element.apikey !== '') {

        this.apiService.APISend(element.value, element.apikey, 'apiconnect', '').then(resp => {
          if (resp.AUTH === 'OK') {
            this.apiconneted = true;
            this.listkey = false;
            this.createdate = resp.CREATEDATE;
            this.expirydate = resp.EXPIRYDATE;
            this.remain = this.gettimebetweendates(this.today, this.expirydate);
            this.user = resp.WELCOME;
            this.max_storage = resp.MAX_STORAGE;
            this.current_storage = resp.CURRENT_STORAGE;
            const stor = this.current_storage / this.max_storage * 100;

            // tslint:disable-next-line:max-line-length
            const elementdata = { apikey: element.apikey, apiname: element.viewValue, apiurl: element.value, status: 'Connected', created: resp.CREATEDATE, expires: resp.EXPIRYDATE + ' (' + this.remain + ' days left)', current_storage: stor };
            elementlist.push(elementdata);
            this.dataSource.data = elementlist;
            this.tryconnectdb = false;
          } else {
            // tslint:disable-next-line:max-line-length
            const elementdata = { apikey: element.apikey, apiname: element.viewValue, apiurl: element.value, status: 'Not connected', created: '', expires: '', current_storage: 0 };
            elementlist.push(elementdata);
            this.dataSource.data = elementlist;
          }
        });
      }

  });


  sessionStorage.setItem('VULNREPO-API', JSON.stringify(vaultobj));

  }

  removeapikey() {

    indexedDB.deleteDatabase('vulnrepo-api');
    this.showregapi = true;
    this.listkey = false;
    this.apiconneted = false;
    this.tryconnectdb = false;
    this.status = 'Not connected!';
  }

  apidisconnect() {
    sessionStorage.removeItem('VULNREPO-API');
    this.showregapi = false;
    this.listkey = true;
    this.apiconneted = false;
    this.status = 'Not connected!';
    this.tryconnectdb = true;
  }

  tryconnect() {
    this.indexeddbService.retrieveAPIkey().then(ret => {
      if (ret) {
        this.listkey = true;
        this.showregapi = false;
        this.tryconnectdb = true;
        setTimeout(_ => this.openDialog(ret));
      } else {
        this.showregapi = true;
      }
    });
  }

  openDialog(data: any): void {

    const dialogRef = this.dialog.open(DialogApikeyComponent, {
      width: '400px',
      disableClose: true,
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The security key dialog was closed');
      if (result) {
        this.apiconnect(result);
        if (data) {
          this.indexeddbService.saveKEYinDB(data).then(ret => {});
        }
        this.tryconnectdb = false;
        this.showregapi = false;
      }

    });

  }

  openDialogAPIADD(): void {

    const dialogRef = this.dialog.open(DialogApiaddComponent, {
      width: '400px',
      disableClose: true,
      data: ''
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The security key dialog was closed');
      if (result === 'OK') {
        this.apiconneted = true;
        this.tryconnectdb = false;
        this.listkey = false;
        this.showregapi = false;

        const localkey = sessionStorage.getItem('VULNREPO-API');
        if (localkey) {
          this.apiconnect(localkey);
        }


      }

    });

  }

  openDialogAPIaddtovault(): void {

    const dialogRef = this.dialog.open(DialogApikeyComponent, {
      width: '400px',
      disableClose: true,
      data: 'addtovault'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {

        const dialogRef2 = this.dialog.open(DialogApiaddComponent, {
          width: '400px',
          disableClose: true,
          data: result
        });

        dialogRef2.afterClosed().subscribe(resul => {
          console.log('The security key dialog was closed');
          if (resul === 'OK') {
            const localkey = sessionStorage.getItem('VULNREPO-API');
            if (localkey) {
              this.apiconnect(localkey);
            }
          }

        });

      }
    });

  }

  openDialogAPIremove(drem): any {

    const dialogRef = this.dialog.open(DialogApikeyComponent, {
      width: '400px',
      disableClose: true,
      data: 'addtovault'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
          sessionStorage.setItem('VULNREPO-API', JSON.stringify(drem));
          this.saveAPIKEY(drem, result);
          this.apiconnect(JSON.stringify(drem));
      }
    });

  }

  exportvault() {

    this.indexeddbService.retrieveAPIkey().then(data => {
      if (data) {
        const today = new Date().toLocaleString();
        // download dump
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json;charset=utf-8' });
        const link = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'VULNREPO Vault Dump ' + today + ' (vulnrepo.com).json');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } else {
        console.log('DB read error');
      }

    });

  }

  onFileLoad(fileLoadedEvent) {
  }

  importvault(input: HTMLInputElement) {
    console.log('import vault');

    const files = input.files;
    if (files && files.length) {

      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = this.onFileLoad;

      fileReader.onload = (e) => {
        this.Processimportfile(fileReader.result);
      };

      fileReader.readAsText(fileToRead, 'UTF-8');
    }

  }

  Processimportfile(file) {
    file = file.replace(/^"(.*)"$/, '$1');
    this.openDialog(file);
  }

  removeApi(element) {

    const localkey = sessionStorage.getItem('VULNREPO-API');
    if (localkey) {
      const result = JSON.parse(localkey);
      const index = result.map(function(e) { return e.apikey; }).indexOf(element);
      if (index !== -1) {
        result.splice(index, 1);
        this.openDialogAPIremove(result);
      }

    }

  }

  saveAPIKEY(key, pass) {

    this.indexeddbService.encryptKEY(JSON.stringify(key), pass).then(data => {
      if (data) {
        this.indexeddbService.saveKEYinDB(data).then(ret => {});
      }
    });

  }

}
