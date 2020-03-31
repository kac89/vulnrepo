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

  constructor(public router: Router, private indexeddbService: IndexeddbService) { }

  ngOnInit() {
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

    indexedDB.deleteDatabase('vulnrepo-settings');
    indexedDB.deleteDatabase('vulnrepo-db');

    this.wipemsg = 'Deleted database successfully!';

  }




  dumpallmyreports() {

    this.indexeddbService.getReports().then(data => {
      if (data) {
        // download dump
        const blob = new Blob([JSON.stringify(data)], { type: 'text/plain' });
        const link = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'Dumped My Reports (vulnrepo.com).txt');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

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

      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
       this.parseandrestorereports(fileReader.result);

      };
      fileReader.readAsText(fileToRead, 'UTF-8');
    }

  }


}
