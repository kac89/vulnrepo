import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import * as Crypto from 'crypto-js';
import { UntypedFormControl } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CurrentdateService } from '../currentdate.service';

@Component({
  selector: 'app-dialog-pcidss4',
  templateUrl: './dialog-pcidss4.component.html',
  styleUrls: ['./dialog-pcidss4.component.scss']
})
export class DialogPcidss4Component {
  selected = 'unsel';
  hide = true;
  text = '';
  selecteditems = [];
  allitems = [];
  unselected = [];
  pass = new UntypedFormControl();
  pass2 = new UntypedFormControl();


  constructor(public dialogRef: MatDialogRef<DialogPcidss4Component>, @Inject(MAT_DIALOG_DATA) public data: any, public datePipe: DatePipe,
  private currentdateService: CurrentdateService) {

  }

  ngOnInit() {
    console.log(this.data);


    this.selecteditems = this.data[1];
    this.allitems = this.data[0];

    this.unselected = this.allitems.filter(x => !this.selecteditems.includes(x));
  }

  cancel(): void {
    this.dialogRef.close();
  }

  exportitems(): void {

    if (this.selected === 'checked') {

      // export checked
      this.exportvuln(this.selecteditems, this.pass.value, this.pass2.value);

    } else if (this.selected === 'unsel') {

      // export unselected
      this.exportvuln(this.unselected, this.pass.value, this.pass2.value);

    }
    
  }

  exportvuln(data, pass, pass2) {

    if (pass !== pass2) {
      this.text = 'Password fields not match';
    } else {
  
      const toexport = data.map((res, key) => {
        const def = {
          title: 'PCI DSS v4.0 requirement ' + res.id,
          poc: '',
          files: [],
          desc: res.description.replaceAll('<br>', "\n"),
          severity: 'Info',
          ref: 'https://www.pcisecuritystandards.org/document_library/',
          cvss: '',
          cvss_vector: '',
          cve: '',
          tags: [],
          bounty: [],
          date: this.currentdateService.getcurrentDate()
        };
  
        return def;
      });
  
        const json = JSON.stringify(toexport);
        // Encrypt
        const ciphertext = Crypto.AES.encrypt(json, pass);
  
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(ciphertext));
        element.setAttribute('download', 'Vulnrepo PCI DSS v4.0 export.vuln');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);


      this.dialogRef.close();
    }




  }

}
