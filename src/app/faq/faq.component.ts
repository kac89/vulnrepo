import { Component, OnInit } from '@angular/core';
import {Router, ActivatedRoute, Params} from '@angular/router';

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent implements OnInit {

  constructor(private activatedRoute: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {

    this.activatedRoute.queryParams.subscribe(params => {
      const param: string = params['q'];
      if (param) {
        this.scroll(param);
      }
    });

  }

  scroll(id) {
    let element = document.getElementById(id);

    setTimeout(() => {
      element.scrollIntoView({behavior: 'smooth', block: 'end', inline: 'nearest'});
    }, 500 );

  }

}
