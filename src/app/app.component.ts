import { Component, OnInit, OnDestroy } from '@angular/core';
import { IndexeddbService } from './indexeddb.service';
import { Router, NavigationEnd } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { version } from "../version";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit, OnDestroy {
  show_status: any;
  enc_status: any;
  subscription: Subscription;
  app_ver = '';
  app_ver_short = '';

  constructor(public route: ActivatedRoute, public router: Router, private indexeddbService: IndexeddbService) {
    
  }

  ngOnInit() {
    this.app_ver = version.number;
    
    if (this.app_ver !== ''){

      this.app_ver_short = this.app_ver.substring(0, 7)

    }

    if (!window.indexedDB) {
      console.log('Your browser doesn\'t support a stable version of IndexedDB.');
    }
    if (!window.sessionStorage) {
      console.log('Your browser doesn\'t support a stable version of sessionStorage.');
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

  }

  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.subscription.unsubscribe();
  }

}
