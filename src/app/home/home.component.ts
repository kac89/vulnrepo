import { Component, OnInit,signal } from '@angular/core';

@Component({
  standalone: false,
  //imports: [],
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  items = ['Screenshots'];
  expandedIndex = 0;
  readonly panelOpenState = signal(false);
  constructor() {

    this.panelOpenState.set(true);

   }

  ngOnInit() {

  }

  download() {
    window.open('https://github.com/kac89/vulnrepo', '_blank');
  }

  demo() {
    window.open('https://vulnrepo.com/', '_blank');
  }

}
