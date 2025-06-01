import { Component, OnInit, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon'
import { MatCardModule } from '@angular/material/card';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { HttpClient } from '@angular/common/http';
import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';

@Component({
  selector: 'app-bb-list',
  standalone: false,
  //imports: [],
  //imports: [MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule, MatTableModule, MatPaginatorModule],
  templateUrl: './bb-list.component.html',
  styleUrl: './bb-list.component.scss'
})
export class BbListComponent implements OnInit  {


  ELEMENT_DATA:any = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns: string[] = ['name', 'bounty', 'domains'];
  dataSource = new MatTableDataSource(this.ELEMENT_DATA);

  constructor(private http: HttpClient) {
  }

  ngOnInit() {

    this.http.get<any>('/assets/chaos-bugbounty-list.json?v=' + + new Date()).subscribe(res => {
      if (res) {

        if(res['programs']) {
          this.dataSource = new MatTableDataSource(res['programs']);
          this.dataSource.paginator = this.paginator;
        }
        
      }
    });

  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
