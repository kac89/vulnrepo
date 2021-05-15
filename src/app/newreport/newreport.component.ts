import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { IndexeddbService } from '../indexeddb.service';
import { SeckeyValidatorService } from '../seckey-validator.service';
import { ThemePalette } from '@angular/material/core';
import { ProgressBarMode } from '@angular/material/progress-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-newreport',
  templateUrl: './newreport.component.html',
  styleUrls: ['./newreport.component.scss']
})
export class NewreportComponent implements OnInit {

  hide = true;
  alert: string;
  inppass: string;
  localkey: any;
  inppass2: string;
  color: ThemePalette = 'warn';
  mode: ProgressBarMode = 'buffer';
  selectEDAPI = [];
  selectEDAPI_apikey = '';
  selectEDAPI_apiurl = '';
  value = 20;
  bufferValue = 20;
  str = '';
  selected = 'local';

  constructor(private indexeddbService: IndexeddbService, private passwordService: SeckeyValidatorService,
    public router: Router) {

  }

  ngOnInit() {

    const localkey = sessionStorage.getItem('VULNREPO-API');
    if (localkey) {
      this.localkey = JSON.parse(localkey);
    }

  }

  generatePassword() {
    const length = 20;
    const string = 'abcdefghijklmnopqrstuvwxyz';
    const numeric = '0123456789';
    const punctuation = '!@#$%^&*()_+~`|}{[]\:;?><,./-=';
    let password = '', character = '', ent1 = 0, ent2 = 0, ent3 = 0, hold = '', pass = '';
    while ( password.length < length ) {
        ent1 = Math.ceil(string.length * Math.random() * Math.random());
        ent2 = Math.ceil(numeric.length * Math.random() * Math.random());
        ent3 = Math.ceil(punctuation.length * Math.random() * Math.random());
        hold = string.charAt( ent1 );
        hold = (password.length % 2 === 0) ? (hold.toUpperCase()) : (hold);
        character += hold;
        character += numeric.charAt( ent2 );
        character += punctuation.charAt( ent3 );
        password = character;
    }
    password = password.split('').sort(function() {return 0.5 - Math.random(); }).join('');
    pass = password.substr(0, length);
    // set gen pass
    this.inppass = pass;
    this.inppass2 = pass;
    this.passCheck(pass);
    this.hide = false;
  }


  passCheck(pass) {

    switch (this.passwordService.checkPasswordStrength(pass)) {
      case 0:
        this.str = 'Too short';
        this.color = 'warn';
        this.value = 20;
        this.bufferValue = 20;
        break;
      case 1:
        this.str = 'Common';
        this.color = 'warn';
        this.value = 40;
        this.bufferValue = 40;
        break;
      case 2:
        this.str = 'Weak';
        this.color = 'primary';
        this.value = 60;
        this.bufferValue = 60;
        break;
      case 3:
        this.str = 'It\'s OK';
        this.color = 'accent';
        this.value = 80;
        this.bufferValue = 80;
        break;
      case 4:
        this.color = 'accent';
        this.str = 'Strong';
        this.value = 100;
        this.bufferValue = 100;
        break;
    }

  }


  addnewReport(title: string, pass: string, pass2: string) {

    if (title.length >= 1) {

      // tslint:disable-next-line:max-line-length
      if ((pass.length >= 8) && (pass2.length >= 8) && (this.passwordService.checkPasswordStrength(pass) >= 2) && (this.passwordService.checkPasswordStrength(pass2) >= 2)) {

        if (pass === pass2) {
          if (this.selected === 'local') {
            this.indexeddbService.addnewReport(title, pass);
          } else {
            this.indexeddbService.addnewReportonAPI(this.selectEDAPI_apiurl, this.selectEDAPI_apikey, title, pass);
          }
        } else {
          this.alert = 'The given security keys do not match. Try again.';
        }

      } else {
        this.alert = 'Security key is too weak. Try again.';
      }

    } else {
      this.alert = 'Empty title!';
    }

  }

  selectchange(event) {
    this.selectEDAPI = [];
    if (event.value === 'local') {
      console.log('Local');
      this.selectEDAPI_apikey = '';
      this.selectEDAPI_apiurl = '';
    } else {
        this.selectEDAPI_apikey = event.value.apikey;
        this.selectEDAPI_apiurl = event.value.value;
    }

  }

}
