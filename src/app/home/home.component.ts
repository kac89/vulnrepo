import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  items = ['Screenshots'];
  expandedIndex = 0;

  constructor() { }

  ngOnInit() {
  }

}
