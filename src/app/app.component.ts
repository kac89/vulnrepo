import { Component, OnInit, OnDestroy } from '@angular/core';
import { IndexeddbService } from './indexeddb.service';
import { Router, NavigationEnd } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { SessionstorageserviceService } from "./sessionstorageservice.service"
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogAboutComponent } from './dialog-about/dialog-about.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})

export class AppComponent implements OnInit, OnDestroy {
  show_status: any;
  enc_status: any;
  subscription: Subscription;
  show_active_reports = false;
  arr_oreports = [];
  dialogRef: MatDialogRef<DialogAboutComponent>;

  constructor(public route: ActivatedRoute, public router: Router, public sessionsub: SessionstorageserviceService, private indexeddbService: IndexeddbService, public dialog: MatDialog) {
    this.sessionsub.storageChange.subscribe(data => {
      // console.log(data);
      this.getopenreports();
    });
  }

  ngOnInit() {
    this.show_active_reports = false;

    const db = window.indexedDB.open('testindexeddb');
    db.onerror = () => {
      console.error('Your browser doesn\'t support a stable version of IndexedDB. Try use latest modern browser and not in private browsing mode! Note: In private browsing mode, most data storage is not supported.');
    };

    if (!window.indexedDB) {
      console.error('Your browser doesn\'t support a stable version of IndexedDB.');
    }
    if (!window.sessionStorage) {
      console.error('Your browser doesn\'t support a stable version of sessionStorage.');
    }

    this.subscription = this.indexeddbService.getstatusencryption().subscribe(value => {
      this.enc_status = value;
    });

    this.router.events.subscribe(value => {
      if (value instanceof NavigationEnd) {
        if (value.url.includes('/report/')) {
          this.show_status = true;
        } else {
          this.show_status = false;
          this.enc_status = false;
        }
      }
    });

    this.getopenreports();
  }

  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.subscription.unsubscribe();
  }

  goAbout(): void {

    const dialogRef = this.dialog.open(DialogAboutComponent, {
      width: '500px',
      disableClose: false,
      data: []
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The CVSS dialog was closed');
    });

  }

  getopenreports() {
    this.arr_oreports = [];

    for (const [report_id, value] of Object.entries(sessionStorage)) {

      if (report_id !== 'VULNREPO-API') {
        this.indexeddbService.checkifreportexist(report_id).then(data => {
          if (data) {
            this.show_active_reports = true;
            this.arr_oreports.push({ "report_id": data.report_id, "report_name": data.report_name });
          }

          const localkey = this.sessionsub.getSessionStorageItem('VULNREPO-API');
          if (localkey) {

            const vaultobj = JSON.parse(localkey);
            vaultobj.forEach((element) => {

              this.indexeddbService.checkAPIreport_single(report_id, element.value, element.apikey).then(data => {
                if (data) {
                  this.show_active_reports = true;
                  this.arr_oreports.push({ "report_id": data.report_id, "report_name": data.report_name, "report_source": 'api' });
                }
              });

            });

          }

        });
      }

    };

    this.arr_oreports = [...this.arr_oreports.reduce((map, obj) => map.set(obj.report_id, obj), new Map()).values()];

  }

}
