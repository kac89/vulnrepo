import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import * as Crypto from 'crypto-js';

@Component({
  selector: 'app-dialog-exportissues',
  templateUrl: './dialog-exportissues.component.html',
  styleUrls: ['./dialog-exportissues.component.scss']
})
export class DialogExportissuesComponent implements OnInit {
  isReturn = [];
  fields: any;
  issues: any;
  curlhide = false;
  splitfilereport = false;
  multipartcurl = false;
  multicurlcmd = '';
  curlcmd = '';
  hide = true;
  fields_prop = `
  "project": {
    "key": "$key"
  },
  "summary": "$title",
  "description": "$desc \\n\\n POC: \\n $poc \\n\\n  Reference: \\n $ref",
  "issuetype": {
    "name": "Bug"
  },
  "priority": {
    "id": "$severity"
  },
  "labels": [
    "$label"
  ]`;

  constructor(public dialogRef: MatDialogRef<DialogExportissuesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

    ngOnInit() {

      if (this.data.sel) {
        this.data.sel.forEach((item, index) => {
          if (item === true) {
            this.isReturn.push(this.data.orig[index]);
          }
      });
      } else {
          this.isReturn = this.data;
      }

    }

  cancel(): void {
    this.dialogRef.close();
  }

  jiraCloudExport(jira_c_url, jira_c_key, jira_c_email, jira_c_label, workflow, splitcount) {
    this.hide = true;
    this.curlhide = false;

    function sevret(text) {
      let ret = 0;

      if (text === 'Critical') {
        ret = 1;
      }
      if (text === 'High') {
        ret = 2;
      }

      if (text === 'Medium') {
        ret = 3;
      }

      if (text === 'Low') {
        ret = 4;
      }

      if (text === 'Info') {
        ret = 5;
      }

      return ret;
    }

    function dataownload(datajson, filename) {
      const element = document.createElement('a');
      element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(datajson));
      element.setAttribute('download', 'data' + String(filename) + '.json');
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }

    if (this.isReturn.length > 0) {
      this.data = this.isReturn;
    }

    const myClonedArray = Object.assign([], this.data);

    if (this.splitfilereport === true) {

      this.curlhide = false;
      this.multipartcurl = false;
      let fname = 0;
      while (myClonedArray.length > 0) {

        const chunk = myClonedArray.splice(0, splitcount);
        this.issues = '';

        chunk.forEach((item, index) => {
          let myStr = workflow;
          let des = item.desc.toString().replace(/(\\)/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
          if (des.length > 4000) {
            des = des.substring(0, 4000);
            des = des + '[TRUNCATE]';
          }
          // tslint:disable-next-line:max-line-length
          let po = item.poc.toString().replace(/(\\)/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
          if (po.length > 4000) {
            po = po.substring(0, 4000);
            po = po + '[TRUNCATE]';
          }

          myStr = myStr
            .replace('$key', jira_c_key)
            .replace('$title', item.title.toString())
            .replace('$desc', des)
            .replace('$poc', po)
            .replace('$ref', item.ref.toString().replace(/\n/g, '\\n'))
            .replace('$severity', sevret(item.severity))
            .replace('$label', jira_c_label);

          this.fields = `"fields": {
          ` + myStr + `
          }`;
          let sep = '';
          if (chunk.length > 1) {
            sep = ',';
          }

          this.issues = this.issues + `{
        "update": {},
        ` + this.fields + `
        }` + sep;

        });

        if (this.issues.slice(-1) === ',') {
          this.issues = this.issues.slice(0, -1);
        }

        const datajson = `{
        "issueUpdates": [
          ` + this.issues + `
        ]
      }`;

    this.multicurlcmd = `ls data*[0-9].json | while read file
do
curl -D- -u ` + jira_c_email + ` -X POST -d "@$file" -H "Content-Type: application/json" ` + jira_c_url + `/rest/api/2/issue/bulk
done`;

        dataownload(datajson, fname);
        this.multipartcurl = true;
        fname = fname + 1;

      }


    } else {

    this.multipartcurl = false;
    this.curlhide = false;
    this.issues = '';
    if (this.isReturn.length > 0) {
      this.data = this.isReturn;
    }

    this.data.forEach((item, index) => {

      let myStr = workflow;

      let des = item.desc.toString().replace(/(\\)/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      if (des.length > 4000) {
        des = des.substring(0, 4000);
        des = des + '[TRUNCATE]';
      }

      let po = item.poc.toString().replace(/(\\)/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      if (po.length > 4000) {
        po = po.substring(0, 4000);
        po = po + '[TRUNCATE]';
      }

      myStr = myStr
        .replace('$key', jira_c_key)
        .replace('$title', item.title.toString())
        .replace('$desc', des)
        .replace('$poc', po)
        .replace('$ref', item.ref.toString().replace(/\n/g, '\\n'))
        .replace('$severity', sevret(item.severity))
        .replace('$label', jira_c_label);

      this.fields = `"fields": {
      ` + myStr + `
      }`;
      let sep = '';
      if (this.data.length > 1) {
        sep = ',';
      }

      this.issues = this.issues + `{
    "update": {},
    ` + this.fields + `
    }` + sep;

    });

    if (this.issues.slice(-1) === ',') {
      this.issues = this.issues.slice(0, -1);
    }

    const datajson = `{
    "issueUpdates": [
      ` + this.issues + `
    ]
  }`;

this.curlcmd = `
curl \
-D- \
-u ` + jira_c_email + ` \
-X POST \
-d "@data.json" \
-H "Content-Type: application/json" \
` + jira_c_url + `/rest/api/2/issue/bulk`;

    dataownload(datajson, '');
    this.curlhide = true;
  }
  }


  vulnrepojsonexport(pass, pass2) {

    if (pass === pass2) {


      if (this.isReturn.length > 0) {
        this.data = this.isReturn;
      }

      const json = JSON.stringify(this.data);
      // Encrypt
      const ciphertext = Crypto.AES.encrypt(json, pass);

      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(ciphertext));
      element.setAttribute('download', 'Vulnrepo issues export.vuln');
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }


  }

  splitfile(event) {
    if (event.checked === false) {
      this.splitfilereport = false;
    }
    if (event.checked === true) {
      this.splitfilereport = true;
    }
  }


}
