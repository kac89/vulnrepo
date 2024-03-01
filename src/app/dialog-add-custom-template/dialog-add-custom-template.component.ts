import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { UtilsService } from '../utils.service';
import { UntypedFormControl } from '@angular/forms';
import { IndexeddbService } from '../indexeddb.service';
import { DialogCvssComponent } from '../dialog-cvss/dialog-cvss.component';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';

export interface Tags {
  name: string;
}

@Component({
  selector: 'app-dialog-add-custom-template',
  standalone: false,
  templateUrl: './dialog-add-custom-template.component.html',
  styleUrl: './dialog-add-custom-template.component.scss'
})
export class DialogAddCustomTemplateComponent implements OnInit {

  tablecon:any;
  templatename = new UntypedFormControl();
  description = new UntypedFormControl();
  references = new UntypedFormControl();
  severity = new UntypedFormControl();
  cvss = new UntypedFormControl();
  cvss_vector = new UntypedFormControl();
  cve = new UntypedFormControl();
  tags = [];
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  visible = true;
  selectable = true;
  removable = true;
  addOnBlur = true;

  constructor(public dialogRef: MatDialogRef<DialogAddCustomTemplateComponent>, private utilsService: UtilsService, private indexeddbService: IndexeddbService,
    @Inject(MAT_DIALOG_DATA) public data: any, public dialog: MatDialog){}

  ngOnInit() {

   this.tablecon = this.utilsService.severitytable;

    if(this.data[0]){
      this.templatename.setValue(this.data[0].title);
      this.description.setValue(this.data[0].desc);
      this.references.setValue(this.data[0].ref);
      this.severity.setValue(this.data[0].severity);
      this.cvss.setValue(this.data[0].cvss);
      this.cvss_vector.setValue(this.data[0].cvss_vector);
      this.cve.setValue(this.data[0].cve);
      this.tags = this.data[0].tags || [];
    }

  };

  savelocally(): void {

    const templatename = this.templatename.value || '';
    const description = this.description.value || '';
    const severity = this.severity.value || '';
    const references = this.references.value || '';
    const cvss = this.cvss.value || '';
    const cvss_vector = this.cvss_vector.value || '';
    const cve = this.cve.value || '';

    this.dialogRef.close({"title": templatename,"poc": "","desc": description,"severity": severity,"ref": references,"cvss": cvss,"cvss_vector": cvss_vector,"cve": cve, "tags": this.tags});
  }

  edit(item): void {

    const templatename = this.templatename.value || '';
    const description = this.description.value || '';
    const severity = this.severity.value || '';
    const references = this.references.value || '';
    const cvss = this.cvss.value || '';
    const cvss_vector = this.cvss_vector.value || '';
    const cve = this.cve.value || '';

    this.dialogRef.close([{"title": templatename,"poc": "","desc": description,"severity": severity,"ref": references,"cvss": cvss,"cvss_vector": cvss_vector,"cve": cve, "tags": this.tags},{"original": item}]);
  }


  addtomaster(): void {
    const templatename = this.templatename.value || '';
    const description = this.description.value || '';
    const severity = this.severity.value || '';
    const references = this.references.value || '';
    const cvss = this.cvss.value || '';
    const cvss_vector = this.cvss_vector.value || '';
    const cve = this.cve.value || '';

    const title = "[add-custom-template] "+templatename;
    const body = `Hi,
Please add template:
    
    
\`\`\`
{
  "title": "`+templatename.replaceAll("`", "'")+`",
  "poc": "",
  "desc": "`+description.replaceAll("`", "'")+`",
  "severity": "`+severity+`",
  "ref": "`+encodeURI(references).replaceAll("%0A", "\\n")+`",
  "cvss": "`+cvss+`",
  "cvss_vector": "`+cvss_vector+`",
  "cve": "`+cve+`"
}
\`\`\`

to \`/assets/vulns.json\`.

    `;
    window.open("https://github.com/kac89/vulnrepo/issues/new?title="+encodeURI(title)+"&body="+encodeURI(body)+"&labels=add-custom-template", '_blank').focus();
  }

  cancel(): void {
    this.dialogRef.close();
  }

  openDialogCVSS(): void {

    const dialogRef = this.dialog.open(DialogCvssComponent, {
      width: '700px',
      disableClose: false,
      data: []
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The CVSS dialog was closed');
      if(result) {
        this.severity.setValue(result.severity);
        this.cvss.setValue(result.cvss);
        this.cvss_vector.setValue(result.cvss_vector);
      }
    });

  }

  TAGadd(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.tags.push({ name: value });
    }
    // Reset the input value
    if (event.input) {
      event.input.value = '';
    }
  }

  TAGremove(tag: Tags): void {

    const ind: number = this.tags.indexOf(tag);
    if (ind !== -1) {
      this.tags.splice(ind, 1);
    }
  }

}
