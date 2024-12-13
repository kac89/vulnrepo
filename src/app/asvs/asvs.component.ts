import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogAsvs4Component } from '../dialog-asvs4/dialog-asvs4.component';

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
    standalone: false
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
dialogRef: MatDialogRef<DialogAsvs4Component>;

constructor(private http: HttpClient, public dialog: MatDialog){
  this.selection.changed.subscribe(
    (s)=>{
          //console.log(s);
          if (this.selection.selected.length > 0) {
            localStorage.setItem("asvs4", JSON.stringify(this.selection.selected));
          } else {
            localStorage.removeItem("asvs4");
          }
 
     }); 
  
}

replacespace(text) {
  return text.replaceAll(" ", "-");
}

openasvs4dialog(): void {

  const dialogRef = this.dialog.open(DialogAsvs4Component, {
    width: '400px',
    disableClose: false,
    data: [this.parsefunct(this.asvsdata), this.selection.selected]
  });

  dialogRef.afterClosed().subscribe(result => {
    //console.log(result);
    console.log('The ASVS4 dialog was closed');
  });

}

onChangeSelect(){
  let out = [];

  this.dataSource.data = this.asvsdata;
  if (this.selectlevel === 'All') {
    out = this.dataSource.data;
    if (out.length > 0) {
      this.dataSource.data = out;
    }
  } else if (this.selectlevel === 'L1') {
    out = this.dataSource.data.filter((item) => {
      if (item.L1.Required === true) {
        return item;
      }
    });
    if (out.length > 0) {
      this.dataSource.data = out;
    }
  } else if (this.selectlevel === 'L2') {
    out = this.dataSource.data.filter((item) => {
      if (item.L2.Required === true) {
        return item;
      }
    });
    if (out.length > 0) {
      this.dataSource.data = out;
    }
  } else if (this.selectlevel === 'L3') {
    out = this.dataSource.data.filter((item) => {
      if (item.L3.Required === true) {
        return item;
      }
    });
    if (out.length > 0) {
      this.dataSource.data = out;
    }
  } 

  if (out.length === 0) {
    this.dataSource.data = this.asvsdata;
  }
  if (out.length > 0) {
    this.dataSource.data = out;
  }

}

parsefunct(arr){
  let out:any;

  if (this.selectlevel === 'L1') {
    out = arr.filter((item) => {
      if (item.L1.Required === true) {
        return item;
      }
    });
  } else if (this.selectlevel === 'L2') {
    out = arr.filter((item) => {
      if (item.L2.Required === true) {
        return item;
      }
    });
  } else if (this.selectlevel === 'L3') {
    out = arr.filter((item) => {
      if (item.L3.Required === true) {
        return item;
      }
    });
  } else if (this.selectlevel === 'All') {
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

  if (window.confirm("Do you really want to clear results?")) {
    this.selection.clear();
    localStorage.removeItem("asvs4");
  }
  


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
