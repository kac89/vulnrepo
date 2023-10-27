import { Component, OnInit } from '@angular/core';
import {MatTableDataSource} from '@angular/material/table';
import {SelectionModel} from '@angular/cdk/collections';
import { HttpClient } from '@angular/common/http';

export interface pcidssElement {
  id: string;
  description: string;
  milestone: number;
  saq: string[];
}

@Component({
  selector: 'app-pcidss4',
  templateUrl: './pcidss4.component.html',
  styleUrls: ['./pcidss4.component.scss']
})
export class Pcidss4Component implements OnInit {
  selectlevel: string;
  selectsaq: string;
  displayedColumns: string[] = ['select', 'id', 'description', 'milestone', 'saq'];
  dataSource = new MatTableDataSource<pcidssElement>();
  selection = new SelectionModel<pcidssElement>(true, []);
  pcidssdata = [];
  pcidss:any;
  selectsaqmodel = [
    { value: 'All', viewValue: '--- Show all ---' },
    { value: 'SAQ A', viewValue: 'SAQ A - Card-not-present merchants (e-commerce or mail/telephone order)' },
    { value: 'SAQ A-EP', viewValue: 'SAQ A-EP - e-Commerce merchants' },
    { value: 'SAQ B', viewValue: 'SAQ B - Brick and mortar or mail/telephone order merchants' },
    { value: 'SAQ B-IP', viewValue: 'SAQ B-IP - Brick and mortar or mail/telephone order merchants' },
    { value: 'SAQ C', viewValue: 'SAQ C - Brick and mortar or mail/telephone order merchants' },
    { value: 'SAQ C-VT', viewValue: 'SAQ C-VT - Brick and mortar or mail/telephone order merchants' },
    { value: 'SAQ P2PE', viewValue: 'SAQ P2PE - Brick and mortar or mail/telephone order merchants' },
    { value: 'SAQ D (Merchants)', viewValue: 'SAQ D - Merchants' },
    { value: 'SAQ D (Service providers)', viewValue: 'SAQ D - Service providers' }
  ];

  constructor(private http: HttpClient){}

  resetselected(){
    if (window.confirm("Do you really want to clear results?")) {
      this.selection.clear();
    }
  }

  parsefunct(arr){

    let out:any;
    out = arr
    if (this.selectlevel !== 'All') {
      out = arr.filter((item) => {
        if (item.milestone === Number(this.selectlevel)) {
          return item;
        }
      });
    }

    if (this.selectsaq !== 'All') {
      out = arr.filter((item) => {
        if (item.saq.some(x => x === this.selectsaq)) {
          return item;
        }
      });
    }

    if (this.selectsaq !== 'All' && this.selectlevel !== 'All') {
      out = arr.filter((item) => {
        if (item.milestone === Number(this.selectlevel) && item.saq.some(x => x === this.selectsaq)) {
          return item;
        }
      });
    }
    

    return out
  }
  parseSAQ(item){
    return item.join("<br>");
  }

  isAllSelectedGv(name) {

    name = name + '.';
    const regex = new RegExp('^'+name+'*');
    const filterbyname = this.dataSource.data.filter((item) => {
      if (regex.test(item.id)) {
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
    const regex = new RegExp('^'+name+'*');

    const filterbynameselected = this.selection.selected.filter((item) => {
      if (regex.test(item.id)) {
        return item;
      }
    });
  
    if (filterbynameselected.length > 0) {
      return true;
    } else {
      return false;
    }  
  }

  getcolors(id) {

    if(id === 1){
      return "#FF0039";
    } else if (id === 2) {
      return "#FF7518";
    } else if (id === 3) {
      return "#F9EE06";
    } else if (id === 4) {
      return "#3FB618";
    } else if (id === 5) {
      return "#2780E3";
    } else if (id === 6) {
      return "#a2c6f0";
    }

  }

  toggleSpecificGroup(name) {

    name = name + '.';
    const regex = new RegExp('^'+name+'*');
    
    const filterbyname = this.dataSource.data.filter((item) => {
      
      if (regex.test(item.id)) {
        return item;
      }
    });
  
    const filterbynameselected = this.selection.selected.filter((item) => {
      if (regex.test(item.id)) {
        return item;
      }
    });
  
    if (filterbynameselected.length === filterbyname.length) {
      this.selection.deselect(...filterbyname);
      return;
    }
  
    this.selection.select(...filterbyname);
  }

  ngOnInit() {
    this.selectlevel = 'All';
    this.selectsaq = 'All';

    this.http.get<any>('/assets/pcidssv4.json?v=' + + new Date()).subscribe(res => {
      this.pcidss = res;

      for (let item of this.pcidss.items) {
        for (let subitem of item.subitems) {
          this.pcidssdata = this.pcidssdata.concat(subitem.litems); 
        }   
      }   

      this.dataSource.data = this.pcidssdata;
    });



  }
}
