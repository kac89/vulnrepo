import { Component, OnInit, OnDestroy } from '@angular/core';

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
  displayedColumns: string[] = ['position', 'name'];
  report_id: string;
  report_info = '';
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
        setTimeout(_ => this.openDialog(data)); // BUGFIX: https://github.com/angular/angular/issues/6005#issuecomment-165911194

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
      console.log('The dialog was closed');
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


  }

  addissue() {

    // this.indexeddbService.addIssue();

    console.log('Add issue');

    const dialogRef = this.dialog.open(DialogAddissueComponent, {
      width: '350px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);

      if (result !== undefined) {
        this.decryptedReportDataChanged.report_vulns.push(result);
        this.doStats();
      }

    });

  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.decryptedReportDataChanged.report_vulns, event.previousIndex, event.currentIndex);
  }

  saveReportChanges() {
    console.log(this.decryptedReportDataChanged);
  }

  sortbycvss() {

    this.decryptedReportDataChanged.report_vulns = this.decryptedReportDataChanged.report_vulns.sort((a, b) => {
      if (a.cvss > b.cvss) {
        return -1;
      } else if (b.cvss > a.cvss) {
        return 1;
      } else {
        return 0;
      }
    });

  }

  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.subscription.unsubscribe();
  }

}

