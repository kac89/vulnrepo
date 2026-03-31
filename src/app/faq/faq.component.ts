import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  standalone: false,
  //imports: [],
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

    const node = document.getElementById(id);
    const yourHeight = 105 + 20;

    if (node) {
      node.scrollIntoView(true);

      // now account for fixed header
      const scrolledY = window.scrollY;
      if (scrolledY) {
        window.scroll(0, scrolledY - yourHeight);
      }

      // highlight the targeted section
      node.classList.add('faq-item--highlighted');
      setTimeout(() => node.classList.remove('faq-item--highlighted'), 2500);
    }

  }

}
