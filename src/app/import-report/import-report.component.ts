import { Component, OnInit } from '@angular/core';
import { IndexeddbService } from '../indexeddb.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-import-report',
  templateUrl: './import-report.component.html',
  styleUrls: ['./import-report.component.scss']
})
export class ImportReportComponent implements OnInit {
  public pastefromclipboard: any = '';

  constructor(public router: Router, private indexeddbService: IndexeddbService) { }

  ngOnInit() {
  }

  importfromclipboard(item) {
    if (item !== '') {

      item = decodeURIComponent(item);
      item = item.replace(/(\r\n|\n|\r| )/gm, '');

      const decodedData = atob(item);
      this.indexeddbService.importReport(decodedData);

    }
  }

  onFileLoad(fileLoadedEvent) {}

  onFileSelect(input: HTMLInputElement) {
    const files = input.files;
    let ile = 0;
    Object.keys(files).forEach(key => {

      const fileToRead = files[key];
      const fileReader = new FileReader();
      fileReader.onload = this.onFileLoad;

      fileReader.onload = (e) => {
        ile = ile + 1;
        const res: string = fileReader.result as string;
        let item = decodeURIComponent(res);
        item = item.replace(/(\r\n|\n|\r| )/gm, '');
        const decodedData = atob(item);
        this.indexeddbService.importReportfromfile(decodedData);

        if (files.length === ile) {
          console.log('files end');
          this.router.navigate(['/my-reports']);
        }

      };

      fileReader.readAsText(fileToRead, 'UTF-8');

    });


  }
}
