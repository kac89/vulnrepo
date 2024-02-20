import { Component, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { DialogReportcssComponent } from '../dialog-reportcss/dialog-reportcss.component';
import { DialogCustomcontentComponent } from '../dialog-customcontent/dialog-customcontent.component';

@Component({
  selector: 'app-dialog-addreportprofile',
  templateUrl: './dialog-addreportprofile.component.html',
  styleUrls: ['./dialog-addreportprofile.component.scss']
})
export class DialogAddreportprofileComponent implements OnInit {

  profile_name = new UntypedFormControl();
  report_css = new UntypedFormControl();
  report_custom_content = new UntypedFormControl();
  logow = new UntypedFormControl();
  logoh = new UntypedFormControl();
  uploadlogoprev = '';
  advlogo = '';
  video_embed = new UntypedFormControl();
  remove_lastpage = new UntypedFormControl();
  remove_issueStatus = new UntypedFormControl();
  remove_issuecvss = new UntypedFormControl();
  remove_issuecve = new UntypedFormControl();
  remove_researcher = new UntypedFormControl();
  remove_changelog = new UntypedFormControl();
  remove_tags = new UntypedFormControl();
  report_parsing_desc = new UntypedFormControl();
  report_parsing_poc_markdown = new UntypedFormControl();
  report_remove_attach_name = new UntypedFormControl();
  ResName = new UntypedFormControl();
  ResEmail = new UntypedFormControl();
  ResSocial = new UntypedFormControl();
  ResWeb = new UntypedFormControl();
  origi = [];

  constructor(private http: HttpClient, public dialogRef: MatDialogRef<DialogAddreportprofileComponent>, @Inject(MAT_DIALOG_DATA) public data: any,
  public dialog: MatDialog) { }

  ngOnInit(): void {
    
    if(this.data) {
      if (this.data === 'open') {

        this.logow.setValue(600);
        this.logoh.setValue(500);
        this.video_embed.setValue(true);
        this.remove_lastpage.setValue(false);
        this.remove_issueStatus.setValue(false);
        this.remove_issuecvss.setValue(true);
        this.remove_issuecve.setValue(true);
        this.remove_researcher.setValue(false);
        this.remove_changelog.setValue(false);
        this.remove_tags.setValue(false);
        this.report_parsing_desc.setValue(false);
        this.report_parsing_poc_markdown.setValue(true);
        this.report_remove_attach_name.setValue(false);
        this.ResName.setValue('');
        this.ResEmail.setValue('');
        this.ResSocial.setValue('');
        this.ResWeb.setValue('');
        this.report_css.setValue('');
        this.report_custom_content.setValue('');
        
      } else {
  
        this.origi.push(this.data);
        this.profile_name.setValue(this.data.profile_name);
  
        this.uploadlogoprev = '<img src="' + this.data.logo + '" width="100px">';
        this.advlogo = this.data.logo;
  
        this.logow.setValue(this.data.logow);
        this.logoh.setValue(this.data.logoh);
        this.video_embed.setValue(this.data.video_embed);
        this.remove_lastpage.setValue(this.data.remove_lastpage);
        this.remove_issueStatus.setValue(this.data.remove_issueStatus);
        this.remove_issuecvss.setValue(this.data.remove_issuecvss);
        this.remove_issuecve.setValue(this.data.remove_issuecve);
        this.remove_researcher.setValue(this.data.remove_researcher);
        this.remove_changelog.setValue(this.data.remove_changelog);
        this.remove_tags.setValue(this.data.remove_tags);
        this.report_parsing_desc.setValue(this.data.report_parsing_desc);
        this.report_parsing_poc_markdown.setValue(this.data.report_parsing_poc_markdown);
        this.report_remove_attach_name.setValue(this.data.report_remove_attach_name);
        this.ResName.setValue(this.data.ResName);
        this.ResEmail.setValue(this.data.ResEmail);
        this.ResSocial.setValue(this.data.ResSocial);
        this.ResWeb.setValue(this.data.ResWeb);
        this.report_css.setValue(this.data.report_css);
        this.report_custom_content.setValue(this.data.report_custom_content);
      }
    }

  }

  cancel(): void {
    this.dialogRef.close();
  }

  importlogo(input: HTMLInputElement) {

    const files = input.files;
    if (files && files.length) {
      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        this.parselogo(fileReader.result);

      };
      fileReader.readAsBinaryString(fileToRead);
    }

  }

  parselogo(data) {
    const linkprev = 'data:image/png;base64,' + btoa(data);
    this.uploadlogoprev = '<img src="' + linkprev + '" width="100px">';
    this.advlogo = linkprev;
  }

  clearlogo() {
    this.uploadlogoprev = '';
    this.advlogo = '';
    console.log('Logo cleared!');
  }

  addNewProfile() {
    console.log('add new profile');
    this.dialogRef.close([
      {
        profile_name: this.profile_name.value,
        report_css: this.report_css.value,
        report_custom_content: this.report_custom_content.value,
        logo: this.advlogo,
        logow: this.logow.value,
        logoh: this.logoh.value,
        video_embed: this.video_embed.value,
        remove_lastpage: this.remove_lastpage.value,
        remove_issueStatus: this.remove_issueStatus.value,
        remove_issuecvss: this.remove_issuecvss.value,
        remove_issuecve: this.remove_issuecve.value,
        remove_researcher: this.remove_researcher.value,
        remove_changelog: this.remove_changelog.value,
        remove_tags: this.remove_tags.value,
        report_parsing_desc: this.report_parsing_desc.value,
        report_parsing_poc_markdown: this.report_parsing_poc_markdown.value,
        report_remove_attach_name: this.report_remove_attach_name.value,
        ResName: this.ResName.value,
        ResEmail: this.ResEmail.value,
        ResSocial: this.ResSocial.value,
        ResWeb: this.ResWeb.value
      }
    ]);
  }

  saveNewProfile() {
    console.log('add new profile');
    this.dialogRef.close({
        profile_name: this.profile_name.value,
        report_css: this.report_css.value,
        report_custom_content: this.report_custom_content.value,
        logo: this.advlogo,
        logow: this.logow.value,
        logoh: this.logoh.value,
        video_embed: this.video_embed.value,
        remove_lastpage: this.remove_lastpage.value,
        remove_issueStatus: this.remove_issueStatus.value,
        remove_issuecvss: this.remove_issuecvss.value,
        remove_issuecve: this.remove_issuecve.value,
        remove_researcher: this.remove_researcher.value,
        remove_changelog: this.remove_changelog.value,
        remove_tags: this.remove_tags.value,
        report_parsing_desc: this.report_parsing_desc.value,
        report_parsing_poc_markdown: this.report_parsing_poc_markdown.value,
        report_remove_attach_name: this.report_remove_attach_name.value,
        ResName: this.ResName.value,
        ResEmail: this.ResEmail.value,
        ResSocial: this.ResSocial.value,
        ResWeb: this.ResWeb.value,
        original: this.origi
      });
  }
  
  OpenDialogCSS(): void {

    const dialogRef = this.dialog.open(DialogReportcssComponent, {
      width: '600px',
      disableClose: true,
      data: this.report_css.value
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Report Custom CSS dialog was closed');
      if (result || result === "") {
        this.report_css.setValue(result);
      }

    });

  }

  OpenDialogCustomContent(): void {

    const dialogRef = this.dialog.open(DialogCustomcontentComponent, {
      width: '600px',
      disableClose: true,
      data: this.report_custom_content.value
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Report Custom CSS dialog was closed');
      if (result || result === "") {
        this.report_custom_content.setValue(result);
      }

    });

  }

}
