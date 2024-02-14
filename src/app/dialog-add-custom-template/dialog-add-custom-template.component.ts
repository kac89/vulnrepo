import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { UtilsService } from '../utils.service';
import { UntypedFormControl } from '@angular/forms';
import { IndexeddbService } from '../indexeddb.service';
import { DialogCvssComponent } from '../dialog-cvss/dialog-cvss.component';

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

  constructor(public dialogRef: MatDialogRef<DialogAddCustomTemplateComponent>, private utilsService: UtilsService, private indexeddbService: IndexeddbService,
    @Inject(MAT_DIALOG_DATA) public data: any, public dialog: MatDialog){

  }

  ngOnInit() {

   this.tablecon = this.utilsService.severitytable;

    if(this.data){
      this.templatename.setValue(this.data.title);
      this.description.setValue(this.data.desc);
      this.references.setValue(this.data.ref);
      this.severity.setValue(this.data.severity);
      this.cvss.setValue(this.data.cvss);
      this.cvss_vector.setValue(this.data.cvss_vector);
      this.cve.setValue(this.data.cve);
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


    this.indexeddbService.saveReportTemplateinDB({"title": templatename,"poc": "","desc": description,"severity": severity,"ref": references,"cvss": cvss,"cvss_vector": cvss_vector,"cve": cve}).then(ret => {
      if (ret) {
        console.log("custom template added");
      }
    });

    this.dialogRef.close();
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
      width: '800px',
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


}
