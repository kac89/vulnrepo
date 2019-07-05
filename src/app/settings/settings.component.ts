import { Component, OnInit } from '@angular/core';
import { IndexeddbService } from '../indexeddb.service';
import { Router } from '@angular/router';

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
  wipechecked = false;
  wipehide = false;
  wipemsg = '';
  uploadlogoprev = '';
  advhtml: any;
  advlogo: any;
  advlogo_saved: any;
  settings: any;
  constructor(public router: Router, private indexeddbService: IndexeddbService) { }

  ngOnInit() {

    this.indexeddbService.getSettings().then(data => {
      if (data) {
        // console.log(data);

          data.forEach(function (eachObj) {
            // console.log(eachObj);
            if (eachObj['key'] === 'advenabled') {
              this.checked = eachObj['value'];
              this.advHTMLchanged();
            } else if (eachObj['key'] === 'advhtml') {
              this.advhtml = eachObj['value'];
            } else if (eachObj['key'] === 'advlogo') {
              this.advlogo = eachObj['value'];
              this.advlogo_saved = eachObj['value'];
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

  wipeDatachanged() {

    if (this.wipechecked === true) {
      this.wipehide = true;
    }
    if (this.wipechecked === false) {
      this.wipehide = false;
    }

  }


  wipealldata() {

    const remove_settings = indexedDB.deleteDatabase('vulnrepo-settings');
    const remove_myreports = indexedDB.deleteDatabase('vulnrepo-db');

    this.wipemsg = 'Deleted database successfully!';

  }

  saveadvHTML(htmlcontent) {

    const keys: string[] = new Array('advenabled', 'advlogo', 'advhtml');
    const item: string[] = new Array(this.hide, this.advlogo, htmlcontent);

    for (let i = 0; i < keys.length; i++) {
      this.indexeddbService.advHTMLSaveSettings(keys[i], item[i]).then(data => {
      });

      if (i === 2) {
        this.info = 'Saved OK!!!';
      }
    }

  }




  dumpallmyreports() {

    this.indexeddbService.getReports().then(data => {
      if (data) {
        // download dump
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + JSON.stringify(data));
        element.setAttribute('download', 'Dumped My Reports (vulnrepo.com).txt');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

      } else {
        console.log('DB read error');
      }

    });

  }

  parseandrestorereports(array) {

    const parsed = JSON.parse(array);

    for (let _i = 0; _i < parsed.length; _i++) {
        const num = parsed[_i];
        this.indexeddbService.importReportfromfileSettings(num);

        if (_i + 1 === parsed.length) {
          this.router.navigate(['/my-reports']);
        }
    }


  }

  restoreMyReports(input: HTMLInputElement) {

    const files = input.files;
    if (files && files.length) {
      /*
       console.log("Filename: " + files[0].name);
       console.log("Type: " + files[0].type);
       console.log("Size: " + files[0].size + " bytes");
       */
      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
       this.parseandrestorereports(fileReader.result);

      };
      fileReader.readAsText(fileToRead, 'UTF-8');
    }

  }


  exportconfiguration() {

    this.indexeddbService.getSettings().then(data => {
      if (data) {
        // download dump
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + JSON.stringify(data));
        element.setAttribute('download', 'Settings configuration dump (vulnrepo.com).txt');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

      } else {
        console.log('Settings read error');
      }

    });

  }

  parseandrestoresettings(data) {

    const parsed = JSON.parse(data);
    // console.log(parsed);

    for (let _i = 0; _i < parsed.length; _i++) {
      const num = parsed[_i];

      this.indexeddbService.advHTMLSaveSettings(num.key, num.value).then();

      if (_i + 1 === parsed.length) {
        this.router.navigate(['/home']);
      }


    }


  }


  restoreConfiguration(input: HTMLInputElement) {

    const files = input.files;

    if (files && files.length) {
      /*
       console.log("Filename: " + files[0].name);
       console.log("Type: " + files[0].type);
       console.log("Size: " + files[0].size + " bytes");
       */

      const fileToRead = files[0];
      const fileReader = new FileReader();

      fileReader.onload = (e) => {
        this.parseandrestoresettings(fileReader.result);
      };

      fileReader.readAsText(fileToRead, 'UTF-8');
    }

  }


  parselogo(data) {
    const linkprev = 'data:image/png;base64,' + btoa(data);
    this.uploadlogoprev = '<img src="' + linkprev + '" width="300px">';
    this.advlogo = linkprev;
  }

  importlogo(input: HTMLInputElement) {

    const files = input.files;
    if (files && files.length) {
      /*
       console.log("Filename: " + files[0].name);
       console.log("Type: " + files[0].type);
       console.log("Size: " + files[0].size + " bytes");
       */
      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
       this.parselogo(fileReader.result);

      };
      fileReader.readAsBinaryString(fileToRead);
    }

  }

}
