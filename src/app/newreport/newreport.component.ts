import { Component, OnInit } from '@angular/core';
import { IndexeddbService } from '../indexeddb.service';
import { SeckeyValidatorService } from '../seckey-validator.service';
import { ThemePalette } from '@angular/material/core';
import { ProgressBarMode } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import { DialogApikeyComponent } from '../dialog-apikey/dialog-apikey.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { UntypedFormControl } from '@angular/forms';
import { SessionstorageserviceService } from "../sessionstorageservice.service"
import { UtilsService } from '../utils.service';

@Component({
  selector: 'app-newreport',
  templateUrl: './newreport.component.html',
  styleUrls: ['./newreport.component.scss']
})
export class NewreportComponent implements OnInit {
  dialogRef: MatDialogRef<DialogApikeyComponent>;
  hide = true;
  localkeys = [];
  color: ThemePalette = 'warn';
  mode: ProgressBarMode = 'buffer';
  selectEDAPI = [];
  selectEDAPI_apikey = '';
  selectEDAPI_apiurl = '';
  value = 20;
  keyfound = false;
  msg = '';
  bufferValue = 20;
  str = '';
  selected = 'local';
  selected_profile = '';
  titlenewreport = new UntypedFormControl();
  pass1model = new UntypedFormControl();
  pass2model = new UntypedFormControl();
  selected_profilefin = '';
  ReportProfilesList = [];
  apiReports = [];
  profileSettingsselected: any;
  apireportprofiles = [];
  apireportprofilesList = [];
  constructor(private indexeddbService: IndexeddbService, private passwordService: SeckeyValidatorService, private apiService: ApiService, public dialog: MatDialog,  
    public router: Router, public sessionsub: SessionstorageserviceService,private utilsService: UtilsService) {

    // get report profiles
    this.indexeddbService.retrieveReportProfile().then(ret => {
      if (ret) {
        this.ReportProfilesList = ret;

        if(this.ReportProfilesList.length === 1) {

          this.selected_profilefin = this.ReportProfilesList[0].profile_name;
          this.profileSettingsselected = this.ReportProfilesList[0];
          this.selected_profile = this.ReportProfilesList[0];
        }
        
        this.getAllreportprofilesfromapi();

      }
    });

  }

  ngOnInit() {

    const localkey = this.sessionsub.getSessionStorageItem('VULNREPO-API');
    if (localkey) {
      this.localkeys = JSON.parse(localkey);
    }

  }

  getAllreportprofilesfromapi() {
  
    const localkey = this.sessionsub.getSessionStorageItem('VULNREPO-API');
    if (localkey) {
      this.msg = 'API connection please wait...';

      this.keyfound = true;
      const vaultobj = JSON.parse(localkey);

      vaultobj.forEach( (element) => {

        this.apiService.APISend(element.value, element.apikey, 'getreportprofiles', '').then(resp => {

          if (resp.length > 0) {

            resp.forEach((ele) => {
              ele.api = 'remote';
              ele.apiurl = element.value;
              ele.apikey = element.apikey;
              ele.apiname = element.viewValue;
            });

            this.apireportprofilesList.push(...resp);
          }

        }).then(() => {

          this.ReportProfilesList = [...this.ReportProfilesList, ...this.apireportprofilesList];
          
          this.msg = '';
        }).catch(() => {});


        setTimeout(() => {
          // console.log('hide progress timeout');
          this.msg = '';
        }, 10000);

      });


    } else {

      this.indexeddbService.retrieveAPIkey().then(ret => {
        
        if (ret) {

          if (this.sessionsub.getSessionStorageItem('hidedialog') !== 'true') {
            setTimeout(_ => this.openDialog(ret));
          }

        }
      });

    }
  }

  generatePassword() {
    const pass = this.utilsService.generatePassword(64);
    // set gen pass
    this.pass1model.setValue(pass);
    this.pass2model.setValue(pass);
    this.passCheck(pass);
    this.hide = false;
  }

  openDialog(data: any): void {

    const dialogRef = this.dialog.open(DialogApikeyComponent, {
      width: '400px',
      disableClose: true,
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The security key dialog was closed');
      if (result) {
        this.sessionsub.setSessionStorageItem('VULNREPO-API', result);
        
        const localkey = this.sessionsub.getSessionStorageItem('VULNREPO-API');
        if (localkey) {
          this.localkeys = JSON.parse(localkey);
        }

        this.getAllreportprofilesfromapi();

      }

    });

  }

  passCheck(pass) {

    switch (this.passwordService.checkPasswordStrength(pass)) {
      case 0:
        this.str = 'Too short';
        this.color = 'warn';
        this.value = 20;
        this.bufferValue = 20;
        break;
      case 1:
        this.str = 'Common';
        this.color = 'warn';
        this.value = 40;
        this.bufferValue = 40;
        break;
      case 2:
        this.str = 'Weak';
        this.color = 'primary';
        this.value = 60;
        this.bufferValue = 60;
        break;
      case 3:
        this.str = 'It\'s OK';
        this.color = 'accent';
        this.value = 80;
        this.bufferValue = 80;
        break;
      case 4:
        this.color = 'accent';
        this.str = 'Strong';
        this.value = 100;
        this.bufferValue = 100;
        break;
    }

  }


  addnewReport(title: string, pass: string, pass2: string) {

    if (title.length >= 1) {

      // tslint:disable-next-line:max-line-length
      if ((pass.length >= 8) && (pass2.length >= 8) && (this.passwordService.checkPasswordStrength(pass) >= 2) && (this.passwordService.checkPasswordStrength(pass2) >= 2)) {

        if (pass === pass2) {
          if (this.selected === 'local') {
            this.indexeddbService.addnewReport(title, pass, this.profileSettingsselected);
          } else {
            this.indexeddbService.addnewReportonAPI(this.selectEDAPI_apiurl, this.selectEDAPI_apikey, title, pass, this.profileSettingsselected);
          }
        } else {
          this.pass1model.setErrors({'passnotmatch': true});
          this.pass2model.setErrors({'passnotmatch': true});
        }

      } else {
        this.pass1model.setErrors({'tooweakpass': true});
        this.pass2model.setErrors({'tooweakpass': true});
      }

    } else {
      this.titlenewreport.setErrors({'notempty': true});
    }

  }

  selectchange(event) {
    this.selectEDAPI = [];
    if (event.value === 'local') {
      console.log('Local');
      this.selectEDAPI_apikey = '';
      this.selectEDAPI_apiurl = '';
    } else {
        this.selectEDAPI_apikey = event.value.apikey;
        this.selectEDAPI_apiurl = event.value.value;
    }

  }

  selectchangeProfiles(event) {
    if (event.value) {
      this.selected_profilefin = event.value.profile_name;
      this.profileSettingsselected = event.value;
    }

  }

}
