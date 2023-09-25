import { Component, OnInit, OnDestroy } from '@angular/core';
import { IndexeddbService } from './indexeddb.service';
import { Router, NavigationEnd } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { version } from "../version";
import { SessionstorageserviceService } from "./sessionstorageservice.service"

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit, OnDestroy {
  show_status: any;
  enc_status: any;
  subscription: Subscription;
  show_active_reports = false;
  app_ver = '';
  arr_oreports = [];
  app_ver_short = '';

  constructor(public route: ActivatedRoute, public router: Router, public sessionsub: SessionstorageserviceService, private indexeddbService: IndexeddbService) {
    this.sessionsub.storageChange.subscribe( data => {
      // console.log(data);
      this.getopenreports();
    });
  }

  ngOnInit() {
    this.show_active_reports = false;
    this.app_ver = version.number;
    
    if (this.app_ver !== ''){

      this.app_ver_short = this.app_ver.substring(0, 7)

    }

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

  getopenreports() {
    this.arr_oreports = [];
    
    for (const key of Object.keys(sessionStorage)) {
      this.indexeddbService.checkifreportexist(key).then(data => {
        if (data) {
          this.show_active_reports = true;
          this.arr_oreports.push({"report_id": data.report_id, "report_name": data.report_name});
        }
      });
    };
    
  }

}
