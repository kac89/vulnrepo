import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { IndexeddbService } from '../indexeddb.service';

@Component({
  selector: 'app-newreport',
  templateUrl: './newreport.component.html',
  styleUrls: ['./newreport.component.scss']
})
export class NewreportComponent implements OnInit {

  hide = true;
  alert: string;

  emailFormControl = new FormControl('', [
    Validators.required,
    Validators.email,
  ]);


  constructor(private indexeddbService: IndexeddbService) {

  }

  ngOnInit() {

  }

  addnewReport(title: string, pass: string, pass2: string) {

    if (title.length >= 1) {

      if ((pass.length >= 8) && (pass2.length >= 8)) {

        if (pass === pass2) {
          this.indexeddbService.addnewReport(title, pass);
        } else {
          this.alert = 'The given security keys do not match. Try again.';
        }

      } else {
        this.alert = 'Security key is too weak. Try again.';
      }

    } else {
      this.alert = 'Title is empty!';
    }

  }

}
