import { Component, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-dialog-addreportprofile',
  templateUrl: './dialog-addreportprofile.component.html',
  styleUrls: ['./dialog-addreportprofile.component.scss']
})
export class DialogAddreportprofileComponent implements OnInit {

  profile_name = new FormControl();
  profile_theme = new FormControl();
  logow = new FormControl();
  logoh = new FormControl();
  uploadlogoprev = '';
  advlogo = '';
  video_embed = new FormControl();
  remove_lastpage = new FormControl();
  remove_issueStatus = new FormControl();
  remove_researcher = new FormControl();
  remove_changelog = new FormControl();
  remove_tags = new FormControl();
  ResName = new FormControl();
  ResEmail = new FormControl();
  ResSocial = new FormControl();
  ResWeb = new FormControl();
  origi = [];

  constructor(public dialogRef: MatDialogRef<DialogAddreportprofileComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit(): void {

    if (this.data === 'open') {
      this.logow.setValue(600);
      this.logoh.setValue(500);
      this.video_embed.setValue(true);
      this.profile_theme.setValue('white');
      this.remove_lastpage.setValue(false);
      this.remove_issueStatus.setValue(false);
      this.remove_researcher.setValue(false);
      this.remove_changelog.setValue(false);
      this.remove_tags.setValue(false);
      this.ResName.setValue('');
      this.ResEmail.setValue('');
      this.ResSocial.setValue('');
      this.ResWeb.setValue('');
    } else {

      this.origi.push(this.data);
      this.profile_name.setValue(this.data.profile_name);

      this.uploadlogoprev = '<img src="' + this.data.logo + '" width="100px">';
      this.advlogo = this.data.logo;

      this.logow.setValue(this.data.logow);
      this.logoh.setValue(this.data.logoh);
      this.video_embed.setValue(this.data.video_embed);
      this.profile_theme.setValue(this.data.theme);
      this.remove_lastpage.setValue(this.data.remove_lastpage);
      this.remove_issueStatus.setValue(this.data.remove_issueStatus);
      this.remove_researcher.setValue(this.data.remove_researcher);
      this.remove_changelog.setValue(this.data.remove_changelog);
      this.remove_tags.setValue(this.data.remove_tags);
      this.ResName.setValue(this.data.ResName);
      this.ResEmail.setValue(this.data.ResEmail);
      this.ResSocial.setValue(this.data.ResSocial);
      this.ResWeb.setValue(this.data.ResWeb);
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
        logo: this.advlogo,
        logow: this.logow.value,
        logoh: this.logoh.value,
        theme: this.profile_theme.value,
        video_embed: this.video_embed.value,
        remove_lastpage: this.remove_lastpage.value,
        remove_issueStatus: this.remove_issueStatus.value,
        remove_researcher: this.remove_researcher.value,
        remove_changelog: this.remove_changelog.value,
        remove_tags: this.remove_tags.value,
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
        logo: this.advlogo,
        logow: this.logow.value,
        logoh: this.logoh.value,
        theme: this.profile_theme.value,
        video_embed: this.video_embed.value,
        remove_lastpage: this.remove_lastpage.value,
        remove_issueStatus: this.remove_issueStatus.value,
        remove_researcher: this.remove_researcher.value,
        remove_changelog: this.remove_changelog.value,
        remove_tags: this.remove_tags.value,
        ResName: this.ResName.value,
        ResEmail: this.ResEmail.value,
        ResSocial: this.ResSocial.value,
        ResWeb: this.ResWeb.value,
        original: this.origi
      });
  }

}
