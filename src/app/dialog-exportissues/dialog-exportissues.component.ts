import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';


@Component({
  selector: 'app-dialog-exportissues',
  templateUrl: './dialog-exportissues.component.html',
  styleUrls: ['./dialog-exportissues.component.scss']
})
export class DialogExportissuesComponent implements OnInit {

  fields: any;
  issues: any;
  curlhide = false;
  curlcmd = '';

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

  }

  cancel(): void {
    this.dialogRef.close();
  }

  jiraCloudExport(jira_c_url, jira_c_key, jira_c_email, jira_c_label, workflow) {

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

    this.issues = '';
    this.data.forEach((item, index) => {

      let myStr = workflow;

      myStr = myStr
        .replace('$key', jira_c_key)
        .replace('$title', item.title)
        .replace('$desc', item.desc)
        .replace('$poc', item.poc.toString().replace(/\n/g, '\\n'))
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


    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(datajson));
    element.setAttribute('download', 'data.json');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

this.curlcmd = `
curl \
-D- \
-u ` + jira_c_email + ` \
-X POST \
-d "@data.json" \
-H "Content-Type: application/json" \
` + jira_c_url + `/rest/api/2/issue/bulk`;

    this.curlhide = true;

  }

}
