import { Component, OnInit } from '@angular/core';
import { IndexeddbService } from '../indexeddb.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  color = 'accent';
  info = '';
  checked = false;
  hide = false;
  advhtml: any;
  advlogo: any;
  settings: any;
  constructor(private indexeddbService: IndexeddbService) { }

  ngOnInit() {

    this.indexeddbService.getSettings().then(data => {
      if (data) {
        console.log(data);

          data.forEach(function (eachObj) {
            console.log(eachObj);
            if (eachObj['key'] === 'advenabled') {
              this.checked = eachObj['value'];
              this.advHTMLchanged();
            } else if (eachObj['key'] === 'advhtml') {
              this.advhtml = eachObj['value'];
            } else if (eachObj['key'] === 'advlogo') {
              this.advlogo = eachObj['value'];
            }

          }, this);


      } else {
        console.log('Settings read error');
      }

    });

  }


  advHTMLchanged() {

    if (this.checked === true) {
      this.hide = true;
      this.indexeddbService.advHTMLSaveSettings('advenabled', this.hide).then(data => {
      });
    }
    if (this.checked === false) {
      this.hide = false;
      this.indexeddbService.advHTMLSaveSettings('advenabled', this.hide).then(data => {
      });
    }

  }

  saveadvHTML(logo, htmlcontent) {

    const keys: string[] = new Array('advenabled', 'advlogo', 'advhtml');
    const item: string[] = new Array(this.hide, logo, htmlcontent);

    for (let i = 0; i < keys.length; i++) {
      this.indexeddbService.advHTMLSaveSettings(keys[i], item[i]).then(data => {
      });

      if (i === 2) {
        this.info = 'Saved OK!!!';
      }
    }

  }



}
