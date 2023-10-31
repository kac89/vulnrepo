import { Component, OnInit } from '@angular/core';
import {MatTableDataSource} from '@angular/material/table';
import {SelectionModel} from '@angular/cdk/collections';
import { HttpClient } from '@angular/common/http';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogPcidss4Component } from '../dialog-pcidss4/dialog-pcidss4.component';

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
  localstoragepcidss4 = JSON.parse(localStorage.getItem("pcidss4"));
  pcidss:any;
  renderedData:any;
  dialogRef: MatDialogRef<DialogPcidss4Component>;
  selectsaqmodel = [
    { value: 'All', viewValue: '--- Show all ---', extendedinfo: '' },
    { value: 'SAQ A', viewValue: 'SAQ A - Card-not-present merchants (e-commerce or mail/telephone order)', extendedinfo: 'This self-assessment questionnaire is not applicable for face-to-face channels and is to be completed by merchants who deal with ‘card not present’ transactions i.e. e-Commerce, mail or telephone order. If your organization has outsourced all cardholder functions to PCI DSS compliant third-party service providers and does not electronically store, process or transmit cardholder data on your systems or premises, this SAQ is the right one for you. (Not applicable for Face to Face channels)' },
    { value: 'SAQ A-EP', viewValue: 'SAQ A-EP - e-Commerce merchants', extendedinfo: 'The ‘A-EP’ selfassessment questionnaire is similar to SAQ A but refers to merchants who outsource all payment processing to PCI DSS validated third parties, and who have a website(s) that doesn’t directly receive cardholder data but that can impact the security of the payment transaction. (Applicable to only e-Commerce channels) ' },
    { value: 'SAQ B', viewValue: 'SAQ B - Brick and mortar or mail/telephone order merchants', extendedinfo: 'This self-assessment questionnaire is applicable to merchants who use only; imprint machines and/or standalone, dial-out terminals and have no electronic cardholder data transmission, processing and storage. (Not applicable to e-Commerce channels)' },
    { value: 'SAQ B-IP', viewValue: 'SAQ B-IP - Brick and mortar or mail/telephone order merchants', extendedinfo: 'The B-IP self-assessment questionnaire is applicable to all merchants who only utilise standalone, PTS-approved payment terminals with an IP connection to the payment processor, with no electronic cardholder data storage. This questionnaire covers terminals that are network-based whereas SAQ B is for terminals that transmit data through dial-up. (Not applicable to e-Commerce channels)' },
    { value: 'SAQ C', viewValue: 'SAQ C - Brick and mortar or mail/telephone order merchants', extendedinfo: 'For merchants with payment application systems connected to the Internet, and who don’t store any cardholder data electronically. (Not applicable to e-Commerce channels)' },
    { value: 'SAQ C-VT', viewValue: 'SAQ C-VT - Brick and mortar or mail/telephone order merchants', extendedinfo: 'This self-assessment questionnaire is designed for merchants who manually enter a single transaction at a time via a keyboard into an Internet-based virtual terminal solution that is provided and hosted by a PCI DSS validated third-party service provider. These merchants also do not store any cardholder data. (Not applicable to e-Commerce channels) ' },
    { value: 'SAQ P2PE', viewValue: 'SAQ P2PE - Brick and mortar or mail/telephone order merchants', extendedinfo: 'This self-assessment questionnaire is dedicated for merchants who use approved point-to-point encryption (P2PE) devices, with no electronic card data storage. P2PE stands for point-to-point encryption, which uses specially-approved devices to capture and encrypt cardholder data before that data ever enters a merchants computer network. (Not applicable to e-Commerce channels)' },
    { value: 'SAQ D (Merchants)', viewValue: 'SAQ D - Merchants', extendedinfo: 'This is a self-assessment questionnaire for merchants who are not described in the above types of SAQs.' },
    { value: 'SAQ D (Service providers)', viewValue: 'SAQ D - Service providers', extendedinfo: 'All service providers defined by a payment brand as eligible to complete a SAQ.' }
  ];

  selectlevelmodel = [
    { value: 'All', viewValue: '--- Show all ---', extendedinfo: '' },
    { value: '1', viewValue: '1 - Do not store sensitive authentication data and limit cardholder data retention.', extendedinfo: 'This milestone targets a key area of risk for entities that have been compromised. Remember – if sensitive authentication data and other account data are not stored, the effects of a compromise will be greatly reduced. If you don’t need it, don’t store it.' },
    { value: '2', viewValue: '2 - Protect systems and networks and be prepared to respond to a system breach.', extendedinfo: 'This milestone targets controls for points of access to most compromises and the response processes.' },
    { value: '3', viewValue: '3 - Secure payment applications.', extendedinfo: 'This milestone targets controls for applications, application processes, and application servers. Weaknesses in these areas are easy prey for compromising systems and obtaining access to cardholder data.' },
    { value: '4', viewValue: '4 - Monitor and control access to your systems.', extendedinfo: 'Controls for this milestone allow you to detect the who, what, when, and how concerning access to your network and cardholder data environment.' },
    { value: '5', viewValue: '5 - Protect stored cardholder data.', extendedinfo: 'For those organizations that have analyzed their business processes and determined that they must store Primary Account Numbers, this milestone targets key protection mechanisms for the stored data.' },
    { value: '6', viewValue: '6 - Complete remaining compliance efforts, and ensure all controls are in place.', extendedinfo: 'This milestone completes PCI DSS requirements and finishes all remaining related policies, procedures, and processes needed to protect the cardholder data environment.' }
  ];

  constructor(private http: HttpClient, public dialog: MatDialog){
    this.selection.changed.subscribe(
      (s)=>{
            //console.log(s);
            if (this.selection.selected.length > 0) {
              localStorage.setItem("pcidss4", JSON.stringify(this.selection.selected));
            } else {
              localStorage.removeItem("pcidss4");
            }
   
       }); 
  }

  resetselected(){
    if (window.confirm("Do you really want to clear results?")) {
      this.selection.clear();
      localStorage.removeItem("pcidss4");
    }
  }

  getselectchip(chip, selectsaq){
    if (chip === selectsaq) {
      return true;
    } else {
      return false;
    }
  }


  colorchip(chip, selectsaq){
    if (chip === selectsaq) {
      return 'accent';
    } else {
      return 'info';
    }
  }

  openpcidss4dialog(): void {

    const dialogRef = this.dialog.open(DialogPcidss4Component, {
      width: '400px',
      disableClose: false,
      data: [this.parsefunct(this.pcidssdata), this.selection.selected]
    });
  
    dialogRef.afterClosed().subscribe(result => {
      //console.log(result);
      console.log('The ASVS4 dialog was closed');
    });
  
  }

  getextendedinfo(level){
    let out:any;
    let xx:any;
    xx = '';
    out =  this.selectlevelmodel.filter((item) => {
      if (Number(item.value) === Number(level)) {
        return item;
      }
    });
    if(out[0]){
      xx = out[0].extendedinfo;
    }
    return xx
  }

  getextendedinfosaq(level){
    let out:any;
    let xx:any;
    xx = '';
    out =  this.selectsaqmodel.filter((item) => {
      if (item.value === level) {
        return item;
      }
    });
    if(out[0]){
      xx = out[0].extendedinfo;
    }
    return xx
  }

  selectRows() {
    this.renderedData.forEach(row => {
      if (this.localstoragepcidss4 !== null) {
        this.localstoragepcidss4.forEach((item) => {
          if(item.id === row.id){
            this.selection.select(row);
            return;
           }
        });
      }
    });
  }

  parsefunct(arr){

    let out:any;
    out = arr;

    if (this.selectsaq !== 'All' && this.selectlevel !== 'All') {
      out = arr.filter((item) => {
        if (item.milestone === Number(this.selectlevel) && item.saq.some(x => x === this.selectsaq)) {
          return item;
        }
      });
    } else if (this.selectlevel !== 'All') {
      out = arr.filter((item) => {
        if (item.milestone === Number(this.selectlevel)) {
          return item;
        }
      });
    } else if (this.selectsaq !== 'All') {
      out = arr.filter((item) => {
        if (item.saq.some(x => x === this.selectsaq)) {
          return item;
        }
      });
    }

    return out
  }

  onChangeSelect(){
    let out = [];
    this.selection.clear();
    this.dataSource.data = this.pcidssdata;
    if (this.selectsaq !== 'All' && this.selectlevel !== 'All') {
      out = this.dataSource.data.filter((item) => {
        if (item.milestone === Number(this.selectlevel) && item.saq.some(x => x === this.selectsaq)) {
          return item;
        }
      });
      if (out.length > 0) {
        this.dataSource.data = out;
      }
    } else if (this.selectlevel !== 'All') {
      out = this.dataSource.data.filter((item) => {
        if (item.milestone === Number(this.selectlevel)) {
          return item;
        }
      });
      if (out.length > 0) {
        this.dataSource.data = out;
      }
    } else if (this.selectsaq !== 'All') {
      out = this.dataSource.data.filter((item) => {
        if (item.saq.some(x => x === this.selectsaq)) {
          return item;
        }
      });
      if (out.length > 0) {
        this.dataSource.data = out;
      }
    } 

    if (out.length === 0) {
      this.dataSource.data = this.pcidssdata;
    }
    if (out.length > 0) {
      this.dataSource.data = out;
    }

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
    this.dataSource.connect().subscribe(d => this.renderedData = d);
    this.http.get<any>('/assets/pcidssv4.json?v=' + + new Date()).subscribe(res => {
      this.pcidss = res;

      for (let item of this.pcidss.items) {
        for (let subitem of item.subitems) {
          this.pcidssdata = this.pcidssdata.concat(subitem.litems); 
        }   
      }   

      this.dataSource.data = this.pcidssdata;

      this.selectRows();
    });



  }
}
