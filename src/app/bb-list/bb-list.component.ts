import { Component, OnInit, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon'
import { MatCardModule } from '@angular/material/card';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-bb-list',
  imports: [MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule, MatTableModule],
  templateUrl: './bb-list.component.html',
  styleUrl: './bb-list.component.scss'
})
export class BbListComponent implements OnInit {


  ELEMENT_DATA:any = [];

  displayedColumns: string[] = ['name', 'bounty', 'domains'];
  dataSource = new MatTableDataSource(this.ELEMENT_DATA);

  constructor(private http: HttpClient) {
  }

  ngOnInit() {

    this.http.get<any>('/assets/chaos-bugbounty-list.json?v=' + + new Date()).subscribe(res => {
      if (res) {

        if(res['programs']) {
          this.dataSource = new MatTableDataSource(res['programs']);
        }
        
      }
    });

  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
