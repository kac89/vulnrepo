import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { IndexeddbService } from '../indexeddb.service';
import { DialogEditComponent } from '../dialog-edit/dialog-edit.component';
import { SelectionModel } from '@angular/cdk/collections';
import { v4 as uuid } from 'uuid';
import { DialogApikeyComponent } from '../dialog-apikey/dialog-apikey.component';
import { ApiService } from '../api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionstorageserviceService } from "../sessionstorageservice.service"

export interface MyReportElement {
  select: any;
  position: number;
  report_name: string;
  report_id: string;
  report_createdate: number;
  encrypted_data: string;
  report_lastupdate: number;
}

@Component({
  selector: 'app-myreports',
  templateUrl: './myreports.component.html',
  styleUrls: ['./myreports.component.scss']
})
export class MyreportsComponent implements OnInit {
  dialogRef: MatDialogRef<DialogEditComponent>;
  displayedColumns: string[] = ['select', 'source', 'report_name', 'report_createdate', 'report_lastupdate', 'settings'];
  dataSource = new MatTableDataSource([]);
  selection = new SelectionModel<MyReportElement>(true, []);
  msg = '';
  keyfound = false;
  apilist = [];
  list = [];
  private paginator: MatPaginator;
  private sort: MatSort;

  @ViewChild(MatSort) set matSort(ms: MatSort) {
    this.sort = ms;
    this.setDataSourceAttributes();
  }

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
    this.setDataSourceAttributes();
  }

  setDataSourceAttributes() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  constructor(public dialog: MatDialog, private indexeddbService: IndexeddbService, private apiService: ApiService,
    private snackBar: MatSnackBar, public sessionsub: SessionstorageserviceService) {

  }

  ngOnInit() {
    this.getallreports();
  }

  getallreports() {
    this.list = [];
    this.indexeddbService.getReports().then(data => {
      if (data) {
        this.list.push(...data);
        this.dataSource.data = this.list;
        this.dataSource.sort = this.sort;
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

      vaultobj.forEach( (element) => {

        this.apilist.push({value: element.value, apikey: element.apikey, viewValue: element.viewValue});
        this.apiService.APISend(element.value, element.apikey, 'getreportslist', '').then(resp => {

          if (resp.length > 0) {
            resp.forEach((ele) => {
              ele.api = 'remote';
              ele.apiurl = element.value;
              ele.apikey = element.apikey;
              ele.apiname = element.viewValue;
            });
            this.list.push(...resp);
          }

        }).then(() => {
          this.dataSource.data = this.list;
          this.dataSource.sort = this.sort;
          this.dataSource.paginator = this.paginator;
          this.msg = '';
        }).catch(() => {});


        setTimeout(() => {
          // console.log('hide progress timeout');
          this.msg = '';
        }, 10000);

    });


     

    } else {

      this.indexeddbService.retrieveAPIkey().then(ret => {
        if (ret) {

          if (this.sessionsub.getSessionStorageItem('hidedialog') !== 'true') {
            setTimeout(_ => this.openDialog(ret));
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

  shareReport(report_id) {
    this.indexeddbService.downloadEncryptedReport(report_id);
  }

  removeReport(item) {

    const remo = 'removereport';
    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '400px',
      data: [{ remo }, { item }],
    });

    dialogRef.afterClosed().subscribe(result => {

      if (result) {
        this.indexeddbService.deleteReport(result).then(data => {
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


  cloneReport(item) {

    item.report_name = 'Clone of ' + item.report_name;
    item.report_id = uuid();

    this.indexeddbService.cloneReportadd(item).then(data => {
      if (data) {
        this.getallreports();
      }
    });

  }

  fromAPIcloneReport(item) {

    item.report_name = 'Clone of ' + item.report_name;
    item.report_id = uuid();
    delete item.api;

    this.indexeddbService.cloneReportadd(item).then(data => {
      if (data) {
        this.getallreports();
      }
    });

  }

  toAPIcloneReport(item, apiurl, apikey) {

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
}
