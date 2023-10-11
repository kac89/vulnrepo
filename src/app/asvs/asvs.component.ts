import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import {SelectionModel} from '@angular/cdk/collections';


export interface PeriodicElement {
  Shortcode: string;
  Description: string;
  L1: any;
  L2: any;
  L3: any;
  CWE: any;
}

@Component({
  selector: 'app-asvs',
  templateUrl: './asvs.component.html',
  styleUrls: ['./asvs.component.scss'],
})
export class AsvsComponent implements OnInit {

displayedColumns: string[] = ['select', 'Shortcode', 'Description', 'L1', 'L2', 'L3', 'CWE'];
dataSource = new MatTableDataSource<PeriodicElement>();
selection = new SelectionModel<PeriodicElement>(true, []);
asvs:any;
asvsdata = [];
selectlevel: string;
param:any;
renderedData:any;
localstorageasvs4 = JSON.parse(localStorage.getItem("asvs4"));

constructor(private http: HttpClient){
  this.selection.changed.subscribe(
    (s)=>{
          //console.log(s);
          if (this.selection.selected.length > 0) {
            localStorage.setItem("asvs4", JSON.stringify(this.selection.selected));
          }
 
     }); 
  
}

replacespace(text) {
  return text.replaceAll(" ", "-");
}

parsefunct(arr){
  let out:any;

  if (this.selectlevel === 'L1') {
    out = arr.filter((item) => {
      if (item.L1.Required === true) {
        return item;
      }
    });
  }

  if (this.selectlevel === 'L2') {
    out = arr.filter((item) => {
      if (item.L2.Required === true) {
        return item;
      }
    });
  }
  
  if (this.selectlevel === 'L3') {
    out = arr.filter((item) => {
      if (item.L3.Required === true) {
        return item;
      }
    });
  }

  if (this.selectlevel === 'All') {
    out = arr;
  }

  return out
}

isAllSelectedGv(name) {

  name = name + '.';

  const filterbyname = this.dataSource.data.filter((item) => {
    if (item.Shortcode.includes(name)) {
      return item;
    }
  });

  const numSelected = this.selection.selected.length;
  const numRows = filterbyname.length;
  return numSelected === numRows;
}

isAllSelectedGroup(items) {

  const numSelected = this.selection.selected.length;
  const numRows = items.length;
  return numSelected === numRows;
}

checkedfn(name){

  name = name + '.';

  const filterbynameselected = this.selection.selected.filter((item) => {
    if (item.Shortcode.includes(name)) {
      return item;
    }
  });

  if (filterbynameselected.length > 0) {
    return true;
  } else {
    return false;
  }  
}

toggleSpecificGroup(name) {

  name = name + '.';

  const filterbyname = this.dataSource.data.filter((item) => {
    if (item.Shortcode.includes(name)) {
      return item;
    }
  });

  const filterbynameselected = this.selection.selected.filter((item) => {
    if (item.Shortcode.includes(name)) {
      return item;
    }
  });

  if (filterbynameselected.length === filterbyname.length) {
    this.selection.deselect(...filterbyname);
    return;
  }

  this.selection.select(...filterbyname);
}

selectRows() {
  this.renderedData.forEach(row => {
    if (this.localstorageasvs4 !== null) {
      this.localstorageasvs4.forEach((item) => {
        if(item.Shortcode === row.Shortcode){
          this.selection.select(row);
          return;
         }
      });
    }
  });
}

resetselected() {

  this.selection.clear();
  localStorage.removeItem("asvs4");
}

  ngOnInit() {
    this.selectlevel = 'All';
    this.dataSource.connect().subscribe(d => this.renderedData = d);
    this.http.get<any>('/assets/OWASP Application Security Verification Standard 4.0.3-en.json?v=' + + new Date()).subscribe(res => {
      this.asvs = res;

      for (let item of this.asvs.Requirements) {
        for (let subitem of item.Items) {
          this.asvsdata = this.asvsdata.concat(subitem.Items); 
        }   
      }   

      this.dataSource.data = this.asvsdata;

      this.selectRows();
    });



  }




}
