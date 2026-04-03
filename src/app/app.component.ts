import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { IndexeddbService } from './indexeddb.service';
import { Router, NavigationEnd } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { SessionstorageserviceService } from "./sessionstorageservice.service"
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogAboutComponent } from './dialog-about/dialog-about.component';
import { DialogOllamaComponent } from './dialog-ollama/dialog-ollama.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
  animations: [
    trigger('statusBadge', [
      state('encrypted', style({
        backgroundColor: 'rgba(22, 191, 110, 0.15)',
        borderColor: 'rgba(22, 191, 110, 0.5)',
        color: '#16bf6e',
      })),
      state('decrypted', style({
        backgroundColor: 'rgba(255, 82, 82, 0.15)',
        borderColor: 'rgba(255, 82, 82, 0.5)',
        color: '#ff5252',
      })),
      transition('encrypted <=> decrypted', [
        animate('320ms cubic-bezier(0.4, 0, 0.2, 1)')
      ]),
    ]),
    trigger('statusSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-6px)' }),
        animate('240ms 80ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 0, transform: 'translateY(6px)' })
        )
      ])
    ])
  ]
})

export class AppComponent implements OnInit, OnDestroy {
  show_status: any;
  enc_status: any;
  status_unsaved = false;
  report_id: any;
  subscription: Subscription;
  getunsavedchang: Subscription;
  show_active_reports = false;
  arr_oreports: any = [];
  dialogRef: MatDialogRef<DialogAboutComponent>;

  @HostListener('window:keydown.control.shift.y', ['$event'])
  GoToNewReport(event: KeyboardEvent) {
    event.preventDefault();
    this.router.navigate(['/new-report']);
  }

  @HostListener('window:keydown.control.shift.u', ['$event'])
  GoToSettings(event: KeyboardEvent) {
    event.preventDefault();
    this.router.navigate(['/my-reports']);
  }

  constructor(public route: ActivatedRoute, private snackBar: MatSnackBar, public router: Router, public sessionsub: SessionstorageserviceService, private indexeddbService: IndexeddbService, public dialog: MatDialog) {
    this.sessionsub.storageChange.subscribe(data => {
      // console.log(data);
      this.getopenreports();
    });

    this.getunsavedchang = this.indexeddbService.getchangesStatus().subscribe(value => {
      this.status_unsaved = value;
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
        this.report_id = value.url;
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




  closeReport() {
    console.log('close report');

    const report_id = this.report_id.substring(this.report_id.lastIndexOf("/") + 1, this.report_id.length);

    if (this.status_unsaved) {

      console.log('unsaved changes');

      this.snackBar.open('You have unsaved changes!', 'OK', {
        duration: 2000,
        panelClass: ['notify-snackbar-fail']
      });

    } else {

      this.sessionsub.removeSessionStorageItem_and_reload(report_id);

    }



  }

  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.subscription.unsubscribe();
    this.getunsavedchang.unsubscribe();
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

  goAI(): void {

    const dialogRef = this.dialog.open(DialogOllamaComponent, {
      width: '800px',
      disableClose: true,
      data: []
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The AI dialog was closed');
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
