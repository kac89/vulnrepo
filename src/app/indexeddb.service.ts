import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { v4 as uuid } from 'uuid';
import * as Crypto from 'crypto-js';
import { Observable } from 'rxjs';

import { MessageService } from './message.service';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class IndexeddbService {

  reportlist = [];

  private decryptstatusObs = new Subject<any>();

  constructor(public router: Router, private messageService: MessageService, public dialog: MatDialog,
    private apiService: ApiService) {

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
        //            status: 1,
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
        //            status: 1,
        //            ref: 'https://www.owasp.org/',
        //            cvss: '4.3',
        //            cve: '',
        //            date: today
        //          }
        //        ],


        const defaultContent = `### Methodology and Standards:

* OSTTMM(Open Source Security Testing Methodology Manual)
* OWASP(Open Web Application Security Project)
* ISSAF(Information Systems Security Assessment Framework)
* WASC-TC(Web Application Security Consortium Threat Classification)
* PTF(Penetration Testing Framework)
* OISSG(Information Systems Security Assessment Framework)
* NIST SP800-115(Technical Guide to Information Security Testing and Assessment)
`;

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
          researcher: [
            {
            reportername: '',
            reportersocial: '',
            reporterwww: '',
            reporteremail: ''
            }
          ],
          report_settings: {
            report_html: defaultContent,
            report_logo: ''
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

  addnewReportonAPI(apiurl: string, apikey: string, title: string, pass: string) {

    if (title && pass) {

      // detect space in pass
      if (/\s/.test(pass)) {
        console.log('space');

      } else {

        const defaultContent = `### Methodology and Standards:

* OSTTMM(Open Source Security Testing Methodology Manual)
* OWASP(Open Web Application Security Project)
* ISSAF(Information Systems Security Assessment Framework)
* WASC-TC(Web Application Security Consortium Threat Classification)
* PTF(Penetration Testing Framework)
* OISSG(Information Systems Security Assessment Framework)
* NIST SP800-115(Technical Guide to Information Security Testing and Assessment)
`;

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
          researcher: [
            {
            reportername: '',
            reportersocial: '',
            reporterwww: '',
            reporteremail: ''
            }
          ],
          report_settings: {
            report_html: defaultContent,
            report_logo: ''
          }
        };

        // Encrypt
        const ciphertext = Crypto.AES.encrypt(JSON.stringify(empty_vulns), pass);

        const reportid = uuid();
        const data = {
          report_id: reportid,
          report_name: title,
          report_createdate: today,
          report_lastupdate: '',
          encrypted_data: ciphertext.toString()
        };


          // tslint:disable-next-line:max-line-length
          this.apiService.APISend(apiurl, apikey, 'savereport', 'reportdata=' + btoa(JSON.stringify(data))).then(resp => {
            if (resp) {
              this.router.navigate(['/my-reports']);
            }
          });


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


  prepareupdateAPIreport(apiurl: string, apikey: string, data: any, pass: string, reportid: any, reportname: any, reportcreatedate: any) {
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

        const localkey = sessionStorage.getItem('VULNREPO-API');
        if (localkey) {
          // tslint:disable-next-line:max-line-length
          this.apiService.APISend(apiurl, apikey, 'updatereport', 'reportdata=' + btoa(JSON.stringify(to_update))).then(resp => {
            if (resp.REPORT_UPDATE === 'OK') {
              resolve(now);
            }
          });
        }

      } catch (except) {
        console.log(except);
      }

    });

  }


  downloadEncryptedReport(report_id) {

    this.checkifreportexist(report_id).then(data => {
      if (data) {
        this.preparedownload(data);
      } else {
        this.checkAPIreport(report_id).then(re => {
          this.preparedownload(re);
        });
      }

    });

  }

  preparedownload(data) {
    const enc = btoa(JSON.stringify(data));
    const blob = new Blob([encodeURIComponent(enc)], { type: 'text/plain' });
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', data.report_name + ' ' + data.report_id + ' (vulnrepo.com).vulnr');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  cloneReportadd(report: string) {
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

            store.put(report);

            tx.oncomplete = function () {
              db.close();
              resolve(true);
            };
          };

    });
  }

  encryptKEY(key, pass) {
    return new Promise<any>((resolve, reject) => {
      const ciphertext = Crypto.AES.encrypt(key, pass);
      resolve(ciphertext.toString());
    });
  }

  decryptKEY(key, pass) {
    return new Promise<any>((resolve, reject) => {
      const bytes = Crypto.AES.decrypt(key.toString(), pass);
      const decryptedData = bytes.toString(Crypto.enc.Utf8);
      resolve(decryptedData.toString());
    });
  }

  saveKEYinDB(key) {
    return new Promise<any>((resolve, reject) => {
      // indexeddb communication
      const indexedDB = window.indexedDB;
      const open = indexedDB.open('vulnrepo-api', 1);

      open.onupgradeneeded = function () {
        const db = open.result;
        db.createObjectStore('api');
      };

      open.onsuccess = function () {
        const db = open.result;
        const tx = db.transaction('api', 'readwrite');
        const store = tx.objectStore('api');

        store.put(key, 'vulnrepo-api-vault');

        tx.oncomplete = function () {
          db.close();
          resolve(true);
        };
      };

    });
  }

  retrieveAPIkey() {
    return new Promise<any>((resolve, reject) => {

      const indexedDB = window.indexedDB;
      const open = indexedDB.open('vulnrepo-api', 1);

      open.onupgradeneeded = function () {
        const db = open.result;
        db.createObjectStore('api', { autoIncrement: true });
      };

      open.onsuccess = function () {
        const db = open.result;
        const tx = db.transaction('api', 'readwrite');
        const store = tx.objectStore('api');

        // add, clear, count, delete, get, getAll, getAllKeys, getKey, put
        const request = store.get('vulnrepo-api-vault');

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

  checkAPIreport(reportid) {
    return new Promise<any>((resolve, reject) => {

      const localkey = sessionStorage.getItem('VULNREPO-API');
      if (localkey) {

          const vaultobj = JSON.parse(localkey);

          vaultobj.forEach( (element) => {
            this.apiService.APISend(element.value, element.apikey, 'getreport', 'reportid=' + reportid).then(resp => {

              if (resp.length > 0) {
                console.log('Report exist in API: OK');
                resolve(resp[0]);
              }
            });

        });

      }


    });
  }

  searchAPIreport(reportid) {
    return new Promise<any>((resolve, reject) => {

      const localkey = sessionStorage.getItem('VULNREPO-API');
      if (localkey) {

          const vaultobj = JSON.parse(localkey);

          vaultobj.forEach( (element) => {
            this.apiService.APISend(element.value, element.apikey, 'getreport', 'reportid=' + reportid).then(resp => {

              if (resp.length > 0) {
                console.log('Report exist in API: OK');
                resolve({data: resp[0], api: element.value, apikey: element.apikey});
              }
            });

        });

      }


    });
  }

}
