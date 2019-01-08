import { Component, OnInit, OnDestroy } from '@angular/core';
import { IndexeddbService } from './indexeddb.service';
import { Router, NavigationEnd } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit, OnDestroy {
  show_status: any;
  enc_status: any;
  subscription: Subscription;

  constructor(public route: ActivatedRoute, public router: Router, private indexeddbService: IndexeddbService) {

  }

  ngOnInit() {

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
