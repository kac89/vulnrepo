import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UntypedFormControl } from '@angular/forms';

@Component({
  selector: 'app-dialog-customcontent',
  templateUrl: './dialog-customcontent.component.html',
  styleUrls: ['./dialog-customcontent.component.scss']
})
export class DialogCustomcontentComponent implements OnInit {

  report_custom_content = new UntypedFormControl();

  constructor(public dialogRef: MatDialogRef<DialogCustomcontentComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit(): void {
    this.report_custom_content.setValue(this.data.report_settings.report_html);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  savechange() {
    this.dialogRef.close(this.report_custom_content.value);
  }
}
