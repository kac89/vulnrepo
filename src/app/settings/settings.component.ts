import { Component, OnInit, ViewChild  } from '@angular/core';
import { IndexeddbService } from '../indexeddb.service';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import { DialogApikeyComponent } from '../dialog-apikey/dialog-apikey.component';
import { DialogApiaddComponent } from '../dialog-apiadd/dialog-apiadd.component';
import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';
import {MatSort, MatSortModule} from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { DialogAddreportprofileComponent } from '../dialog-addreportprofile/dialog-addreportprofile.component';
import { SessionstorageserviceService } from "../sessionstorageservice.service"
import { CurrentdateService } from '../currentdate.service';
import { DialogAddCustomTemplateComponent } from '../dialog-add-custom-template/dialog-add-custom-template.component';

export interface ApiList {
  apikey: string;
  organisation: string;
  apiname: string;
  apiurl: string;
  status: string;
  created: string;
  expires: string;
  current_storage: number;
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})

export class SettingsComponent implements OnInit {

  @ViewChild('paginprofiles') paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  @ViewChild('pagintemplates') paginator2: MatPaginator;
  @ViewChild(MatSort) sort2: MatSort;

  color = 'accent';
  info = '';
  msg = '';
  listkey = false;
  checked = false;
  hide = true;
  remain: any;
  tryconnectdb = false;
  wipechecked = false;
  enableAPI = true;
  wipehide = false;
  showregapi = true;
  wipeall = false;
  apiconneted = false;
  user = '';
  today = new Date().toISOString().slice(0, 10);
  createdate: any;
  pro: any;
  expirydate: any;
  current_storage: any;
  max_storage: any;
  status = 'Not connected!';

  vaultList = [];
  reportProfileList = [];
  reportTemplateList = [];
  reportProfileList_int = [];

  ReportProfilesdisplayedColumns: string[] = ['source', 'profile_name', 'profile_settings'];
  ReportProfilesdataSource = new MatTableDataSource([]);

  ReportTemplatesdataSource = new MatTableDataSource([]);
  ReportTemplatesdisplayedColumns: string[] = ['source','template_name', 'template_settings'];

  vaultListdataSource = new MatTableDataSource([]);
  vaultListdisplayedColumns: string[] = ['vault_name', 'vault_settings'];

  displayedColumns: string[] = ['apiname', 'organisation', 'status', 'created', 'expires', 'storage', 'settings'];
  dataSource = new MatTableDataSource([]);


  constructor(public router: Router, private indexeddbService: IndexeddbService, private apiService: ApiService,
    public dialog: MatDialog, public sessionsub: SessionstorageserviceService, private currentdateService: CurrentdateService) { }


  ngOnInit() {

    //get report profiles from local at init
    this.indexeddbService.retrieveReportProfile().then(ret => {
      if (ret) {
        this.ReportProfilesdataSource = new MatTableDataSource(ret);
        this.reportProfileList = this.ReportProfilesdataSource.data;
        this.ReportProfilesdataSource.paginator = this.paginator;
        this.ReportProfilesdataSource.sort = this.sort;
      }
    });

    this.getTemplates();

    this.getVault();

  }
  
  foundvault(bool: boolean): boolean {

    this.listkey = bool;

    if(bool) {
      this.vaultListdataSource = new MatTableDataSource([{"vault_name": "Main Vault"}]);
      this.vaultList = this.vaultListdataSource.data;
    } else {
      this.vaultList = [];
      this.vaultListdataSource = new MatTableDataSource([]);
    }

    return bool
  }

  applyFilterTemplates(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.ReportTemplatesdataSource.filter = filterValue.trim().toLowerCase();
    if (this.ReportTemplatesdataSource.paginator) {
      this.ReportTemplatesdataSource.paginator.firstPage();
    }
  }

  applyFilterProfiles(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.ReportProfilesdataSource.filter = filterValue.trim().toLowerCase();
    if (this.ReportProfilesdataSource.paginator) {
      this.ReportProfilesdataSource.paginator.firstPage();
    }
  }

  getVault(): void {
    const localkey = this.sessionsub.getSessionStorageItem('VULNREPO-API');
    if (localkey) {

      console.log('Key found');
      this.apiconnect(localkey);
      this.foundvault(true);
      this.showregapi = false;



    } else {

      
      this.indexeddbService.retrieveAPIkey().then(ret => {
        if (ret) {
          this.tryconnectdb = true;
          this.foundvault(true);

          this.vaultListdataSource = new MatTableDataSource([{"vault_name": "Main Vault"}]);
          this.vaultList = this.vaultListdataSource.data;

          this.showregapi = false;
          
          if (this.sessionsub.getSessionStorageItem('hidedialog') !== 'true') {
            setTimeout(_ => this.openDialog(ret));
          }

        } else {
          this.showregapi = true;
        }
      });

    }
  }


getTemplates(): void {
  const arr = [];
  this.indexeddbService.retrieveReportTemplates().then(ret => {
    if (ret) {
      this.ReportTemplatesdataSource = new MatTableDataSource(ret);
      this.reportTemplateList = this.ReportTemplatesdataSource.data;
      this.ReportTemplatesdataSource.paginator = this.paginator2;
      this.ReportTemplatesdataSource.sort = this.sort2;
    }
  });
}

  wipeDatachanged() {

    if (this.wipechecked === true) {
      this.wipehide = true;
    }
    if (this.wipechecked === false) {
      this.wipehide = false;
    }

  }


  wipealldata() {
    indexedDB.deleteDatabase('vulnrepo-settings');
    indexedDB.deleteDatabase('vulnrepo-templates');
    indexedDB.deleteDatabase('vulnrepo-profiles');
    indexedDB.deleteDatabase('vulnrepo-api');
    indexedDB.deleteDatabase('vulnrepo-db');
    indexedDB.deleteDatabase('testindexeddb');
    window.location.href = window.location.protocol + '//' + window.location.host;
  }


  getdumps(){


    let pro, tem, rep, vau: any;

    Promise.all([
      this.indexeddbService.retrieveReportProfile().then(ret => {
        if (ret) {
          pro = ret;
        }
      }),
      this.indexeddbService.retrieveAPIkey().then(data => {
        if (data) {
          vau = data;
        }
      }),
      this.indexeddbService.retrieveReportTemplates().then(ret => {
        if (ret) {
          tem = ret;
        }
      }),
      this.indexeddbService.getReports().then(data => {
        if (data) {
          rep = data;
        }
      }),
    ]).then(values => {
      if (values) {

        // download dump
        const blob = new Blob([JSON.stringify({
          reports: rep,
          templates: tem,
          profiles: pro,
          vault: vau
        })], { type: 'text/plain' });
        const link = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'Dumped My Reports (vulnrepo.com).vulnrepo-backup');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      }
    });


  }

  dumpallmyreports() {
    this.getdumps();

  }

  parseMyBackupfile(array) {

    const parsed = JSON.parse(array);
    if(parsed.vault.length > 0 && parsed.vault !== undefined) {
        this.indexeddbService.saveKEYinDB(parsed.vault);
        this.foundvault(true);
        this.showregapi = true;
        this.tryconnectdb = true;
    }

    if(parsed.reports.length > 0) {
      for (let _i = 0; _i < parsed.reports.length; _i++) {
        const num = parsed.reports[_i];
        this.indexeddbService.importReportfromfileSettings(num);
      }
    }

    if(parsed.templates.length > 0) {
      for (let _i = 0; _i < parsed.templates.length; _i++) {
        const num = parsed.templates[_i];

        this.reportTemplateList = this.reportProfileList.concat(num);
        this.ReportTemplatesdataSource.data = this.reportTemplateList;
      
        for (let item of this.reportTemplateList) {
          this.indexeddbService.saveReportTemplateinDB(item);
        }     

      }
    }

    if(parsed.profiles.length > 0) {
      for (let _i = 0; _i < parsed.profiles.length; _i++) {
        const num = parsed.profiles[_i];
        this.reportProfileList = this.reportProfileList.concat(num);
        this.ReportProfilesdataSource.data = this.reportProfileList;
        this.indexeddbService.saveReportProfileinDB(this.reportProfileList).then(ret => {});
      }
    }
  }

  restoreMybackup(input: HTMLInputElement) {

    const files = input.files;
    if (files && files.length) {

      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
       this.parseMyBackupfile(fileReader.result);

      };
      fileReader.readAsText(fileToRead, 'UTF-8');
    }

  }

  gettimebetweendates(date11, date22) {
    let date1 = date11;
    let date2 = date22;
    date1 = date1.split('-');
    date2 = date2.split('-');
    date1 = new Date(date1[0], date1[1], date1[2]);
    date2 = new Date(date2[0], date2[1], date2[2]);
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(Math.abs((date1 - date2) / oneDay));
    return diffDays;
  }

  apiconnect(vault: string) {

    const elementlist: ApiList[] = [];
    const vaultobj = JSON.parse(vault);

    vaultobj.forEach( (element) => {

      if (element.apikey !== undefined && element.apikey !== '') {

        this.apiService.APISend(element.value, element.apikey, 'apiconnect', '').then(resp => {
            if (resp !== undefined && resp !== null && resp.AUTH === 'OK') {
              this.apiconneted = true;
              this.foundvault(false);
              this.createdate = resp.CREATEDATE;
              this.expirydate = resp.EXPIRYDATE;
              this.remain = this.gettimebetweendates(this.today, this.expirydate);
              this.user = resp.WELCOME;
              this.max_storage = resp.MAX_STORAGE;
              this.current_storage = resp.CURRENT_STORAGE;
              const stor = this.current_storage / this.max_storage * 100;

              // tslint:disable-next-line:max-line-length
              const elementdata = { apikey: element.apikey, apiname: element.viewValue, apiurl: element.value, organisation: this.user, status: 'Connected', created: resp.CREATEDATE, expires: resp.EXPIRYDATE + ' (' + this.remain + ' days left)', current_storage: stor };
              elementlist.push(elementdata);
              this.dataSource.data = elementlist;
              this.tryconnectdb = false;
            } else {

              if (resp === null) {
                // tslint:disable-next-line:max-line-length
                const elementdata = { apikey: element.apikey, apiname: element.viewValue, apiurl: element.value, organisation: '', status: 'Not connected: wrong API key?', created: '', expires: '', current_storage: 0 };
                elementlist.push(elementdata);
                this.dataSource.data = elementlist;
              } else {
                // tslint:disable-next-line:max-line-length
                const elementdata = { apikey: element.apikey, apiname: element.viewValue, apiurl: element.value, organisation: '', status: 'Not connected', created: '', expires: '', current_storage: 0 };
                elementlist.push(elementdata);
                this.dataSource.data = elementlist;
              }

            }

        }).catch(error => {
          console.log('API error: ', error);
        });
      }

  });


  this.sessionsub.setSessionStorageItem('VULNREPO-API', JSON.stringify(vaultobj));
  
  this.getReportProfiles();
  }

  removeapikey() {

    indexedDB.deleteDatabase('vulnrepo-api');
    this.showregapi = true;
    this.foundvault(false);
    this.apiconneted = false;
    this.tryconnectdb = false;
    this.status = 'Not connected!';
  }

  apidisconnect() {
    this.sessionsub.removeSessionStorageItem('VULNREPO-API');
    this.showregapi = false;
    this.foundvault(true);
    this.apiconneted = false;
    this.status = 'Not connected!';
    this.tryconnectdb = true;
    this.getReportProfiles();
  }

  tryconnect() {
    this.indexeddbService.retrieveAPIkey().then(ret => {
      if (ret) {
        this.foundvault(true);
        this.showregapi = false;
        this.tryconnectdb = true;
        setTimeout(_ => this.openDialog(ret));
      } else {
        this.showregapi = true;
      }
    });
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
        this.apiconnect(result);
        if (data) {
          this.indexeddbService.saveKEYinDB(data).then(ret => {});
        }
        this.tryconnectdb = false;
        this.showregapi = false;
      }

    });

  }

  openDialogAPIADD(): void {

    const dialogRef = this.dialog.open(DialogApiaddComponent, {
      width: '400px',
      disableClose: true,
      data: ''
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The security key dialog was closed');
      if (result === 'OK') {
        this.apiconneted = true;
        this.tryconnectdb = false;
        this.foundvault(false);
        this.showregapi = false;

        const localkey = this.sessionsub.getSessionStorageItem('VULNREPO-API');
        if (localkey) {
          this.apiconnect(localkey);
        }


      }

    });

  }

  openDialogAPIaddtovault(): void {

    const dialogRef = this.dialog.open(DialogApikeyComponent, {
      width: '400px',
      disableClose: true,
      data: 'addtovault'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {

        const dialogRef2 = this.dialog.open(DialogApiaddComponent, {
          width: '400px',
          disableClose: true,
          data: result
        });

        dialogRef2.afterClosed().subscribe(resul => {
          console.log('The security key dialog was closed');
          if (resul === 'OK') {
            const localkey = this.sessionsub.getSessionStorageItem('VULNREPO-API');
            if (localkey) {
              this.apiconnect(localkey);
            }
          }

        });

      }
    });

  }

  openDialogAPIremove(drem): any {

    const dialogRef = this.dialog.open(DialogApikeyComponent, {
      width: '400px',
      disableClose: true,
      data: 'addtovault'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
          this.sessionsub.setSessionStorageItem('VULNREPO-API', JSON.stringify(drem));
          this.saveAPIKEY(drem, result);
          this.apiconnect(JSON.stringify(drem));
      }
    });

  }

  exportvault() {

    this.indexeddbService.retrieveAPIkey().then(data => {
      if (data) {
        let today = '';
        if (navigator.language) {
           today = new Date(this.currentdateService.getcurrentDate()).toLocaleDateString(navigator.language);
        } else {
           today = String(Date.now());
        }
        
        
        // download dump
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json;charset=utf-8' });
        const link = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'VULNREPO Vault Dump ' + today + ' (vulnrepo.com).vulnrepo-vault');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } else {
        console.log('DB read error');
      }

    });

  }



  importvault(input: HTMLInputElement) {
    console.log('import vault');

    const files = input.files;
    if (files && files.length) {

      const fileToRead = files[0];
      const fileReader = new FileReader();

      fileReader.onload = (e) => {
        this.Processimportfile(fileReader.result);
      };

      fileReader.readAsText(fileToRead, 'UTF-8');
    }

  }

  Processimportfile(file) {
    file = file.replace(/^"(.*)"$/, '$1');
    this.openDialog(file);
  }

  removeApi(element) {

    const localkey = this.sessionsub.getSessionStorageItem('VULNREPO-API');
    if (localkey) {
      const result = JSON.parse(localkey);
      const index = result.map(function(e) { return e.apikey; }).indexOf(element);
      if (index !== -1) {
        this.openDialogAPIremove(result);
        result.splice(index, 1);
      }

    }

  }

  saveAPIKEY(key, pass) {

    this.indexeddbService.encryptKEY(JSON.stringify(key), pass).then(data => {
      if (data) {
        this.indexeddbService.saveKEYinDB(data).then(ret => {});
      }
    });

  }


getReportProfiles() {
  this.indexeddbService.retrieveReportProfile().then(ret => {
    if (ret) {
      this.ReportProfilesdataSource = new MatTableDataSource(ret);
      this.reportProfileList = this.ReportProfilesdataSource.data;
    }
    this.getAPIReportProfiles();
  });
}


getAPIReportProfiles() {

  const localkey = this.sessionsub.getSessionStorageItem('VULNREPO-API');
  if (localkey) {
    this.msg = 'API connection please wait...';

    const vaultobj = JSON.parse(localkey);

    vaultobj.forEach( (element) => {

      this.apiService.APISend(element.value, element.apikey, 'getreportprofiles', '').then(resp => {
        this.reportProfileList_int = [];
        if (resp.length > 0) {
          resp.forEach((ele) => {
            ele.api = 'remote';
            ele.apiurl = element.value;
            ele.apikey = element.apikey;
            ele.apiname = element.viewValue;
          });
          this.reportProfileList_int.push(...resp);
        }

      }).then(() => {

        this.ReportProfilesdataSource.data = [...this.reportProfileList, ...this.reportProfileList_int];
        //this.dataSource.sort = this.sort;
        //this.dataSource.paginator = this.paginator;
        this.msg = '';
      }).catch(() => {});


      setTimeout(() => {
        // console.log('hide progress timeout');
        this.msg = '';
      }, 10000);

  });

  }
}


  openDialogReportProfiles(data: any): void {

    const dialogRef = this.dialog.open(DialogAddreportprofileComponent, {
      width: '700px',
      //height: '600px',
      disableClose: true,
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Report Settings Profile dialog was closed');
      if (result) {
        this.reportProfileList = this.reportProfileList.concat(result);
        this.ReportProfilesdataSource.data = this.reportProfileList;
        this.indexeddbService.saveReportProfileinDB(result).then(ret => {});
        this.getReportProfiles();
      }

    });

  }


  openDialogReportTemplates(): void {

    const dialogRef = this.dialog.open(DialogAddCustomTemplateComponent, {
      width: '600px',
      disableClose: false,
      data: []
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The add custom template dialog was closed');

      if (result) {
        

        this.reportTemplateList = this.reportTemplateList.concat(result);
        this.ReportTemplatesdataSource.data = this.reportTemplateList;
        this.indexeddbService.saveReportTemplateinDB(result).then(ret => {
          if (ret) {
            console.log("custom template added");
          }
        });
    
      }

      this.getTemplates();
    });

  }

  removeTemplate(item: any): void {
    console.log(item);
    const index: number = this.reportTemplateList.indexOf(item);
    if (index !== -1) {

      this.reportTemplateList.splice(index, 1);
      this.ReportTemplatesdataSource.data = this.reportTemplateList;

      this.indexeddbService.deleteTemplate(item).then(ret => {
        this.getTemplates();
      });
      
    }

  }

  removeProfileItem(item: any): void {
    const index: number = this.reportProfileList.indexOf(item as never);

    if (index !== -1) {
      this.reportProfileList.splice(index, 1);
      this.ReportProfilesdataSource.data = this.reportProfileList;

      this.indexeddbService.deleteProfile(item).then(ret => {
        this.getReportProfiles();
      });
      
    }
  }

  editProfileItem(item: any): void {
    const dialogRef = this.dialog.open(DialogAddreportprofileComponent, {
      width: '700px',
      disableClose: true,
      data: item
    });


    dialogRef.afterClosed().subscribe(result => {
      console.log('Report Settings Profile dialog was closed');
      if (result) {

        const index: number = this.reportProfileList.indexOf(result.original[0]);
        if (index !== -1) {
          this.reportProfileList[index] = {
            profile_name: result.profile_name,
            logo: result.logo,
            logow: result.logow,
            logoh: result.logoh,
            theme: result.profile_theme,
            video_embed: result.video_embed,
            remove_lastpage: result.remove_lastpage,
            report_parsing_desc: result.report_parsing_desc,
            report_parsing_poc_markdown: result.report_parsing_poc_markdown,
            report_remove_attach_name: result.report_remove_attach_name,
            remove_issueStatus: result.remove_issueStatus,
            remove_issuecvss: result.remove_issuecvss,
            remove_issuecve: result.remove_issuecve,
            remove_researcher: result.remove_researcher,
            remove_changelog: result.remove_changelog,
            remove_tags: result.remove_tags,
            ResName: result.ResName,
            ResEmail: result.ResEmail,
            ResSocial: result.ResSocial,
            ResWeb: result.ResWeb,
            report_css: result.report_css,
            report_custom_content: result.report_custom_content
          };
          this.ReportProfilesdataSource.data = this.reportProfileList;
          this.indexeddbService.updateProfile(this.reportProfileList[index], result.original[0]._key).then(ret => {});
          this.getReportProfiles();
        }
      }

    });

  }

  exportprofiles(): void {

    this.indexeddbService.retrieveReportProfile().then(ret => {
      if (ret) {
        const blob = new Blob([JSON.stringify(ret)], { type: 'application/json' });
        const link = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'Backup Report Profiles (vulnrepo.com).vulnrepo-profiles');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });


  }

  importReportProfile(input: HTMLInputElement) {
    console.log('import profile');

    const files = input.files;
    if (files && files.length) {

      const fileToRead = files[0];
      const fileReader = new FileReader();

      fileReader.onload = (e) => {
        this.parseprofile(fileReader.result);
        
      };

      fileReader.readAsText(fileToRead, 'UTF-8');
    }

  }

parseprofile(profile){
  const parsed = JSON.parse(profile);

  if(Array.isArray(parsed)){
    parsed.forEach((item) => {
      this.indexeddbService.saveReportProfileinDB(item).then(ret => {});
    });
  } else {
    this.indexeddbService.saveReportProfileinDB(parsed).then(ret => {});
  }

  this.getReportProfiles();
}

downloadProfileItem(element) {

  delete element.api;
  delete element.apikey;
  delete element.apiname;
  delete element._key;
  delete element.apiurl;

  const blob = new Blob([JSON.stringify(element)], { type: 'application/json' });
  const link = document.createElement('a');
  const url = window.URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', '' + element.profile_name + ' settings profile (vulnrepo.com).vulnrepo-profiles');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

downloadTemplateItem(element) {

  delete element.api;
  delete element._key;
  delete element.apikey;
  delete element.apiname;
  delete element.apiurl;

  const blob = new Blob([JSON.stringify(element)], { type: 'application/json' });
  const link = document.createElement('a');
  const url = window.URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', '' + element.title + ' template (vulnrepo.com).vulnrepo-templates');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

exporttemplates() {

  this.indexeddbService.retrieveReportTemplates().then(ret => {
    if (ret) {
      const blob = new Blob([JSON.stringify(ret)], { type: 'application/json' });
      const link = document.createElement('a');
      const url = window.URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'Backup Report Templates (vulnrepo.com).vulnrepo-templates');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  });
}

importReportTemplates(input: HTMLInputElement) {
  console.log('import templates');

  const files = input.files;
  if (files && files.length) {

    const fileToRead = files[0];
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      this.parsetemplate(fileReader.result);
      
    };

    fileReader.readAsText(fileToRead, 'UTF-8');
  }

}

parsetemplate(template){
  const parsed = JSON.parse(template);

  if(Array.isArray(parsed)){
    parsed.forEach((item) => {
      this.indexeddbService.saveReportTemplateinDB(item).then(ret => {});    
    });
  } else {
    this.indexeddbService.saveReportTemplateinDB(parsed).then(ret => {});
  }
  this.getTemplates();

}



editTemplateItem(item: any): void {
  const dialogRef = this.dialog.open(DialogAddCustomTemplateComponent, {
    width: '600px',
    disableClose: true,
    data: [item,{edit: true}]
  });


  dialogRef.afterClosed().subscribe(result => {
    console.log('Report Settings Templates edit dialog was closed');
    if (result) {

      const index: number = this.reportTemplateList.indexOf(result[1].original[0]);
      if (index !== -1) {
        const ndd = {"title": result[0].title,"poc": "","desc": result[0].desc,"severity": result[0].severity,"ref": result[0].ref,"cvss": result[0].cvss,"cvss_vector": result[0].cvss_vector,"cve": result[0].cve, "tags": result[0].tags};
        this.reportTemplateList[index] = ndd;
  
        this.indexeddbService.updateTemplate(ndd, result[1].original[0]._key).then(ret => {});
        this.ReportTemplatesdataSource.data = this.reportTemplateList;

      }

    }

  });

}

}
