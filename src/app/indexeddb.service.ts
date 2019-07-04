import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { v4 as uuid } from 'uuid';
import * as Crypto from 'crypto-js';
import { Observable } from 'rxjs';

import { MessageService } from './message.service';
import { MatDialog } from '@angular/material';
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



        //        report_vulns: [
        //          {
        //            title: '[XSS] Cross site scripting vulnerability',
        //            poc: '',
        //            files: [],
        //            desc: 'desc',
        //            severity: 'Medium',
        //            ref: 'https://www.owasp.org/',
        //            cvss: '4.3',
        //            cve: '',
        //            date: today
        //          },
        //          {
        //            title: '[XSS] DOM',
        //            poc: '',
        //            files: [],
        //            desc: 'desc',
        //            severity: 'Medium',
        //            ref: 'https://www.owasp.org/',
        //            cvss: '4.3',
        //            cve: '',
        //            date: today
        //          }
        //        ],



        const today: number = Date.now();
        const empty_vulns = {
          report_vulns: [],
          report_scope: '',
          report_summary: '',
          report_changelog: [
            {
              date: today,
              desc: 'Create report: \"' + title + '\".'
            }
          ],
          report_version: 0,
          report_metadata: {
            starttest: '',
            endtest: ''
          },
          researcher: {
            reportername: '',
            reportersocial: '',
            reporterwww: '',
            reporteremail: ''
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

  importReport(data) {
    data = JSON.parse(data);
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

  importReportfromfile(data) {
    data = JSON.parse(data);
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

  }


  importReportfromfileSettings(data) {

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

  }


  deleteReport(item: any) {
    return new Promise<any>((resolve, reject) => {

      this.getkeybyReportID(item.report_id).then(data => {
        if (data) {

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

            store.delete(data.key);

            tx.oncomplete = function () {
              db.close();
              resolve(true);
            };
          };


        }
      });
    });
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

    try {
      // Decrypt
      const bytes = Crypto.AES.decrypt(data.encrypted_data.toString(), pass);
      const decryptedData = JSON.parse(bytes.toString(Crypto.enc.Utf8));
      console.log('Deecrypted data:');
      console.log(decryptedData);
      if (decryptedData) {
        sessionStorage.setItem(data.report_id, pass);
      }
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

  getkeybyReportID(reportid) {
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
        const request = store.openCursor();

        request.onsuccess = function (evt) {

          const cursor = request.result;
          if (cursor) {
            const key = cursor.primaryKey;
            const value = cursor.value.report_id;

            if (reportid === value) {
              const finded = { key, value };
              resolve(finded);
            }

            cursor.continue();
          } else {
            // no more results

          }

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


  updatereportDB(key, value) {
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
        const request = store.put(value, key);

        request.onsuccess = function (evt) {
          resolve('encrypted:ok');
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

  prepareupdatereport(data: any, pass: string, reportid: any, reportname: any, reportcreatedate: any, reportorder: any) {
    return new Promise<any>((resolve, reject) => {
      try {
        // Encrypt
        const ciphertext = Crypto.AES.encrypt(JSON.stringify(data), pass);
        const now: number = Date.now();
        const to_update = {
          report_id: reportid,
          report_name: reportname,
          report_createdate: reportcreatedate,
          report_lastupdate: now,
          encrypted_data: ciphertext.toString()
        };


        this.updatereportDB(reportorder, to_update).then(retu => {
          if (retu === 'encrypted:ok') {
            resolve(now);
          }
        });

      } catch (except) {
        console.log(except);
      }

    });

  }



  downloadEncryptedReport(report_id) {

    this.checkifreportexist(report_id).then(data => {
      if (data) {
        console.log(data);
        const enc = btoa(JSON.stringify(data));
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(enc));
        element.setAttribute('download', data.report_name + ' (vulnrepo.com) encrypted.txt');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

      }

    });


  }




  getSettings() {
    return new Promise<any>((resolve, reject) => {

      const indexedDB = window.indexedDB;
      const open = indexedDB.open('vulnrepo-settings', 1);

      open.onupgradeneeded = function () {
        const db = open.result;
        db.createObjectStore('settings', { autoIncrement: true });
      };
      open.onerror = function(event) {
        console.log('txn failed', event);
      };
      open.onsuccess = function () {
        const db = open.result;
        const tx = db.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');

        // add, clear, count, delete, get, getAll, getAllKeys, getKey, put
        const request = store.openCursor();
        const ret: any[] = new Array();

        request.onsuccess = function (evt) {


          const cursor = request.result;
          if (cursor) {
            const key = cursor.primaryKey;
            const value = cursor.value;
            const finded = { key, value };

            ret.push(finded);
            cursor.continue();
          } else {
            // no more results
            resolve(ret);
          }

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


  advHTMLSaveSettings(key, item) {
    return new Promise<any>((resolve, reject) => {

      const indexedDB = window.indexedDB;
      const open = indexedDB.open('vulnrepo-settings', 1);

      open.onupgradeneeded = function () {
        const db = open.result;
        db.createObjectStore('settings', { autoIncrement: true });
      };
      open.onerror = function(event) {
        console.log('txn failed', event);
      };
      open.onsuccess = function () {
        const db = open.result;
        const tx = db.transaction(['settings'], 'readwrite');
        const store = tx.objectStore('settings');

        // add, clear, count, delete, get, getAll, getAllKeys, getKey, put
        const request = store.put(item, key);

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






}
