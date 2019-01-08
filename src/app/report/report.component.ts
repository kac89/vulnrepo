import { Component, OnInit, OnDestroy } from '@angular/core';

import { ActivatedRoute} from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material';
import { IndexeddbService } from '../indexeddb.service';
import { DialogPassComponent } from '../dialog-pass/dialog-pass.component';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { MessageService } from '../message.service';

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

  public pieChartData: number[] = [3, 5, 1, 1, 0];
  // tslint:disable-next-line:no-inferrable-types
  public pieChartType: string = 'pie';

  dialogRef: MatDialogRef<DialogPassComponent>;
  displayedColumns: string[] = ['position', 'name'];
  report_id: string;
  report_info = '';
  decryptedReportData: any;
  decryptedReportDataChanged: any;
  subscription: Subscription;

  ELEMENT_DATA = [
    {severity: 'Critical', count: 1},
    {severity: 'High', count: 1},
    {severity: 'Medium', count: 1},
    {severity: 'Low', count: 1},
    {severity: 'Info', count: 1}

  ];

  displayedSeverityColumns: string[] = ['severity', 'count'];
  dataSourceforseverity = this.ELEMENT_DATA;


  // tslint:disable-next-line:max-line-length
  constructor(private route: ActivatedRoute, public dialog: MatDialog, private indexeddbService: IndexeddbService, public router: Router, private messageService: MessageService) {
    console.log(route);
    this.subscription = this.messageService.getDecrypted().subscribe(message => {
      this.decryptedReportData = message;
      this.decryptedReportDataChanged = this.decryptedReportData;
    });

  }

  ngOnInit() {
    this.report_id = this.route.snapshot.params['report_id'];
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
  addissue() {
    this.indexeddbService.addIssue();
  }

  saveReportChanges() {
    console.log(this.decryptedReportDataChanged);
  }
  // tslint:disable-next-line:use-life-cycle-interface
  ngAfterViewInit(): void {

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

  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.subscription.unsubscribe();
}

}

