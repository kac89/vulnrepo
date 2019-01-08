import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { v4 as uuid } from 'uuid';
import * as Crypto from 'crypto-js';
import { Observable } from 'rxjs';

import { MessageService } from './message.service';
import { MatDialog } from '@angular/material';
import { DialogAddissueComponent } from './dialog-addissue/dialog-addissue.component';
import { Subject } from 'rxjs/Subject';

@Injectable({
  providedIn: 'root'
})
export class IndexeddbService {

  reportlist = [];

  private decryptstatusObs = new Subject<any>();

  constructor(public router: Router, private messageService: MessageService, public dialog: MatDialog) {

    this.updateEncStatus(false);
    /*
    const test = [
      {
        report_id: '07f8026e-23c9-40f8-9001-53c3240a2c7d',
        report_name: 'Testing security infrastructure apple.com',
        report_createdate: 1541259311298,
        encrypted_data: 'encdata'
      },
      {
        report_id: '64f8026e-23c9-40f8-9001-53c3240a2c7d',
        report_name: 'PCI DSS Security report',
        report_createdate: 1541260948293,
        encrypted_data: 'encdata'
      }
    ];

    this.reportlist.push(test);
    this.Obsreportlist.next(test);
    */
  }

  getReports() {
    return new Promise<any>((resolve, reject) => {

      const indexedDB = window.indexedDB;
      const open = indexedDB.open('vulnrepo-db', 1);

      open.onupgradeneeded = function () {
        const db = open.result;
        db.createObjectStore('reports', { autoIncrement: true });
      };

      open.onsuccess = function () {
        const db = open.result;
        const tx = db.transaction('reports', 'readwrite');
        const store = tx.objectStore('reports');

        // add, clear, count, delete, get, getAll, getAllKeys, getKey, put
        const request = store.getAll();

        request.onsuccess = function (evt) {
          resolve(request.result);
        };

        tx.oncomplete = function () {
          db.close();
        };
        request.onerror = function (e) {
          reject(e);
        };
      };

    });
  }


  addnewReport(title: string, pass: string) {

    if (title && pass) {

      // detect space in pass
      if (/\s/.test(pass)) {
        console.log('space');

      } else {

        const today: number = Date.now();
        const empty_vulns = {
          report_vulns: [
            {
              title: '[XSS] Cross site scripting vulnerability',
              poc: '',
              files: [],
              desc: 'desc',
              severity: 'Medium',
              ref: 'https://www.owasp.org/',
              cvss: '4.3',
              cve: '',
              date: today
            },
            {
              title: '[XSS] DOM',
              poc: '',
              files: [],
              desc: 'desc',
              severity: 'Medium',
              ref: 'https://www.owasp.org/',
              cvss: '4.3',
              cve: '',
              date: today
            }
          ],
          report_scope: '',
          report_changelog: [
            {
              date: today,
              desc: 'Create report: \"' + title + '\".'
            }
          ],
          report_version: 0,
          report_metadata: {
            starttest: '',
            endtest: '',
            reportlogo: ''
          },
          researcher: {
            reportername: '',
            reportersocial: '',
            reporterwww: ''
          }
        };

        // Encrypt
        const ciphertext = Crypto.AES.encrypt(JSON.stringify(empty_vulns), pass);

        const data = {
          report_id: uuid(),
          report_name: title,
          report_createdate: today,
          report_lastupdate: '',
          encrypted_data: ciphertext.toString()
        };

        // indexeddb communication
        const indexedDB = window.indexedDB;
        const open = indexedDB.open('vulnrepo-db', 1);

        open.onupgradeneeded = function () {
          const db = open.result;
          db.createObjectStore('reports', { autoIncrement: true });
        };

        open.onsuccess = function () {
          const db = open.result;
          const tx = db.transaction('reports', 'readwrite');
          const store = tx.objectStore('reports');

          store.put(data);

          tx.oncomplete = function () {
            db.close();
          };
        };

        this.router.navigate(['/my-reports']);


      }

    }

  }

  deleteReport(item: any) {

    console.log(item);

    // indexeddb communication
    const indexedDB = window.indexedDB;
    const open = indexedDB.open('vulnrepo-db', 1);

    open.onupgradeneeded = function () {
      const db = open.result;
      db.createObjectStore('reports', { autoIncrement: true });
    };

    open.onsuccess = function () {
      const db = open.result;
      const tx = db.transaction('reports', 'readwrite');
      const store = tx.objectStore('reports');

      store.delete(item);

      tx.oncomplete = function () {
        db.close();
      };
    };


  }


  checkifreportexist(report_id: string) {
    return new Promise<any>((resolve, reject) => {
      // indexeddb communication
      const indexedDB = window.indexedDB;
      const open = indexedDB.open('vulnrepo-db', 1);

      open.onupgradeneeded = function () {
        const db = open.result;
        db.createObjectStore('reports', { autoIncrement: true });
      };

      open.onsuccess = function () {
        const db = open.result;
        const tx = db.transaction('reports', 'readwrite');
        const store = tx.objectStore('reports');
        const request = store.getAll();
        request.onsuccess = function (evt) {
          request.result.map(x => {
            if (x.report_id.indexOf(report_id) !== -1) {
              resolve(x);
            }
          });
        };
        tx.oncomplete = function () {
          db.close();
          resolve(false);
        };
        request.onerror = function (e) {
          reject(e);
        };
      };
    });
  }






  decrypt(pass: string, report_id: string): Promise<any> {
    return this.checkifreportexist(report_id).then(data => {
      if (data) {
        return this.decodeAES(data, pass);
      }
    });

  }

  decodeAES(data: any, pass: string) {

    console.log(data);
    console.log(pass);

    try {
      // Decrypt
      const bytes = Crypto.AES.decrypt(data.encrypted_data.toString(), pass);
      const decryptedData = JSON.parse(bytes.toString(Crypto.enc.Utf8));
      console.log('Deecrypted data:');
      console.log(decryptedData);
      this.updateEncStatus(true);
      this.messageService.sendDecrypted(decryptedData);
      return true;

    } catch (except) {
      console.log('wrong pass');
    }
  }

  getstatusencryption(): Observable<any> {
    return this.decryptstatusObs.asObservable();
  }

  updateEncStatus(message: any) {
    this.decryptstatusObs.next(message);
  }

  addIssue() {
    console.log('Add issue');

    const dialogRef = this.dialog.open(DialogAddissueComponent, {
      width: '350px',
      data: { name: 'test' }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);
    });
  }


}
