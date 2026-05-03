import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { IndexeddbService } from '../indexeddb.service';
import { DialogEditComponent } from '../dialog-edit/dialog-edit.component';
import { SelectionModel } from '@angular/cdk/collections';
import { v4 as uuid } from 'uuid';
import { DialogApikeyComponent } from '../dialog-apikey/dialog-apikey.component';
import { ApiService } from '../api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionstorageserviceService } from "../sessionstorageservice.service"
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

export interface ReportStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface MyReportElement {
  select: any;
  position: number;
  report_name: string;
  report_id: string;
  report_createdate: number;
  encrypted_data: string;
  report_lastupdate: number;
  report_stats?: ReportStats;
  api?: string;
  apiurl?: string;
  apikey?: string;
  apiname?: string;
}

@Component({
  standalone: false,
  selector: 'app-myreports',
  templateUrl: './myreports.component.html',
  styleUrls: ['./myreports.component.scss']
})
export class MyreportsComponent implements OnInit, OnDestroy {

  dataSource = new MatTableDataSource([]);
  selection = new SelectionModel<MyReportElement>(true, []);
  displayItems: MyReportElement[] = [];
  msg = '';
  keyfound = false;
  apilist: any = [];
  list: any = [];
  public dialogRef: MatDialogRef<DialogEditComponent> | undefined;
  private paginator: MatPaginator | undefined;
  private dataSubscription: Subscription | undefined;

  readonly sevOrder: (keyof ReportStats)[] = ['critical', 'high', 'medium', 'low', 'info'];
  viewMode: 'card' | 'list' = 'list';

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
    if (mp) {
      this.dataSource.paginator = mp;
    }
  }

  get totalFilteredCount(): number {
    return this.dataSource.filteredData.length;
  }

  constructor(public dialog: MatDialog, private indexeddbService: IndexeddbService, private apiService: ApiService,
    private snackBar: MatSnackBar, public sessionsub: SessionstorageserviceService, public router: Router) {

  }

  ngOnInit() {
    const saved = localStorage.getItem('VULNREPO-view-mode');
    if (saved === 'list' || saved === 'card') {
      this.viewMode = saved;
    }
    this.getallreports();
  }

  setViewMode(mode: 'card' | 'list') {
    this.viewMode = mode;
    localStorage.setItem('VULNREPO-view-mode', mode);
  }

  ngAfterViewInit() {
    this.dataSubscription = this.dataSource.connect().subscribe(data => {
      this.displayItems = data as MyReportElement[];
    });
  }

  ngOnDestroy() {
    this.dataSubscription?.unsubscribe();
    this.dataSource.disconnect();
  }

  getallreports() {
    this.list = [];
    this.indexeddbService.getReports().then(data => {
      if (data) {
        this.list.push(...data);
        this.list.sort((a: any, b: any) => (b.report_lastupdate || b.report_createdate) - (a.report_lastupdate || a.report_createdate));
        this.dataSource.data = this.list;
        this.dataSource.paginator = this.paginator;
      }
    });
    this.getAPIallreports();
  }

  getAPIallreports() {
    this.apilist = [];
    const localkey = this.sessionsub.getSessionStorageItem('VULNREPO-API');

    if (localkey) {
      this.msg = 'API connection please wait...';

      this.keyfound = true;
      const vaultobj = JSON.parse(localkey);
      let x = 0;
      vaultobj.forEach((element: any) => {
        x = x + 1;

        this.apilist.push({ value: element.value, apikey: element.apikey, viewValue: element.viewValue });

        this.apiService.APISend(element.value, element.apikey, 'getreportslist', '').then(resp => {

          if (resp.length > 0) {
            resp.forEach((ele: any) => {
              ele.api = 'remote';
              ele.apiurl = element.value;
              ele.apikey = element.apikey;
              ele.apiname = element.viewValue;
            });
            this.list.push(...resp);
          }

        }).then(() => {
          this.list.sort((a: any, b: any) => (b.report_lastupdate || b.report_createdate) - (a.report_lastupdate || a.report_createdate));
          this.dataSource.data = this.list;
          this.dataSource.paginator = this.paginator;
        }).catch(() => { });

        //progress bar on api reports
        if (vaultobj.length === x) {
          setTimeout(() => {
            // console.log('hide progress timeout');
            this.msg = '';
          }, 1000);
        }

      });




    } else {

      this.indexeddbService.retrieveAPIkey().then(ret => {
        if (ret) {

          if (this.sessionsub.getSessionStorageItem('hidedialog') !== 'true') {
            setTimeout((_: any) => this.openDialog(ret));
          }

        }
      });

    }
  }



  openDialog(data: any): void {

    const dialogRef = this.dialog.open(DialogApikeyComponent, {
      width: '400px',
      disableClose: true,
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The security key dialog was closed');
      if (result) {
        this.sessionsub.setSessionStorageItem('VULNREPO-API', result);
        this.getAPIallreports();
      }

    });

  }

  shareReport(report_id: any) {
    this.indexeddbService.downloadEncryptedReport(report_id);
  }

  removeReport(item: any) {

    const remo = 'removereport';
    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '420px',
      maxWidth: '95vw',
      panelClass: 'edit-dialog-panel',
      data: [{ remo }, { item }],
    });

    dialogRef.afterClosed().subscribe(result => {

      if (result) {
        this.indexeddbService.deleteReport(result, true).then(data => {
          if (data) {
            this.getallreports();
            this.selection.clear();
            this.sessionsub.removeSessionStorageItem(item.report_id);
          }
        });

        if (result.api && result.apiurl && result.apikey) {

          // tslint:disable-next-line:max-line-length
          this.apiService.APISend(result.apiurl, result.apikey, 'removereport', 'reportid=' + result.report_id).then(resp => {
            if (resp.REMOVE_REPORT === 'OK') {
              this.getallreports();
              this.selection.clear()
            }
          });


        }
      }

    });

  }


  cloneReport(item: any) {

    item.report_name = 'Clone of ' + item.report_name;
    item.report_id = uuid();

    this.indexeddbService.cloneReportadd(item).then(data => {
      if (data) {
        this.getallreports();
      }
    });

  }

  fromAPIcloneReport(item: any) {

    item.report_name = 'Clone of ' + item.report_name;
    item.report_id = uuid();
    delete item.api;

    this.indexeddbService.cloneReportadd(item).then(data => {
      if (data) {
        this.getallreports();
      }
    });

  }

  toAPIcloneReport(item: any, apiurl: string, apikey: string) {

    item.report_id = uuid();

    // tslint:disable-next-line:max-line-length
    this.apiService.APISend(apiurl, apikey, 'savereport', 'reportdata=' + btoa(JSON.stringify(item))).then(resp => {
      if (resp) {

        if (resp.STORAGE === 'NOSPACE') {
          this.snackBar.open('API ERROR: NO SPACE LEFT!', 'OK', {
            duration: 3000,
            panelClass: ['notify-snackbar-fail']
          });
        }

        this.getallreports();
      }
    });

  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.data.forEach(row => this.selection.select(row));
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: MyReportElement): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.position + 1}`;
  }

  removeSelecteditems() {
    if (this.selection.selected.length > 0) {
      this.selection.selected.forEach((item) => {
        this.removeReport(item);
      });
    }

  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  Redirectme(url: any) {
    this.router.navigate([url]);
  }

}
