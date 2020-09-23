import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Http } from '@angular/http';
import { ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { IndexeddbService } from '../indexeddb.service';
import { DialogPassComponent } from '../dialog-pass/dialog-pass.component';
import { DialogAddissueComponent } from '../dialog-addissue/dialog-addissue.component';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { MessageService } from '../message.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DialogImportComponent } from '../dialog-import/dialog-import.component';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { DialogEditComponent } from '../dialog-edit/dialog-edit.component';
import { DialogExportissuesComponent } from '../dialog-exportissues/dialog-exportissues.component';
import { DialogChangelogComponent } from '../dialog-changelog/dialog-changelog.component';
import { DialogChangekeyComponent } from '../dialog-changekey/dialog-changekey.component';
import { DialogRemoveitemsComponent } from '../dialog-removeitems/dialog-removeitems.component';
import { DialogCvssComponent } from '../dialog-cvss/dialog-cvss.component';
import { DialogCveComponent } from '../dialog-cve/dialog-cve.component';
import marked from 'marked';
import { sha256 } from 'js-sha256';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss']
})

export class ReportComponent implements OnInit, OnDestroy {

  // Pie
  public pieChartLabels: string[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];
  public chartcolors: any[] = [{
    backgroundColor: ['#FF0039', '#FF7518', '#F9EE06', '#3FB618', '#2780E3']
  }];


  public pieChartData: number[] = [0, 0, 0, 0, 0];
  public pieChartType = 'pie';

  dialogRef: MatDialogRef<DialogPassComponent>;
  displayedColumns: string[] = ['date', 'desc', 'settings'];
  dataSource = new MatTableDataSource();
  listchangelog: any[];
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  advhtml = '';
  report_css: any;
  report_id: string;
  report_info: any;
  lastsavereportdata = '';
  reportdesc: any;
  selecteditem = false;
  selecteditems = [];
  selected3 = [];
  pok = 0;
  savemsg = '';
  report_decryption_in_progress: boolean;
  report_encryption_in_progress: boolean;
  upload_in_progress = false;
  decryptedReportData: any;
  decryptedReportDataChanged: any;
  subscription: Subscription;
  displayedSeverityColumns: string[] = ['severity', 'count'];
  dataSourceforseverity = [
    { severity: 'Critical', count: 0 },
    { severity: 'High', count: 0 },
    { severity: 'Medium', count: 0 },
    { severity: 'Low', count: 0 },
    { severity: 'Info', count: 0 }
  ];

  uploadlogoprev = '';
  adv_html: any;
  advlogo: any;
  advlogo_saved: any;

  constructor(private route: ActivatedRoute,
    public dialog: MatDialog,
    private http: Http,
    private indexeddbService: IndexeddbService,
    public router: Router,
    private messageService: MessageService) {

    // console.log(route);
    this.subscription = this.messageService.getDecrypted().subscribe(message => {
      this.decryptedReportData = message;
      this.decryptedReportDataChanged = this.decryptedReportData;
      this.adv_html = this.decryptedReportDataChanged.report_settings.report_html;
      this.advlogo_saved = this.decryptedReportDataChanged.report_settings.report_logo;

      this.doStats();


      let i = 0;
      do {
        this.selected3.push(false);
        i++;
      }
      while (i < this.decryptedReportDataChanged.report_vulns.length);

    });


  }

  ngOnInit() {
    this.report_id = this.route.snapshot.params['report_id'];

    // check if report exist
    this.indexeddbService.checkifreportexist(this.report_id).then(data => {
      if (data) {

        console.log('Report exist: OK');
        this.report_info = data;
        this.reportdesc = data;
        // check if pass in sessionStorage
        if (sessionStorage.getItem(data.report_id) !== null) {
          this.report_decryption_in_progress = true;
          const pass = sessionStorage.getItem(data.report_id);
          this.indexeddbService.decrypt(pass, data.report_id).then(returned => {

            if (returned) {
              this.report_decryption_in_progress = false;
            }

          });
        } else {
          setTimeout(_ => this.openDialog(data)); // BUGFIX: https://github.com/angular/angular/issues/6005#issuecomment-165911194
        }

      } else {
        console.log('Report exist: FAIL');
        this.router.navigate(['/my-reports']);
      }

    });


    // get css style
    this.http.get('/assets/bootstrap.min.css').subscribe(res => {
      this.report_css = res['_body'];
    });
  }

  // events
  public chartClicked(e: any): void {
    // console.log(e);
  }

  public chartHovered(e: any): void {
    // console.log(e);
  }

  toggle() {

    if (this.selected3.indexOf(true) !== -1) {
      this.pok = 1;
    } else {
      this.pok = 0;
    }

  }

  selectall() {
    this.selecteditems = [];
    this.selected3 = [];

    let i = 0;
    do {
      this.selected3.push(true);
      i++;
    }
    while (i < this.decryptedReportDataChanged.report_vulns.length);

  }

  deselectall() {
    this.selecteditems = [];
    this.selected3 = [];
    this.pok = 0;
    let i = 0;
    do {
      this.selected3.push(false);
      i++;
    }
    while (i < this.decryptedReportDataChanged.report_vulns.length);

  }

  removeSelecteditems(array) {

    const dialogRef = this.dialog.open(DialogRemoveitemsComponent, {
      width: '400px',
      data: { sel: array, orig: this.decryptedReportDataChanged.report_vulns }
    });

    dialogRef.afterClosed().subscribe(result => {

      if (result) {
        result.forEach(eachObj => {
          const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(eachObj);
          if (index !== -1) {
            this.decryptedReportDataChanged.report_vulns.splice(index, 1);
            this.addtochangelog('Remove issue: ' + eachObj.title);
          }
        });
        this.deselectall();
        this.doStats();
      }
    });

  }


  openDialogCVSS(data: any): void {

    const dialogRef = this.dialog.open(DialogCvssComponent, {
      width: '800px',
      disableClose: false,
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The CVSS dialog was closed');
    });

  }


  openDialogCVE(data: any): void {

    const dialogRef = this.dialog.open(DialogCveComponent, {
      width: '600px',
      disableClose: false,
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The CVE dialog was closed');
    });

  }


  openDialog(data: any): void {

    const dialogRef = this.dialog.open(DialogPassComponent, {
      width: '400px',
      disableClose: true,
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The security key dialog was closed');
    });

  }

  addtablescope(): void {

    this.decryptedReportDataChanged.report_scope = this.decryptedReportDataChanged.report_scope + ' \
\n\
IP   | hostname | role | comments\n\
------|--------------|-------|---------------\n\
127.0.0.1 | locahost.localdomain | PROD | client asked to test this one with care\n\
255.255.255.255 | N/A | DMZ | test you can go do whatever you want on it\n\
';

  }

  addcodescope(): void {

    this.decryptedReportDataChanged.report_scope = this.decryptedReportDataChanged.report_scope + ' \
\n\
```\n\
Sample code here\n\
```\n\
';

  }

  doStats() {

    const critical = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Critical');
    });

    const high = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'High');
    });

    const medium = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Medium');
    });

    const low = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Low');
    });

    const info = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Info');
    });

    this.dataSourceforseverity = [
      { severity: 'Critical', count: critical.length },
      { severity: 'High', count: high.length },
      { severity: 'Medium', count: medium.length },
      { severity: 'Low', count: low.length },
      { severity: 'Info', count: info.length }
    ];

    this.pieChartData = [critical.length, high.length, medium.length, low.length, info.length];

    this.listchangelog = this.decryptedReportData.report_changelog;
    this.dataSource = new MatTableDataSource(this.decryptedReportData.report_changelog);
    setTimeout(() => this.dataSource.sort = this.sort);
    setTimeout(() => this.dataSource.paginator = this.paginator);

  }

  addissue() {
    console.log('Add issue');
    const dialogRef = this.dialog.open(DialogAddissueComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      if (result !== undefined) {
        if (result.title !== '') {
          this.decryptedReportDataChanged.report_vulns.push(result);
          this.addtochangelog('Create issue: ' + result.title);
          this.doStats();
        }
      }

    });

  }

  import_issues() {
    console.log('Import issues');
    const dialogRef = this.dialog.open(DialogImportComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      if (result !== undefined) {
        result.forEach(eachObj => {

          if (eachObj.title !== '' && eachObj.title !== undefined && eachObj.cvss !== 'Active') {
            this.decryptedReportDataChanged.report_vulns.push(eachObj);
            this.addtochangelog('Create issue: ' + eachObj.title);
          }

        });

        this.doStats();
      }

    });

  }

  export_issues(item) {
    console.log('Export issues');
    const dialogRef = this.dialog.open(DialogExportissuesComponent, {
      width: '500px',
      data: item
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);

    });

  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.decryptedReportDataChanged.report_vulns, event.previousIndex, event.currentIndex);
    moveItemInArray(this.selecteditems, event.previousIndex, event.currentIndex);
    moveItemInArray(this.selected3, event.previousIndex, event.currentIndex);
  }

  saveReportChanges(report_id: any) {
    this.report_encryption_in_progress = true;
    this.savemsg = 'Please wait, report is encrypted...';
    const pass = sessionStorage.getItem(report_id);

    // update report
    this.decryptedReportDataChanged.report_version = this.decryptedReportDataChanged.report_version + 1;
    this.addtochangelog('Save report v.' + this.decryptedReportDataChanged.report_version);

    this.indexeddbService.getkeybyReportID(report_id).then(data => {
      if (data) {
        console.log(this.decryptedReportDataChanged);
        // tslint:disable-next-line:max-line-length
        this.indexeddbService.prepareupdatereport(this.decryptedReportDataChanged, pass, this.report_info.report_id, this.report_info.report_name, this.report_info.report_createdate, data.key).then(retu => {
          if (retu) {
            this.report_encryption_in_progress = false;
            this.savemsg = 'All changes saved successfully!';
            this.lastsavereportdata = retu;
            this.doStats();
          }
        });

      }
    });
  }

  sortbycvss() {
    this.deselectall();
    this.decryptedReportDataChanged.report_vulns = this.decryptedReportDataChanged.report_vulns.sort((a, b) => b.cvss - a.cvss);
  }


  editreporttitle(item) {

    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '350px',
      data: item
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });

  }

  changesecuritykey(report_id: string) {

    const dialogRef = this.dialog.open(DialogChangekeyComponent, {
      width: '450px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      if (result) {
        this.updateSecKey(report_id, result);
      }

    });

  }

  updateSecKey(report_id, pass) {

    this.savemsg = 'Please wait, report is encrypted...';
    sessionStorage.setItem(report_id, pass);

    // update report
    this.addtochangelog('Change report security key');
    this.decryptedReportDataChanged.report_version = this.decryptedReportDataChanged.report_version + 1;
    this.addtochangelog('Save report v.' + this.decryptedReportDataChanged.report_version);

    this.indexeddbService.getkeybyReportID(report_id).then(data => {
      if (data) {
        // tslint:disable-next-line:max-line-length
        this.indexeddbService.prepareupdatereport(this.decryptedReportDataChanged, pass, this.report_info.report_id, this.report_info.report_name, this.report_info.report_createdate, data.key).then(retu => {
          if (retu) {
            this.savemsg = 'All changes saved successfully!';
            this.lastsavereportdata = retu;
            this.doStats();
          }
        });

      }
    });

  }

  editissuetitle(item) {
    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '350px',
      data: item
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }
  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.subscription.unsubscribe();
  }

  addresearcher() {

    const add = {
      reportername: '',
      reportersocial: '',
      reporterwww: '',
      reporteremail: ''
    };

    this.decryptedReportDataChanged.researcher.push(add);

  }

  removeresearcher(item) {

    const index: number = this.decryptedReportDataChanged.researcher.indexOf(item);

    if (index !== -1) {
      this.decryptedReportDataChanged.researcher.splice(index, 1);
      this.addtochangelog('Remove researcher');
    }

  }


  addchangelog() {
    const dialogRef = this.dialog.open(DialogChangelogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      if (result !== undefined) {
        this.decryptedReportDataChanged.report_changelog.push(result);
        this.doStats();
      }

    });
  }


  editchangelog(item) {
    const dialogRef = this.dialog.open(DialogChangelogComponent, {
      width: '500px',
      data: item
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      if (result) {
        const index: number = this.decryptedReportDataChanged.report_changelog.indexOf(result.origi);

        if (index !== -1) {
          this.decryptedReportDataChanged.report_changelog[index] = { date: result.date, desc: result.desc };
          this.doStats();
        }
      }

    });
  }


  addtochangelog(item) {
    const today: number = Date.now();
    const add_changelog = {
      date: today,
      desc: item
    };

    this.decryptedReportDataChanged.report_changelog.push(add_changelog);
    this.doStats();
  }
  removefromchangelog(item) {
    const remo = 'changelog';
    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '350px',
      data: [{ remo }, { item }],
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      const index: number = this.decryptedReportDataChanged.report_changelog.indexOf(result);

      if (index !== -1) {
        this.decryptedReportDataChanged.report_changelog.splice(index, 1);
        this.doStats();
      }
    });
  }


  removeIssiue(item) {
    const remo = 'remove';
    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '350px',
      data: [{ remo }, { item }],
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(result);

      if (index !== -1) {
        this.decryptedReportDataChanged.report_vulns.splice(index, 1);
        this.addtochangelog('Remove issue: ' + result.title);
        this.doStats();
      }

    });
  }



  shareReport(report_id) {
    this.indexeddbService.downloadEncryptedReport(report_id);
  }

  downloadASCII(report_details, metadata) {

    function addNewlines(str) {
      return stringDivider(str, 100, '\n');
    }

    function stringDivider(str, width, spaceReplacer) {
      if (str.length > width) {
        let p = width;
        for (; p > 0 && str[p] !== ' '; p--) { }
        if (p > 0) {
          const left = str.substring(0, p);
          const right = str.substring(p + 1);
          return left + spaceReplacer + stringDivider(right, width, spaceReplacer);
        }
      }
      return str;
    }

    let report_ascii_head = '######################################################\n\
# Report Title: ' + metadata.report_name + '\n\
# Report ID: ' + metadata.report_id + '\n\
# Create Date: ' + new Date(metadata.report_createdate).toLocaleString() + '\n\
# Last Update: ' + new Date(metadata.report_lastupdate).toLocaleString() + '\n';

    if (report_details.researcher.length > 0) {

      report_ascii_head = report_ascii_head + '#####\n# Author: \n';

      report_details.researcher.forEach(function (value, key) {

        if (value.reportername !== '') {
          report_ascii_head = report_ascii_head + '# ' + value.reportername + '';
        }

        if (value.reporteremail !== '') {
          report_ascii_head = report_ascii_head + ' - E-mail: ' + value.reporteremail + '';
        }

        if (value.reportersocial !== '') {
          report_ascii_head = report_ascii_head + ' - Social: ' + value.reportersocial + '';
        }

        if (value.reporterwww !== '') {
          report_ascii_head = report_ascii_head + ' - WWW: ' + value.reporterwww + '';
        }

        report_ascii_head = report_ascii_head + '\n';
      }, this);

    }

    if (report_details.report_scope !== '') {
      report_ascii_head = report_ascii_head + '# Report scope: \n' + addNewlines(report_details.report_scope);
    }

    report_ascii_head = report_ascii_head + '######################################################\n\
# Vulnerabilities:\n\n';

    let report_ascii_vulns = '';
    report_details.report_vulns.forEach(function (value, key) {

      report_ascii_vulns += report_ascii_vulns = '\n-> ' + Number(key + 1) + '. ' + value.title;

      if (value.severity !== '') {
        report_ascii_vulns = report_ascii_vulns + '\n# Severity: ' + value.severity + '\n';
      }

      if (value.date !== '') {
        report_ascii_vulns = report_ascii_vulns + '# Find Date: ' + value.date + '\n';
      }

      if (value.cvss !== '') {
        report_ascii_vulns = report_ascii_vulns + '# CVSS: ' + value.cvss + '\n';
      }

      if (value.cve !== '') {
        report_ascii_vulns = report_ascii_vulns + '# CVE: ' + addNewlines(value.cve) + '\n';
      }

      report_ascii_vulns = report_ascii_vulns + '# Description: \n' + addNewlines(value.desc) + '\n';

      if (value.poc !== '') {
        report_ascii_vulns = report_ascii_vulns + '# PoC: \n' + addNewlines(value.poc) + '\n';
      }

      if (value.ref !== '') {
        report_ascii_vulns = report_ascii_vulns + '# References: \n' + value.ref + '\n\n';
      }


    }, this);

    const report_ascii_end = '\n# Report generated by vulnrepo.com \n######################################################\n';
    const report_ascii = report_ascii_head + report_ascii_vulns + report_ascii_end;

    // download ascii report
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(report_ascii));
    element.setAttribute('download', metadata.report_name + ' ' + metadata.report_id + ' ASCII (vulnrepo.com).txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

  }


  DownloadHTML(report_data, report_metadata) {

    function escapeHtml(unsafe) {
      return unsafe.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function parse_newline(text) {
      return text.toString().replace(/(?:\r\n|\r|\n)/g, '<br>');
    }


    function parse_links(text) {
      const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
      // tslint:disable-next-line:no-shadowed-variable
      return text.replace(urlRegex, function (url) {
        return '<a target="_blank" href="' + url + '">' + url + '</a>';
      });
    }

    let report_html = `
    <html>
    <head>
    <meta charset="utf-8"/>
    <style>

    ` + this.report_css + `


    @import "compass/css3";
    * {
      padding: 0;
      margin: 0;
    }
    body {
      margin: 20 10 20 10;
    }
    .pagebreak { page-break-before: always; }


    .label {
      color: white;
      display: inline-block;
      font-family: verdana, sans-serif;
      padding: 4px;
    }
    /*critical*/
    .critical {
      border-color: #FF0039;
      background-color: #FF0039;
    }
    /*high*/
    .high {
      border-color: #FF7518;
      background-color: #FF7518;
    }
    /*medium*/
    .medium {
      color: #000;
      border-color: #F9EE06;
      background-color: #F9EE06;
    }
    /*low*/
    .low {
      border-color: #3FB618;
      background-color: #3FB618;
    }
    /*information*/
    .info {
      border-color: #2780E3;
      background-color: #2780E3;
    }
    .strbreak {
      word-break: break-word;
    }
    ul {
      list-style-position: inside;
    }
    </style>
    </head>
    <body class="container">
    <br><br>`;

    // report settings
    const advlogo = report_data.report_settings.report_logo;
    if (advlogo !== '') {
      const er = '<center><img src="' + advlogo + '" width="800px"></center><br><br>';
      report_html = report_html + er;
    }

    const advhtml = report_data.report_settings.report_html;
    if (advhtml !== '') {
      this.advhtml = advhtml;
    }


    let intro = ' \
    <div id="row"> \
    <center> \
      <div class="card border-light mb-3" style="max-width: 30rem;"> \
        <div class="card-header">Security Report</div> \
        <div class="card-body"> \
        <h4 class="card-title">' + escapeHtml(report_metadata.report_name) + '</h4> \
        <p class="card-text">Report Version: ' + escapeHtml(report_data.report_version) + '</p> \
        <p class="card-text">Report ID: ' + escapeHtml(report_metadata.report_id) + '</p>';

    if (report_data.report_metadata.starttest !== '') {

      const stringToSplit = new Date(report_data.report_metadata.starttest).toLocaleString();
      const x = stringToSplit.split(',');

      const stringToSplit2 = new Date(report_data.report_metadata.starttest).toLocaleString();
      const y = stringToSplit2.split(',');

      // tslint:disable-next-line:max-line-length
      const cond0 = '<p class="card-text">Date: ' + escapeHtml(x[0]) + ' - ' + escapeHtml(y[0]) + '</p>';
      intro = intro + cond0;
    }

    const cond5 = ' \
        </div> \
      </div> \
    </center> \
    </div> \
    <br> \
    <br> \
    <br> \
    <div style="text-align: center;"><h2 style="color: red">CONFIDENTIAL</h2></div> \
    <div class="pagebreak"></div> \
    <br>';
    intro = intro + cond5;

    const tableofcontent_one = ' \
    <div id="row"> \
    <h3>Table of contents</h3> \
    <ul class="list-group">';

    let tableofcontentlist = '<li class="list-group-item d-flex justify-content-between align-items-center"> \
                                  <a href="#Scope">Scope</a> \
                              </li> \
                              <li class="list-group-item d-flex justify-content-between align-items-center"> \
                                  <a href="#Statistics and Risk">Statistics and Risk</a> \
                              </li> \
                              <li class="list-group-item d-flex justify-content-between align-items-center"> \
                                  <a href="#Issues">Issues (' + report_data.report_vulns.length + ')</a> \
                              </li>';
    report_data.report_vulns.forEach((item, index) => {

      tableofcontentlist = tableofcontentlist + ' \
      <li class="list-group-item d-flex justify-content-between align-items-center"> \
        <a href="#' + index + '">' + escapeHtml(item.title) + '</a> \
        <span class="label ' + escapeHtml(item.severity) + '">' + escapeHtml(item.severity) + '</span> \
      </li>';

    });


    let summarycomment = '';
    if (report_data.report_summary !== '') {
      summarycomment = '<li class="list-group-item d-flex justify-content-between align-items-center"> \
      <a href="#Report summary comment">Report summary comment</a> \
  </li>';
    }

    let authors = '';
    if (report_data.researcher.length > 0) {
      authors = '<li class="list-group-item d-flex justify-content-between align-items-center"> \
      <a href="#Report authors">Report authors</a> \
  </li>';
    }

    const tableofcontent_1 = '<li class="list-group-item d-flex justify-content-between align-items-center"> \
        <a href="#Changelog">Changelog</a> \
    </li> \
    </ul> \
    </div> \
    <br> \
    <div class="pagebreak"></div> \
    <br><br>';
    const tableofcontent = tableofcontent_one + tableofcontentlist + summarycomment + authors + tableofcontent_1;

    const critical = report_data.report_vulns.filter(function (el) {
      return (el.severity === 'Critical');
    });

    const high = report_data.report_vulns.filter(function (el) {
      return (el.severity === 'High');
    });

    const medium = report_data.report_vulns.filter(function (el) {
      return (el.severity === 'Medium');
    });

    const low = report_data.report_vulns.filter(function (el) {
      return (el.severity === 'Low');
    });

    const info = report_data.report_vulns.filter(function (el) {
      return (el.severity === 'Info');
    });

    const stats = '<table class="table table-hover"> \
    <thead> \
      <tr> \
        <th>Severity</th> \
        <th>Number</th> \
      </tr> \
    </thead> \
    <tbody> \
      <tr> \
        <td><span class="label Critical">Critical</span></td> \
        <td>' + critical.length + '</td> \
      </tr> \
    <tr> \
        <td><span class="label High">High</span></td> \
        <td>' + high.length + '</td> \
      </tr> \
    <tr> \
        <td><span class="label Medium">Medium</span></td> \
        <td>' + medium.length + '</td> \
      </tr> \
    <tr> \
        <td><span class="label Low">Low</span></td> \
        <td>' + low.length + '</td> \
      </tr> \
    <tr> \
        <td><span class="label Info">Info</span></td> \
        <td>' + info.length + '</td> \
      </tr> \
    </tbody> \
  </table>';


    const risktable = '<table class="table table-hover"> \
<thead> \
  <tr> \
    <th colspan="5" class="text-center">Overall Risk Severity</th> \
  </tr> \
</thead> \
<tbody> \
  <tr> \
    <td rowspan="4" class="text-center"><b>Impact</b></td> \
  <td class="text-center" style="color: #EB7F30;"><b>HIGH</b></td> \
  <td class="text-center"><span style="width: 100%;" class="label Medium">Medium</span></td> \
  <td class="text-center"><span style="width: 100%;" class="label High">High</span></td> \
  <td class="text-center"><span style="width: 100%;" class="label Critical">Critical</span></td> \
  </tr> \
  <tr> \
  <td class="text-center" style="color: #FFFB01;"><b>MEDIUM</b></td> \
  <td class="text-center"><span style="width: 100%;" class="label Low">Low</span></td> \
  <td class="text-center"><span style="width: 100%;" class="label Medium">Medium</span></td> \
  <td class="text-center"><span style="width: 100%;" class="label High">High</span></td> \
  </tr> \
  <tr> \
  <td class="text-center" style="color: #91D054;"><b>LOW</b></td> \
  <td class="text-center"><span style="width: 100%;" class="label Info">Info</span></td> \
  <td class="text-center"><span style="width: 100%;" class="label Low">Low</span></td> \
  <td class="text-center"><span style="width: 100%;" class="label Medium">Medium</span></td> \
  </tr> \
  <tr> \
    <td>&nbsp;</td> \
  <td class="text-center" style="color: #91D054;"><b>LOW</b></td> \
  <td class="text-center" style="color: #FFFB01;"><b>MEDIUM</b></td> \
  <td class="text-center" style="color: #EB7F30;"><b>HIGH</b></td> \
  </tr> \
</tbody> \
<tfoot> \
  <tr> \
    <td>&nbsp;</td> \
  <td colspan="4" class="text-center"><b>Likelihood</b></td> \
  </tr> \
</tfoot> \
</table>';

    // add Markdown rendering
    const renderer = new marked.Renderer();
    renderer.table = function (header, body) {
      const table = `
          <table class="table">
              <thead>${header}</thead>
              <tbody>${body}</tbody>
          </table>
      `;
      return table;
    };
    const scopemarked = marked(report_data.report_scope, { renderer: renderer });

    // advanced text
    let projscope = '<h3 id="Scope">Scope</h3><p>' + scopemarked + '</p>';

    if (this.advhtml !== '') {
      const reportHTMLmarked = marked(this.advhtml, { renderer: renderer });
      projscope = projscope + '<br>' + reportHTMLmarked + '<br>';
    }

    const statsandrisk = '<h3 id="Statistics and Risk">Statistics and Risk</h3> \
    <p>' + stats + '</p><br>  \
    <p>The risk of application security vulnerabilities discovered during an assessment will be rated according to a custom-tailored version the <a target="_blank" href="https://www.owasp.org/index.php/OWASP_Risk_Rating_Methodology">OWASP Risk Rating Methodology</a>. \
    Risk severity is determined based on the estimated technical and business impact of the vulnerability, and on the estimated likelihood of the vulnerability being exploited:<br><br> \
    ' + risktable + '<br>Our Risk rating is based on this calculation: <b>Risk = Likelihood * Impact</b>.</p><div class="pagebreak"></div><br>';

    const advtext = projscope + statsandrisk;

    let issues = '<p><center><h3 id="Issues">Issues (' + report_data.report_vulns.length + ')</h3></center></p>';
    report_data.report_vulns.forEach((item, index) => {
      issues = issues + ' \
      <div class="row"> \
      <h4 id="' + index + '"> \
      <span class="label ' + escapeHtml(item.severity) + '">' + escapeHtml(item.severity) + '</span> \
      ' + escapeHtml(item.title) + '</h4> \
        <dl> \
          <dt>Vulnerability description</dt> \
          <dd class="strbreak">' + escapeHtml(item.desc) + '</dd><br>';

      if (item.poc !== '' || item.files.length !== 0) {
        const ewe = ' \
            <dt>Proof of Concept</dt> \
            <dd class="strbreak"> \
            <div style="white-space: pre-wrap;">' + escapeHtml(item.poc) + '</div>';

        let fil = '';
        item.files.forEach((ite, ind) => {


          let shac = '';
          if (ite.sha256checksum) {
            shac = '<br><small>(SHA256 File Checksum: ' + ite.sha256checksum + ')</small>';
          }

          let fsize = '';
          if (ite.size) {
            fsize = '&nbsp;<small>(Size: ' + ite.size + ' bytes)</small>';
          }

          if (ite.type.includes('image')) {
            // tslint:disable-next-line:max-line-length
            fil = fil + '<b>Attachment: <i>' + escapeHtml(ite.title) + '</i></b>' + fsize + shac + '<br><img src="' + ite.data + '" title="' + escapeHtml(ite.title) + '" class="img-fluid"><br><br>';
          } else if (ite.type === 'text/plain') {
            const byteString = atob(ite.data.split(',')[1]);
            // tslint:disable-next-line:max-line-length
            fil = fil + '<b>Attachment: <i>' + escapeHtml(ite.title) + '</i></b>' + fsize + shac + '<br><b>[file content]:</b><pre>' + escapeHtml(byteString) + '</pre><br><br>';
          } else {
            fil = fil + '<b>Attachment: <a href="' + ite.data + '" download="' + escapeHtml(ite.title) + '"><i>' + escapeHtml(ite.title) + '</i></a></b>' + fsize + shac + '<br><br>';
          }

        });

        const ewe2 = '</dd><br>';
        issues = issues + ewe + fil + ewe2;
      }

      if (item.ref !== '') {
        const eweref = ' \
            <dt>References</dt> \
            <dd class="strbreak">' + parse_links(parse_newline(escapeHtml(item.ref))) + '</dd><br>';
        issues = issues + eweref;
      }

      const enderw = '</dl></div>';
      issues = issues + enderw;
    });

    issues = issues + '<div class="pagebreak"></div>';

    let summarycomment_value = '';
    if (report_data.report_summary !== '') {
      // tslint:disable-next-line:max-line-length
      summarycomment_value = '<h3 id="Report summary comment">Report summary comment</h3><p>' + parse_newline(escapeHtml(report_data.report_summary)) + '</p><br>';
    }


    let authors_value = '';
    if (report_data.researcher.length > 0) {



      let aut = '';

      report_data.researcher.forEach((ite, ind) => {

        if (ite.reportername !== '') {
          aut = aut + '<tr> \
          <td>' + ite.reportername + '</td> \
          <td>' + ite.reporteremail + '</td> \
          <td>' + ite.reportersocial + '</td> \
          <td>' + ite.reporterwww + '</td> \
        </tr>';
        }
      });




      const authtab = ' \
<table class="table table-hover"> \
  <thead> \
    <tr> \
      <th scope="col">Name</th> \
      <th scope="col">E-mail</th> \
      <th scope="col">Social links</th> \
      <th scope="col">Website</th> \
    </tr> \
  </thead> \
  <tbody> \
' + aut + ' \
  </tbody> \
</table> \
';


      // tslint:disable-next-line:max-line-length
      authors_value = '<h3 id="Report authors">Report authors</h3><p>' + authtab + '</p><br>';
    }



    let changeloghtml = summarycomment_value + '<h3 id="Changelog">Changelog</h3> \
<p><table class="table table-hover"> \
<thead> \
  <tr> \
    <th>Date</th> \
  <th>Description</th> \
  </tr> \
</thead> \
<tbody>';


    report_data.report_changelog.forEach((item, index) => {

      changeloghtml = changeloghtml + '<tr> \
<td>' + escapeHtml(new Date(item.date).toLocaleString()) + '</td> \
<td>' + escapeHtml(item.desc) + '</td> \
</tr>';

    });




    changeloghtml = changeloghtml + '</tbody></table></p>';


    const report_html_end = `<div class="pagebreak"></div>
    <p>Generated by <a href="https://vulnrepo.com/">VULNRΞPO</a></p>
    </body>
    </html>
    `;

    // tslint:disable-next-line:max-line-length
    const download_report_complete = report_html + intro + tableofcontent + advtext + issues + authors_value + changeloghtml + report_html_end;

    // download HTML report

    const blob = new Blob([download_report_complete], { type: 'text/html' });
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', report_metadata.report_name + ' ' + report_metadata.report_id + ' HTML (vulnrepo.com).html');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  }

  checksumfile(dataurl, files, dec_data) {
    let file_sha2 = '';
    // sha256 file checksum
    const reader = new FileReader();
    reader.onloadend = (e) => {
      file_sha2 = sha256(reader.result);
      this.proccessUpload(dataurl, files[0].name, files[0].type, files[0].size, file_sha2, dec_data);
    };
    reader.readAsArrayBuffer(files[0]);

  }

  proccessUpload(data, name, type, size, sha256check, dec_data) {

    const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(dec_data);
    const today: number = Date.now();

    function escapeHtml(unsafe) {
      return unsafe.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    this.upload_in_progress = false;
    const linkprev = data;
    // tslint:disable-next-line:max-line-length
    this.decryptedReportDataChanged.report_vulns[index].files.push({ 'data': linkprev, 'title': escapeHtml(name), 'type': escapeHtml(type), 'size': size, 'sha256checksum': sha256check, 'date': today });

  }

  uploadAttach(input: HTMLInputElement, dec_data) {

    const files = input.files;
    if (files && files.length) {
      this.upload_in_progress = true;
      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        this.checksumfile(fileReader.result, files, dec_data);
      };
      fileReader.readAsDataURL(fileToRead);

    }

  }

  downloadAttach(data, name) {

    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    const byteString = atob(data.split(',')[1]);

    // separate out the mime component
    const mimeString = data.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to an ArrayBuffer
    const ab = new ArrayBuffer(byteString.length);

    // create a view into the buffer
    const ia = new Uint8Array(ab);

    // set the bytes of the buffer to the correct values
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    const blob = new Blob([ab], { type: mimeString });

    const fileName = name;
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  }


  removeAttach(data, dec_data) {
    const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(dec_data);
    const ind: number = this.decryptedReportDataChanged.report_vulns[index].files.indexOf(data);
    if (ind !== -1) {
      this.decryptedReportDataChanged.report_vulns[index].files.splice(ind, 1);
    }
  }


  parselogo(data) {
    const linkprev = 'data:image/png;base64,' + btoa(data);
    this.uploadlogoprev = '<img src="' + linkprev + '" width="100px">';
    this.advlogo = linkprev;
    this.decryptedReportDataChanged.report_settings.report_logo = this.advlogo;
  }

  clearlogo() {
    this.decryptedReportDataChanged.report_settings.report_logo = '';
    this.uploadlogoprev = '';
    this.advlogo = '';
    this.advlogo_saved = '';
    console.log('Logo cleared!');
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

