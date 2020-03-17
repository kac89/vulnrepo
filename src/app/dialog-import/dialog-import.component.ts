import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import * as xml2js from 'xml2js';

@Component({
  selector: 'app-dialog-import',
  templateUrl: './dialog-import.component.html',
  styleUrls: ['./dialog-import.component.scss']
})
export class DialogImportComponent implements OnInit {
  csvContent: string;
  parsedCsv: any[];
  xmltojson: any[];
  public show_input = true;
  public please_wait = false;
  public burpshow_input = true;
  public burpplease_wait = false;
  public openvas9show_input = true;
  public openvas9please_wait = false;

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

    function unique(array, propertyName) {
      return array.filter((e, i) => array.findIndex(a => a[propertyName] === e[propertyName]) === i);
    }

    function group_issues(array) {

      const ret = [];
      array.forEach((item, index) => {

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


  burponFileSelect(input: HTMLInputElement) {
    const files = input.files;
    if (files && files.length) {
      this.burpshow_input = false;
      this.burpplease_wait = true;
      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = this.onFileLoad;
      fileReader.onload = (e) => {
        this.parseBurp(fileReader.result);
      };
      fileReader.readAsText(fileToRead, 'UTF-8');
    }
  }



  parseBurp(xml) {

    function returnhost(host, path) {
      let ret = '';
      host.map((res, key) => {
        ret = ret + res.$.ip + ' ' + res._ + path[key] + '\n';
      });
      return ret;
    }

    function setcvss(severity) {

      let cvss = 0;
      if (severity === 'High') {
        cvss = 8;
      } else if (severity === 'Medium') {
        cvss = 5;
      } else if (severity === 'Low') {
        cvss = 2;
      } else if (severity === 'Info') {
        cvss = 0;
      }

      return cvss;
    }

    this.xmltojson = [];
    const parser = new xml2js.Parser({ strict: true, trim: true });
    parser.parseString(xml, (err, result) => {
      this.xmltojson = result.issues.issue;
    });


    const emp = [];

    const info2 = this.xmltojson.map((res, key) => {

      if (!emp.find(x => x.type[0] === res.type[0])) {
        emp.push(res);
      } else {
        const index = emp.findIndex(x => x.type[0] === res.type[0]);

        emp[index].location.push(res.location[0]);
        emp[index].path.push(res.path[0]);
        emp[index].host.push(res.host[0]);

      }


    });

    const date = new Date();
    const today = this.datePipe.transform(date, 'yyyy-MM-dd');
    const info = emp.map((res, key) => {

      let item = '';
      if (res.vulnerabilityClassifications !== undefined) {
        item = res.vulnerabilityClassifications[0].replace(/<[^>]*>/g, '');
      } else {
        item = '';
      }

      let itempoc = '';
      if (res.issueDetail !== undefined) {
        itempoc = res.issueDetail[0].replace(/<[^>]*>/g, '');
      } else {
        itempoc = '';
      }

      let itemrem = '';
      if (res.remediationBackground !== undefined) {
        itemrem = res.remediationBackground[0].replace(/<[^>]*>/g, '');
      } else {
        itemrem = '';
      }

      if (res.severity[0] === 'Information') {
        res.severity[0] = 'Info';
      }

      const def = {
        title: res.name[0],
        poc: itempoc + '\n\n' + returnhost(res.host, res.path),
        files: [],
        desc: res.issueBackground[0].replace(/<[^>]*>/g, '') + '\n\n' + itemrem,
        severity: res.severity[0],
        ref: item,
        cvss: setcvss(res.severity[0]),
        cve: '',
        date: today
      };

      return def;
    });


    this.dialogRef.close(info);

  }

  openvas9onFileSelect(input: HTMLInputElement) {
    const files = input.files;
    if (files && files.length) {
      this.openvas9show_input = false;
      this.openvas9please_wait = true;
      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = this.onFileLoad;
      fileReader.onload = (e) => {
        this.parseOpenvas9(fileReader.result);
      };
      fileReader.readAsText(fileToRead, 'UTF-8');
    }
  }

  parseOpenvas9(xml) {

    this.xmltojson = [];
    const parser = new xml2js.Parser({ strict: true, trim: true });

    parser.parseString(xml, (err, result) => {
      if (result.report !== undefined) {
        if (result.report.report) {
          this.xmltojson = result.report.report;
        }
      } else {
        if (result.get_results_response !== undefined) {
          this.parseOpenvasxml(result.get_results_response.result);
        }
      }
    });

    this.xmltojson.forEach((myObject, index) => {
      if (myObject.results) {
        myObject.results.forEach((myarrdeep, index) => {
          this.parseOpenvasxml(myarrdeep.result);
        });
      }
    });

  }

  parseOpenvasxml(xml) {

    const date = new Date();
    const today = this.datePipe.transform(date, 'yyyy-MM-dd');
    const info = xml.map((res, key) => {

      const def = {
        title: res.name,
        poc: res.port[0] + '\n\n' + res.host[0]._,
        files: [],
        desc: res.description,
        severity: res.threat[0],
        ref: res.nvt[0].xref[0],
        cvss: res.severity[0],
        cve: '',
        date: today
      };

      return def;
    });

    this.dialogRef.close(info);
  }

}
