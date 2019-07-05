import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dialog-import',
  templateUrl: './dialog-import.component.html',
  styleUrls: ['./dialog-import.component.scss']
})
export class DialogImportComponent implements OnInit {
  csvContent: string;
  parsedCsv: any[];
  public show_input = true;
  public please_wait = false;

  constructor(public dialogRef: MatDialogRef<DialogImportComponent>, public datePipe: DatePipe) { }

  ngOnInit() {
  }

  onFileLoad(fileLoadedEvent) {


  }


  onFileSelect(input: HTMLInputElement) {

    const files = input.files;
    // let content = this.csvContent;

    if (files && files.length) {
      /*
       console.log("Filename: " + files[0].name);
       console.log("Type: " + files[0].type);
       console.log("Size: " + files[0].size + " bytes");
       */

      this.show_input = false;
      this.please_wait = true;

      const fileToRead = files[0];

      const fileReader = new FileReader();
      fileReader.onload = this.onFileLoad;


      fileReader.onload = (e) => {
        // console.log(fileReader.result);
        this.parseNessus(fileReader.result);
      };

      fileReader.readAsText(fileToRead, 'UTF-8');
    }

  }

  cancel(): void {
    this.dialogRef.close();
  }

  parseNessus(imp): void {

    const csvData = imp || '';
    const allTextLines = csvData.split(/\r\n/);
    const headers = allTextLines[0].split(',');
    const lines = [];

    for (let i = 0; i < allTextLines.length; i++) {
      // split content based on comma
      const data = allTextLines[i].split('","');

      const tarr = [];
      for (let j = 0; j < headers.length; j++) {
            tarr.push(data[j]);
      }

      lines.push(tarr);

    }
    this.parsedCsv = lines;
    // console.log(this.parsedCsv);



    function unique(array, propertyName) {
      return array.filter((e, i) => array.findIndex(a => a[propertyName] === e[propertyName]) === i);
    }
    // const parsedCsv = unique(this.parsedCsv, 0);

    function group_issues(array) {

      const ret = [];
      array.forEach((item, index) => {
        // console.log(item); // 1, 2, 3
        // console.log(index); // 0, 1, 2

          ret.forEach((retit, retindex) => {

            if (retit[0] === item[0]) {

              if (retit[1] !== '') {
                  retit[1] = retit[1] + ',' + item[1];
              }
              if (retit[4] !== item[4]) {

                if (retit[4] !== '') {


                  const doesContains = retit[4].match(item[4]);

                  if (doesContains !== null) {

                  } else {
                    if (item[6] === '0') {
                      retit[4] = retit[4] + '\n' + item[4];
                    } else {
                      retit[4] = retit[4] + '\n' + item[5] + '://' + item[4] + ':' + item[6];
                    }
                  }

                }

              }

            }

          });


          if (item[6] === '0') {
            item[4] = item[4];
          } else {
            item[4] = item[5] + '://' + item[4] + ':' + item[6];
          }

            ret.push(item);

      });
      // console.log(ret);
      return ret;
    }


    const parsedCsv2 = group_issues(this.parsedCsv);
    const parsedCsv = unique(parsedCsv2, 0);
    const date = new Date();
    const today = this.datePipe.transform(date, 'yyyy-MM-dd');
    const info = parsedCsv.map((res, key) => {

      const def = {
        title: res[7],
        poc: res[4],
        files: [],
        desc: res[8] + '\n\n' + res[9],
        severity: res[3],
        ref: res[11],
        cvss: res[2],
        cve: res[1],
        date: today
      };

      return def;
    });

    info.splice(info.length - 1, 1);
    info.splice(0, 1);
    this.dialogRef.close(info);

  }
}
