import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import * as Crypto from 'crypto-js';
import { UntypedFormControl } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CurrentdateService } from '../currentdate.service';

@Component({
  selector: 'app-dialog-asvs4',
  templateUrl: './dialog-asvs4.component.html',
  styleUrls: ['./dialog-asvs4.component.scss']
})
export class DialogAsvs4Component implements OnInit {
  selected = 'unsel';
  hide = true;
  text = '';
  selecteditems = [];
  allitems = [];
  unselected = [];
  pass = new UntypedFormControl();
  pass2 = new UntypedFormControl();
  constructor(public dialogRef: MatDialogRef<DialogAsvs4Component>, @Inject(MAT_DIALOG_DATA) public data: any, public datePipe: DatePipe,
  private currentdateService: CurrentdateService) {

  }

  ngOnInit() {
    
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
          title: 'ASVS requirement ' + res.Shortcode,
          poc: '',
          files: [],
          desc: res.Description,
          severity: 'Info',
          ref: 'https://owasp.org/www-pdf-archive/OWASP_Application_Security_Verification_Standard_4.0-en.pdf\nhttps://cwe.mitre.org/data/definitions/'+res.CWE[0]+'.html',
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
        element.setAttribute('download', 'Vulnrepo asvs4 export.vuln');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);


      this.dialogRef.close();
    }




  }

  
}
