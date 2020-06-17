import {Component, OnInit, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import { Http } from '@angular/http';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-vuln-list',
  templateUrl: './vuln-list.component.html',
  styleUrls: ['./vuln-list.component.scss']
})
export class VulnListComponent implements OnInit {

  displayedColumns: string[] = ['title', 'severity', 'cvss', 'cve'];
  dataSource = new MatTableDataSource();
  getvulnlistStatus = '';
  countvulns = [];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private http: Http) { }

  ngOnInit() {
    this.getvulnlistStatus = 'Loading...';
    this.http.get('/assets/vulns.json?v=' + + new Date()).subscribe(res => {

      this.dataSource = new MatTableDataSource(res.json());
      this.countvulns = res.json();
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
      this.getvulnlistStatus = '';

    });

  }

}
