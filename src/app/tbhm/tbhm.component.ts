import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormsModule, ReactiveFormsModule} from '@angular/forms';

@Component({
  selector: 'app-tbhm',
  templateUrl: './tbhm.component.html',
  styleUrls: ['./tbhm.component.scss']
})
export class TbhmComponent implements OnInit {

  
  allreq:any;
  allreqstored:any;
  selecteditems = [];
  groupdef = {
    r1: false,
    r2: false,
    r3: false,
    r4: false,
    r5: false,
    r6: false,
    r7: false,
    r8: false,
    r9: false,
    r10: false,
    r11: false,
    r12: false,
    r13: false,
    r14: false,
    r15: false,
    r16: false,
    r17: false,
    r18: false,
    r19: false,
    r20: false,
    r21: false,
    r22: false,
    r23: false,
    r24: false,
    r25: false,
    r26: false,
    r27: false,
    r28: false,
    r29: false,
    r30: false,
    r31: false,
    r32: false,
    r33: false,
    r34: false,
    r35: false,
    r36: false,
    r37: false,
    r38: false,
    r39: false,
    r40: false,
    r41: false,
    r42: false,
    r43: false,
    r44: false,
    r45: false,
    r46: false,
    r47: false,
    r48: false,
    r49: false,
    r50: false,
    r51: false,
    r52: false,
    r53: false,
    r54: false,
    r55: false,
    r56: false,
    r57: false,
    r58: false,
    r59: false,
    r60: false,
    r61: false,
    r62: false,
    r63: false,
    r64: false,
    r65: false,
    r66: false,
    r67: false,
    r68: false,
    r69: false,
    r70: false,
    r71: false,
    r72: false,
    r73: false,
    r74: false,
  };

  constructor(private _formBuilder: FormBuilder) {}

  ngOnInit() {

    this.allreqstored = JSON.parse(localStorage.getItem("tbhm"));

    if(this.allreqstored === undefined || this.allreqstored === null){
      this.allreq = this._formBuilder.group(this.groupdef);
      
    } else {
      this.allreq = this._formBuilder.group(this.allreqstored);
      this.selecteditems = Object.keys(this.allreq.value).filter(key => this.allreq.value[key]);
    }

    this.allreq.valueChanges.subscribe(value => {
      //console.log(value);
      //console.log(this.allreq.value);

      this.selecteditems = Object.keys(this.allreq.value).filter(key => this.allreq.value[key]);

      localStorage.setItem("tbhm", JSON.stringify(value));
    });

  }

  resetselected(){
    if (window.confirm("Do you really want to clear results?")) {
      
      localStorage.removeItem("tbhm");
      this.allreq = this._formBuilder.group(this.groupdef);
      this.selecteditems = Object.keys(this.allreq.value).filter(key => this.allreq.value[key]);

      this.allreq.valueChanges.subscribe(value => {
        this.selecteditems = Object.keys(this.allreq.value).filter(key => this.allreq.value[key]);
        localStorage.setItem("tbhm", JSON.stringify(value));
      });
    }
  }

}
