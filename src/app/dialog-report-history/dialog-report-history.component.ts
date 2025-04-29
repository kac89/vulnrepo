import { AfterViewInit, Component, OnInit, Inject, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IndexeddbService } from '../indexeddb.service';
import { MatSort, Sort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-dialog-report-history',
  standalone: false,
  //imports: [],
  templateUrl: './dialog-report-history.component.html',
  styleUrl: './dialog-report-history.component.scss'
})
export class DialogReportHistoryComponent implements OnInit {

  displayedColumns: string[] = ['report_name', 'report_lastupdate', 'settings'];
  dataSource = new MatTableDataSource([]);
  anyreports = false;

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('paginator') paginator: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }


  // @ts-ignore
  constructor(public dialogRef: MatDialogRef<DialogReportcssComponent>, private indexeddbService: IndexeddbService, @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit(): void {

    this.getreports();

  }


  getreports(): void {
    this.indexeddbService.getReportsHistory(this.data).then(retdata => {
      if (retdata.length > 0) {
        this.anyreports = true;
        this.dataSource.data = retdata;
      } else {
        this.dataSource.data = [];
        this.anyreports = false;
      }
    });
  }

  downloadhistoryreport(report): void {

    const enc = btoa(JSON.stringify(report));
    const blob = new Blob([encodeURIComponent(enc)], { type: 'text/plain' });
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', report.report_name + ' ' + report.report_id + ' (vulnrepo.com).vulnr');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  }

  replacereport(report): void {

    this.indexeddbService.deleteReport(report, false).then(data => {
      this.indexeddbService.importReport(JSON.stringify(report));
      window.location.href = window.location.href;
    });

  }

  removereporthistory(report): void {

    this.indexeddbService.deletesingleReporthistory(report).then(data => {
      if (data) {
        this.getreports();
      }
    });

  }

}
