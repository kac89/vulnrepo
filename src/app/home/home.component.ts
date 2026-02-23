import { Component, OnInit,signal } from '@angular/core';
import { version } from "../../version";
@Component({
  standalone: false,
  //imports: [],
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  app_ver = '';
  app_ver_short = '';
  online = false;
  items = ['Screenshots'];
  expandedIndex = 0;
  readonly panelOpenState = signal(false);
  constructor() {

    this.panelOpenState.set(true);

   }

  ngOnInit() {
    this.app_ver = version.number;
    
    if (this.app_ver !== ''){
      this.app_ver_short = this.app_ver.substring(0, 7);
      this.online = true;
    } else {
      this.app_ver_short = 'N/A';
      this.online = false;
    }
  }

  download() {
    window.open('https://github.com/kac89/vulnrepo', '_blank');
  }

  demo() {
    window.open('https://vulnrepo.com/', '_blank');
  }

}
