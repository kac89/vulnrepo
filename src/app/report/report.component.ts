import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';

import { ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material';
import { IndexeddbService } from '../indexeddb.service';
import { DialogPassComponent } from '../dialog-pass/dialog-pass.component';
import { DialogAddissueComponent } from '../dialog-addissue/dialog-addissue.component';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { MessageService } from '../message.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { KeyValueDiffers, KeyValueChangeRecord } from '@angular/core';
import { DialogImportComponent } from '../dialog-import/dialog-import.component';
import { MatSort, MatTableDataSource, MatPaginator } from '@angular/material';
import { DialogEditComponent } from '../dialog-edit/dialog-edit.component';

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

  private _differ: any;
  public pieChartData: number[] = [0, 0, 0, 0, 0];
  public pieChartType = 'pie';

  dialogRef: MatDialogRef<DialogPassComponent>;
  displayedColumns: string[] = ['date', 'desc', 'settings'];
  dataSource = new MatTableDataSource();
  listchangelog: any[];
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;


  report_id: string;
  report_info: any;
  lastsavereportdata = '';
  reportdesc = '';
  savemsg = '';
  report_decryption_in_progress: boolean;
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
  // $scope.filteredCritical = $filter('filter')($scope.groups, { severity: 'Critical' }).length;


  constructor(private route: ActivatedRoute,
    public dialog: MatDialog,
    private indexeddbService: IndexeddbService,
    public router: Router,
    private messageService: MessageService,
    private _differs: KeyValueDiffers) {

    console.log(route);
    this.subscription = this.messageService.getDecrypted().subscribe(message => {
      this.decryptedReportData = message;
      this.decryptedReportDataChanged = this.decryptedReportData;

      this.doStats();
    });

    this._differ = _differs.find({}).create();
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

  }

  // tslint:disable-next-line:use-life-cycle-interface
  ngDoCheck() {
    const change = this._differ.diff(this.decryptedReportDataChanged);
    if (change) {
      console.log('Changes detected!');
      change.forEachChangedItem((record: KeyValueChangeRecord<any, any>) => {
        console.log(record.key + ': ' + record.previousValue + '=>' + record.currentValue);
      });

      change.forEachRemovedItem((record: KeyValueChangeRecord<any, any>) => {
        console.log(record.key + ': ' + record.previousValue + '=>' + record.currentValue);
      });

      change.forEachAddedItem((record: KeyValueChangeRecord<any, any>) => {
        console.log(record.key + ': ' + record.previousValue + '=>' + record.currentValue);
      });
    }
  }

  // events
  public chartClicked(e: any): void {
    console.log(e);
  }

  public chartHovered(e: any): void {
    console.log(e);
  }

  openDialog(data: any): void {

    const dialogRef = this.dialog.open(DialogPassComponent, {
      width: '400px',
      disableClose: true,
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The pass dialog was closed');
    });

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
      width: '350px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);

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
      width: '350px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);

      if (result !== undefined) {
        result.forEach(eachObj => {

          if (eachObj.title !== '' && eachObj.title !== undefined) {
            this.decryptedReportDataChanged.report_vulns.push(eachObj);
            this.addtochangelog('Create issue: ' + eachObj.title);
          }

        });

        this.doStats();
      }

    });

  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.decryptedReportDataChanged.report_vulns, event.previousIndex, event.currentIndex);
  }

  saveReportChanges(report_id: any) {
    this.savemsg = '';
    const pass = sessionStorage.getItem(report_id);

    // update report
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

  sortbycvss() {
    this.decryptedReportDataChanged.report_vulns = this.decryptedReportDataChanged.report_vulns.sort((a, b) => b.cvss - a.cvss);
  }


  editreporttitle(item) {
    console.log(item);

    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '350px',
      data: item
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);

    });

  }


  editissuetitle(item) {
    console.log(item);

    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '350px',
      data: item
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);

    });
  }
  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.subscription.unsubscribe();
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
    console.log(item);
    const remo = 'changelog';
    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '350px',
      data: [{ remo }, { item }],
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);
      const index: number = this.decryptedReportDataChanged.report_changelog.indexOf(result);

      if (index !== -1) {
        this.decryptedReportDataChanged.report_changelog.splice(index, 1);
        this.doStats();
      }
    });
  }


  removeIssiue(item) {
    console.log(item);
    const remo = 'remove';
    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '350px',
      data: [{ remo }, { item }],
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);

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
      let result = '';
      while (str.length > 0) {
        result += str.substring(0, 100) + '\n';
        str = str.substring(100);
      }
      return result;
    }

const report_ascii_head = '######################################################\n\
# Report Title: ' + addNewlines(metadata.report_name) + '\
# Report ID: ' + metadata.report_id + '\n\
# Create Date: ' + metadata.report_createdate + '\n\
# Last Update: ' + metadata.report_lastupdate + '\n\
#####\n\
# Author: ' + report_details.researcher.reportername + '\n\
# WWW: ' + report_details.researcher.reporterwww + '\n\
# Social: ' + report_details.researcher.reportersocial + '\n\
#####\n\
# Report scope: \n' + addNewlines(report_details.report_scope) + '\
######################################################\n\
# Vulnerabilities:\n\n';

let report_ascii_vulns = '';
report_details.report_vulns.forEach(function (value, key) {

report_ascii_vulns += report_ascii_vulns = '\
' + Number(key + 1) + '. ' + addNewlines(value.title) + '\
# Severity: ' + value.severity + '\n\
# Find Date: ' + value.date + '\n\
# CVSS: ' + value.cvss + '\n\
# CVE: ' + addNewlines(value.cve) + '\n\
\n\
# Description: \n\
' + addNewlines(value.desc) + '\n\
# PoC: \n\
' + addNewlines(value.poc) + '\
\n# References: \n\
' + value.ref + '\n\n';

}, this);

    const report_ascii_end = '\n# Report generated by vulnrepo.com \n######################################################\n';
    const report_ascii = report_ascii_head + report_ascii_vulns + report_ascii_end;

    // download ascii report
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(report_ascii));
    element.setAttribute('download', metadata.report_name + ' ASCII (vulnrepo.com).txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

  }
}

