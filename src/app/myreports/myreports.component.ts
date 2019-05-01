import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSort, MatTableDataSource, MatPaginator } from '@angular/material';
import { IndexeddbService } from '../indexeddb.service';

export interface MyReportElement {
  report_name: string;
  report_id: string;
  report_createdate: number;
  encrypted_data: string;
}

@Component({
  selector: 'app-myreports',
  templateUrl: './myreports.component.html',
  styleUrls: ['./myreports.component.scss']
})
export class MyreportsComponent implements OnInit {

  reportlist: string[];
  displayedColumns: string[] = ['report_name', 'report_createdate', 'settings'];
  dataSource = new MatTableDataSource();
  list: any;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(private indexeddbService: IndexeddbService) {

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
  removeReport(element: any) {
    this.indexeddbService.deleteReport(element).then(data => {
        if (data) {
          this.getallreports();
        }
    });
  }


}
