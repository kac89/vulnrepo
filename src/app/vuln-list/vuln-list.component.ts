import {Component, OnInit, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import { Http } from '@angular/http';
import { MatSort } from '@angular/material/sort';
import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';

@Component({
  selector: 'app-vuln-list',
  templateUrl: './vuln-list.component.html',
  styleUrls: ['./vuln-list.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      )
    ])
  ]
})
export class VulnListComponent implements OnInit {

  displayedColumns: string[] = ['title', 'severity', 'cvss', 'cve'];
  dataSource = new MatTableDataSource<VulnsList[]>();
  getvulnlistStatus = '';
  countvulns = [];
  expandedElement: VulnsList | null;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private http: Http) { }

  ngOnInit() {
    this.getvulnlistStatus = 'Loading...';
    this.http.get('/assets/vulns.json?v=' + + new Date()).subscribe(res => {

      this.dataSource = new MatTableDataSource<VulnsList[]>(res.json());
      this.countvulns = res.json();
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
      this.getvulnlistStatus = '';

    });

  }

}

export interface VulnsList {
  title: string;
  poc: string;
  desc: string;
  severity: string;
  ref: string;
  cvss: number;
  cve: string;
  expanded?: boolean;
}
