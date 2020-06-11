import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { IndexeddbService } from '../indexeddb.service';
import { DialogEditComponent } from '../dialog-edit/dialog-edit.component';
import {SelectionModel} from '@angular/cdk/collections';

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
  reportlist: string[];
  displayedColumns: string[] = ['select', 'report_name', 'report_createdate', 'report_lastupdate', 'settings'];
  dataSource = new MatTableDataSource([]);
  selection = new SelectionModel<MyReportElement>(true, []);
  list: any;
  @ViewChild(MatSort, { static: false }) sort: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;

  constructor(public dialog: MatDialog, private indexeddbService: IndexeddbService) {

  }

  ngOnInit() {
    this.getallreports();
  }

  getallreports() {
    this.indexeddbService.getReports().then(data => {
      this.dataSource = new MatTableDataSource(data);
      this.list = data;
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
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
        this.indexeddbService.deleteReport(item).then(data => {
          if (data) {
            this.getallreports();
          }
        });
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


        this.selection.selected.forEach( (item) => {

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
                }
              });
            }

          });


      });


      }

    }
}
