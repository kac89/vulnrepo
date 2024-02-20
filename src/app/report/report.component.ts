import { Component, OnInit, OnDestroy, ViewChild, KeyValueChanges, KeyValueDiffer, KeyValueDiffers } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { IndexeddbService } from '../indexeddb.service';
import { DialogPassComponent } from '../dialog-pass/dialog-pass.component';
import { DialogAddissueComponent } from '../dialog-addissue/dialog-addissue.component';
import { Router } from '@angular/router';
import { Subscription, of, concatMap } from 'rxjs';
import { MessageService } from '../message.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DialogImportComponent } from '../dialog-import/dialog-import.component';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { DialogEditComponent } from '../dialog-edit/dialog-edit.component';
import { DialogExportissuesComponent } from '../dialog-exportissues/dialog-exportissues.component';
import { DialogChangelogComponent } from '../dialog-changelog/dialog-changelog.component';
import { DialogChangekeyComponent } from '../dialog-changekey/dialog-changekey.component';
import { DialogRemoveitemsComponent } from '../dialog-removeitems/dialog-removeitems.component';
import { DialogIssuesEditComponent } from '../dialog-issues-edit/dialog-issues-edit.component';
import { DialogCvssComponent } from '../dialog-cvss/dialog-cvss.component';
import { DialogCveComponent } from '../dialog-cve/dialog-cve.component';
import { DialogCustomcontentComponent } from '../dialog-customcontent/dialog-customcontent.component';
import { DialogReportcssComponent } from '../dialog-reportcss/dialog-reportcss.component';
import { DialogApierrorComponent } from '../dialog-apierror/dialog-apierror.component';
import { marked } from 'marked'
import { sha256 } from 'js-sha256';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { HttpClient } from '@angular/common/http';
import * as Crypto from 'crypto-js';
import { v4 as uuid } from 'uuid';
import * as DOMPurify from 'dompurify';
import { ApiService } from '../api.service';
import { MatCalendar, MatCalendarCellCssClasses, DateRange } from '@angular/material/datepicker';
import { SessionstorageserviceService } from "../sessionstorageservice.service"
import { DatePipe } from '@angular/common';
import { DateAdapter } from '@angular/material/core';
import { DialogAddCustomTemplateComponent } from '../dialog-add-custom-template/dialog-add-custom-template.component';
import { DialogEncryptReportComponent } from '../dialog-encrypt-report/dialog-encrypt-report.component';

export interface Tags {
  name: string;
}

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss']
})

export class ReportComponent implements OnInit, OnDestroy {

  // Pie
  public pieChartLabels: string[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];
  public chartcolors: any[] = [{
    backgroundColor: ['#FF0039', '#FF7518', '#F9EE06', '#3FB618', '#2780E3']
  }];

  private reportDiffer: KeyValueDiffer<string, any>;
  private reportDifferlogo: KeyValueDiffer<string, any>;
  private reportDiffersettings: KeyValueDiffer<string, any>;
  private reportTitleDiffer: KeyValueDiffer<any, any>;
  private objDiffers: Array<KeyValueDiffer<string, any>>;
  private objDiffersFiles: Array<KeyValueDiffer<string, any>>;
  private objDiffersResearcher: Array<KeyValueDiffer<string, any>>;
  public pieChartData: number[] = [0, 0, 0, 0, 0];
  public pieChartType = 'pie';
  public pieChartPlugins = [];

  dialogRef: MatDialogRef<DialogPassComponent>;
  displayedColumns: string[] = ['date', 'desc', 'settings'];
  dataSource = new MatTableDataSource();
  listchangelog: any[];
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatCalendar) calendar: MatCalendar<Date>;
  advhtml = '';
  report_css: any;
  bugbountylist = [];
  reportProfileList_int = [];
  report_id: string;
  report_info: any;
  lastsavereportdata = '';
  reportdesc: any;
  selecteditem = false;
  prev_hide = [];
  poc_editor_hide = [];
  BBmsg = '';
  selecteditems = [];
  textarea_selected = ""
  textarea_selected_start: any;
  textarea_selected_end: any;
  textarea_click: any;
  selected3 = [];
  selected3_true = [];
  ReportProfilesList = [];
  scopePreviewHTML = [];
  RaportsTags = [];
  pok = 0;
  timerCounter = 0;
  savemsg = '';
  report_decryption_in_progress: boolean;
  report_encryption_in_progress: boolean;
  api_connection_status: boolean;
  report_source_api = false;
  upload_in_progress = false;
  youhaveunsavedchanges = false;
  decryptedReportData: any;
  decryptedReportDataChanged: any;
  setLocal = 'en-GB';  //dd/MM/yyyy
  subscription: Subscription;
  displayedSeverityColumns: string[] = ['severity', 'count'];
  dataSourceforseverity = [
    { severity: 'Critical', count: 0 },
    { severity: 'High', count: 0 },
    { severity: 'Medium', count: 0 },
    { severity: 'Low', count: 0 },
    { severity: 'Info', count: 0 }
  ];
  issueStatus = [
    { status: 'Open (Waiting for review)', value: 1 },
    { status: 'Fix In Progress', value: 2 },
    { status: 'Fixed', value: 3 },
    { status: 'Won\'t Fix', value: 4 }
  ];
  selectedtheme = 'white';
  uploadlogoprev = '';
  adv_html: any;
  advlogo: any;
  advlogo_saved: any;

  severitytable = [
    { name: 'Critical', value: 0 },
    { name: 'High', value: 0 },
    { name: 'Medium', value: 0 },
    { name: 'Low', value: 0 },
    { name: 'Info', value: 0 }
  ];

  // options stats
  gradient: boolean = true;
  showLegend: boolean = true;
  showLabels: boolean = true;
  isDoughnut: boolean = false;

  colorScheme = {
    domain: ['#FF0039', '#FF7518', '#F9EE06', '#3FB618', '#2780E3']
  };

  // options stats activity
  selectedRangeValue: DateRange<Date> | null;

  visible = true;
  selectable = true;
  removable = true;
  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;


  constructor(private route: ActivatedRoute,
    public dialog: MatDialog,
    private http: HttpClient,
    private indexeddbService: IndexeddbService,
    private differs: KeyValueDiffers,
    public router: Router,
    private apiService: ApiService,
    private messageService: MessageService,
    private snackBar: MatSnackBar,
    public sessionsub: SessionstorageserviceService,
    private datePipe: DatePipe,
    private dateAdapter: DateAdapter<Date>) {
    //console.log(route);
    this.subscription = this.messageService.getDecrypted().subscribe(message => {
      this.decryptedReportData = message;
      this.decryptedReportDataChanged = this.decryptedReportData;
      this.adv_html = this.decryptedReportDataChanged.report_settings.report_html;
      this.advlogo_saved = this.decryptedReportDataChanged.report_settings.report_logo.logo;

      this.reportDiffer = this.differs.find(this.decryptedReportData).create();
      this.reportDifferlogo = this.differs.find({ report_logo: this.decryptedReportDataChanged.report_settings.report_logo.logo }).create();
      this.reportDiffersettings = this.differs.find(this.decryptedReportDataChanged.report_settings).create();

      this.objDiffers = new Array<KeyValueDiffer<string, any>>();
      this.decryptedReportDataChanged.report_vulns.forEach((itemGroup, index) => {
        this.objDiffers[index] = this.differs.find(itemGroup).create();
      });

      this.objDiffersFiles = new Array<KeyValueDiffer<string, any>>();
      this.decryptedReportDataChanged.report_vulns.forEach((itemGroup, index) => {
        this.objDiffersFiles[index] = this.differs.find(itemGroup.files).create();
      });

      this.objDiffersResearcher = new Array<KeyValueDiffer<string, any>>();
      this.decryptedReportDataChanged.researcher.forEach((itemGroup, index) => {
        this.objDiffersResearcher[index] = this.differs.find(itemGroup).create();
      });

      if (this.report_info) {
        this.reportTitleDiffer = this.differs.find({ report_name: this.report_info.report_name }).create();
      }

      this.doStats();

      let i = 0;
      do {
        this.selected3.push(false);
        this.prev_hide.push(false);
        i++;
      }
      while (i < this.decryptedReportDataChanged.report_vulns.length);

    });

  }

  ngOnInit() {
    // this.report_id = this.route.snapshot.params['report_id'];
    //set local
    if (navigator.language) {
      this.dateAdapter.setLocale(navigator.language); //detect browser local
      this.setLocal = navigator.language;
    } else {
      this.dateAdapter.setLocale(this.setLocal);
    }


    this.route.params.subscribe(routeParams => {
      if (routeParams.report_id != '') {
        if (routeParams.report_id) {
          this.report_decryption_in_progress = true;
          this.report_id = routeParams.report_id;
          this.youhaveunsavedchanges = false;
          this.lastsavereportdata = '';
          this.savemsg = '';
          // check if report exist
          this.indexeddbService.checkifreportexist(this.report_id).then(data => {
            if (data) {

              console.log('Report exist: OK');
              this.report_info = data;
              this.reportdesc = data;
              // check if pass in sessionStorage
              const pass = this.sessionsub.getSessionStorageItem(data.report_id);
              if (pass !== null) {
                this.report_decryption_in_progress = true;
                this.indexeddbService.decrypt(pass, data.report_id).then(returned => {

                  if (returned) {
                    this.report_decryption_in_progress = false;
                    this.report_source_api = false;
                  }

                });
              } else {
                this.report_decryption_in_progress = false;
                setTimeout(_ => this.openDialog(data)); // BUGFIX: https://github.com/angular/angular/issues/6005#issuecomment-165911194
              }

            } else {
              console.log('Report not exist locally: YES');
              this.api_connection_status = true;
              this.report_decryption_in_progress = false;
              this.indexeddbService.checkAPIreport(this.report_id).then(re => {
                if (re) {
                  this.report_info = re;
                  this.reportdesc = re;
                  this.api_connection_status = false;
                  // check if pass in sessionStorage
                  const pass = this.sessionsub.getSessionStorageItem(re.report_id);
                  if (pass !== null) {
                    this.report_decryption_in_progress = true;
                    if (this.indexeddbService.decodeAES(re, pass)) {
                      this.report_decryption_in_progress = false;
                      this.report_source_api = true;
                    }
                  } else {
                    this.report_source_api = true;
                    setTimeout(_ => this.openDialog(re)); // BUGFIX: https://github.com/angular/angular/issues/6005#issuecomment-165911194
                  }
                } else {
                  this.api_connection_status = false;
                  this.router.navigate(['/my-reports']);
                }
              });
            }
          });

          // get css style
          this.http.get('/assets/bootstrap.min.css', { responseType: 'text' }).subscribe(res => {
            this.report_css = res;
          });

          // get bug bountys programs list, full credits: https://github.com/projectdiscovery/public-bugbounty-programs
          this.http.get<any>('/assets/chaos-bugbounty-list.json?v=' + + new Date()).subscribe(res => {
            this.bugbountylist = res.programs;
          });

          this.getReportProfiles();


        }
      }
    });



  }

  entestdateChanged() {
    this.selectedRangeValue = new DateRange<Date>(new Date(this.decryptedReportDataChanged.report_metadata.starttest), new Date(this.decryptedReportDataChanged.report_metadata.endtest));
  }

  onDateChangeReportstart(event) {
    const newdate = new Date(event.value).getTime();
    this.decryptedReportDataChanged.report_metadata.starttest = newdate;
    this.entestdateChanged();
  }

  onDateChangeReportend(event) {
    const newdate = new Date(event.value).getTime();
    this.decryptedReportDataChanged.report_metadata.endtest = newdate;
    this.entestdateChanged();
  }

  canDeactivate() {
    if (this.youhaveunsavedchanges == true) {
      return confirm("You have unsaved changes, Do you really want to leave?");
    }
    return true;
  }

  dateClass() {
    return (date: Date): MatCalendarCellCssClasses => {
      const issuearr_success = [];
      const issuearr_critical = [];

      const critical = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
        return (el.severity === 'Critical');
      });

      critical.forEach((item, index) => {
        if (issuearr_critical.indexOf(item) === -1) {
          issuearr_critical.push(item.date);
        }
      });

      this.decryptedReportDataChanged.report_vulns.forEach((item, index) => {
        if (issuearr_success.indexOf(item) === -1) {
          issuearr_success.push(item.date);
        }
      });

      const successdate = issuearr_success
        .map(strDate => new Date(strDate))
        .some(d => d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear());

      const specialdate = issuearr_critical
        .map(strDate => new Date(strDate))
        .some(d => d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear());

      if (specialdate) {
        return 'special-date'
      } else if (successdate) {
        return 'success-date'
      } else {
        return ''
      }

    };

  }

  getReportProfiles() {
    // get report profiles
    this.indexeddbService.retrieveReportProfile().then(ret => {
      if (ret) {
        this.ReportProfilesList = ret;
      }
      this.getAPIReportProfiles();
    });

  }

  getAPIReportProfiles() {
    const localkey = this.sessionsub.getSessionStorageItem('VULNREPO-API');
    if (localkey) {
      //this.msg = 'API connection please wait...';

      const vaultobj = JSON.parse(localkey);

      vaultobj.forEach((element) => {

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

          this.ReportProfilesList = [...this.ReportProfilesList, ...this.reportProfileList_int];
          //this.dataSource.sort = this.sort;
          //this.dataSource.paginator = this.paginator;
          //this.msg = '';
        }).catch(() => { });


        setTimeout(() => {
          // console.log('hide progress timeout');
          //this.msg = '';
        }, 10000);

      });

    }
  }

  dataChanged(changes: KeyValueChanges<any, any[]>) {
    /* If you want to see details then use
      changes.forEachRemovedItem((record) => ...);
      changes.forEachAddedItem((record) => ...);
      changes.forEachChangedItem((record) => ...);
    */

    changes.forEachAddedItem((record) => {
      if (record.previousValue !== null) {
        this.afterDetection();
        //console.log('ADDED: ',record);
      }
    });

    changes.forEachChangedItem((record) => {
      // fix for rising detection change after report read only
      if (record.key !== 'report_version' && record.key !== 'report_name') {
        // console.log('Detection start');
        //console.log('CHANGED: ',record);
        this.afterDetection();
      }
    });

  }

  callListener(e) {
    e.preventDefault();
    e.returnValue = '';
  }
  timeout(e) {
    e.preventDefault();
    e.returnValue = '';
  }

  sureYouWanttoLeave() {
    window.addEventListener('beforeunload', this.callListener, true);
    this.youhaveunsavedchanges = true;
  }

  removeSureYouWanttoLeave() {
    window.removeEventListener('beforeunload', this.callListener, true);
    this.youhaveunsavedchanges = false;
    let id = window.setTimeout(function () { }, 0);
    while (id--) {
      window.clearTimeout(id); // will do nothing if no timeout with id is present
    }
  }

  afterDetectionNow() {
    this.reportDiffer = this.differs.find(this.decryptedReportData).create();
    this.reportDifferlogo = this.differs.find({ report_logo: this.decryptedReportDataChanged.report_settings.report_logo.logo }).create();
    this.reportDiffersettings = this.differs.find({ ...this.decryptedReportDataChanged.report_settings }).create();

    this.objDiffers = new Array<KeyValueDiffer<string, any>>();
    this.decryptedReportDataChanged.report_vulns.forEach((itemGroup, index) => {
      this.objDiffers[index] = this.differs.find(itemGroup).create();
    });

    this.objDiffersFiles = new Array<KeyValueDiffer<string, any>>();
    this.decryptedReportDataChanged.report_vulns.forEach((itemGroup, index) => {
      this.objDiffersFiles[index] = this.differs.find(itemGroup.files).create();
    });

    this.objDiffersResearcher = new Array<KeyValueDiffer<string, any>>();
    this.decryptedReportDataChanged.researcher.forEach((itemGroup, index) => {
      this.objDiffersResearcher[index] = this.differs.find(itemGroup).create();
    });

    if (this.report_info) {
      this.reportTitleDiffer = this.differs.find({ report_name: this.report_info.report_name }).create();
    }

    this.sureYouWanttoLeave();
  }

  afterDetection() {
    if (this.timerCounter >= 60) {
      setTimeout(() => { this.afterDetectionNow() }, 10000);
      this.timerCounter = 0;
    }
    this.timerCounter++;
    this.sureYouWanttoLeave();
  }

  ngDoCheck(): void {

    if (this.decryptedReportDataChanged) {

      const changes = this.reportDiffer.diff(this.decryptedReportDataChanged);
      if (changes) {
        this.dataChanged(changes);
      }

      if (this.reportDifferlogo) {
        const changeslogo = this.reportDifferlogo.diff({ report_logo: this.decryptedReportDataChanged.report_settings.report_logo.logo });
        if (changeslogo) {
          this.dataChanged(changeslogo);
        }
      }

      if (this.reportDiffersettings) {
        const changessettings = this.reportDiffersettings.diff(this.decryptedReportDataChanged.report_settings);
        if (changessettings) {
          this.dataChanged(changessettings);
        }
      }

      if (this.objDiffers) {
        this.decryptedReportDataChanged.report_vulns.forEach((itemGroup, index) => {
          if (this.objDiffers[index]) {
            const objDiffer = this.objDiffers[index];
            const objChanges = objDiffer.diff(itemGroup);
            if (objChanges) {
              this.dataChanged(objChanges);
            }
          }
        });
      }

      if (this.objDiffersFiles) {
        this.decryptedReportDataChanged.report_vulns.forEach((itemGroup, index) => {
          if (this.objDiffersFiles[index]) {
            const objDiffer2 = this.objDiffersFiles[index];
            const objChanges2 = objDiffer2.diff(itemGroup.files);
            if (objChanges2) {
              this.dataChanged(objChanges2);
            }
          }
        });
      }

      if (this.objDiffersResearcher) {
        this.decryptedReportDataChanged.researcher.forEach((itemGroup, index) => {
          if (this.objDiffersResearcher[index]) {
            const objDiffer3 = this.objDiffersResearcher[index];
            const objChanges3 = objDiffer3.diff(itemGroup);
            if (objChanges3) {
              this.dataChanged(objChanges3);
            }
          }
        });
      }

    }

    if (this.reportTitleDiffer && this.report_info) {
      const changesName = this.reportTitleDiffer.diff({ report_name: this.report_info.report_name });
      if (changesName) {
        this.dataChanged(changesName);
      }
    }

  }

  toggle() {
    this.selected3_true = this.selected3.filter(item => item === true);
    if (this.selected3.indexOf(true) !== -1) {
      this.pok = 1;
    } else {
      this.pok = 0;
    }

  }

  openissuesedit(array) {

    const dialogRef = this.dialog.open(DialogIssuesEditComponent, {
      width: '600px',
      data: { sel: array, orig: this.decryptedReportDataChanged.report_vulns }
    });

    dialogRef.afterClosed().subscribe(result => {

      if (result) {
        console.log('Dialog edit issue closed');
      }
    });

  }

  selectall() {
    this.selecteditems = [];
    this.selected3 = [];
    this.selected3_true = [];
    let i = 0;
    do {
      this.selected3.push(true);
      this.selected3_true.push(true);
      i++;
    }
    while (i < this.decryptedReportDataChanged.report_vulns.length);

  }

  deselectall() {
    this.selecteditems = [];
    this.selected3 = [];
    this.selected3_true = [];
    this.pok = 0;
    let i = 0;
    do {
      this.selected3.push(false);
      i++;
    }
    while (i < this.decryptedReportDataChanged.report_vulns.length);

  }

  removeSelecteditems(array) {

    const dialogRef = this.dialog.open(DialogRemoveitemsComponent, {
      width: '400px',
      data: { sel: array, orig: this.decryptedReportDataChanged.report_vulns }
    });

    dialogRef.afterClosed().subscribe(result => {

      if (result) {
        result.forEach(eachObj => {
          const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(eachObj);
          if (index !== -1) {
            this.decryptedReportDataChanged.report_vulns.splice(index, 1);
            this.addtochangelog('Remove issue: ' + eachObj.title);
            this.afterDetectionNow();
          }
        });
        this.deselectall();
        this.doStats();
      }
    });

  }


  openDialogCVSS(data: any): void {

    const dialogRef = this.dialog.open(DialogCvssComponent, {
      width: '800px',
      disableClose: false,
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The CVSS dialog was closed');
      this.doStats();
    });

  }


  openDialogCVE(data: any): void {

    const dialogRef = this.dialog.open(DialogCveComponent, {
      width: '700px',
      disableClose: false,
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The CVE dialog was closed');
    });

  }


  openDialog(data: any): void {

    const dialogRef = this.dialog.open(DialogPassComponent, {
      width: '400px',
      disableClose: true,
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The security key dialog was closed');
    });

  }

  addtablescope(): void {

    this.decryptedReportDataChanged.report_scope = this.decryptedReportDataChanged.report_scope + ' \
\n\
IP   | hostname | role | comments\n\
------|--------------|-------|---------------\n\
127.0.0.1 | localhost.localdomain | PROD | client asked to test this one with care\n\
255.255.255.255 | N/A | DMZ | test you can go do whatever you want on it\n\
';

  }

  addcodescope(): void {

    this.decryptedReportDataChanged.report_scope = this.decryptedReportDataChanged.report_scope + ' \
\n\
```\n\
Sample code here\n\
```\n\
';

  }

  doStats() {

    const critical = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Critical');
    });

    const high = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'High');
    });

    const medium = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Medium');
    });

    const low = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Low');
    });

    const info = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Info');
    });

    this.dataSourceforseverity = [
      { severity: 'Critical', count: critical.length },
      { severity: 'High', count: high.length },
      { severity: 'Medium', count: medium.length },
      { severity: 'Low', count: low.length },
      { severity: 'Info', count: info.length }
    ];

    this.severitytable = [
      { name: 'Critical', value: critical.length },
      { name: 'High', value: high.length },
      { name: 'Medium', value: medium.length },
      { name: 'Low', value: low.length },
      { name: 'Info', value: info.length }
    ];

    this.listchangelog = this.decryptedReportData.report_changelog;
    this.dataSource = new MatTableDataSource(this.decryptedReportData.report_changelog);
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    setTimeout(() => this.dataSource.sort = this.sort);
    setTimeout(() => this.dataSource.paginator = this.paginator);
    if (this.decryptedReportDataChanged.report_vulns.length > 0) {
      setTimeout(() => this.calendar.updateTodaysDate());
    }
    this.entestdateChanged();

    // this.reportdesc.report_lastupdate = this.decryptedReportDataChanged.report_lastupdate;

  }

  renderdateformat(inputdate) {
    const date = new Date(inputdate).getTime();
    const rdate = this.datePipe.transform(date, 'yyyy-MM-dd');
    return rdate
  }

  onDateChange(data, event) {
    const newdate = new Date(event.value).getTime();
    const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(data);
    if (index !== -1) {
      this.decryptedReportDataChanged.report_vulns[index].date = newdate;
      this.doStats();
    }

  }

  mergeissue(issue) {
    this.decryptedReportDataChanged.report_vulns.push(issue);
    this.addtochangelog('Create issue: ' + issue.title);
    this.afterDetectionNow();
    this.doStats();
  }

  addissue() {

    function isIterable(x: unknown): boolean {
      return !!x?.[Symbol.iterator];
    }

    console.log('Add issue');
    const dialogRef = this.dialog.open(DialogAddissueComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      if (result !== undefined) {
        if (isIterable(result)) {
          for (var elem of result) {
            if (elem.title !== '') {
              this.mergeissue(elem);
            }
          }
        } else {
          this.mergeissue(result);
        }

      } else {

        if (result) {
          if (result.title !== '') {
            this.mergeissue(result);
          }
        }
      }

    });

  }

  import_issues() {
    console.log('Import issues');
    const dialogRef = this.dialog.open(DialogImportComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      if (result !== undefined) {
        result.forEach(eachObj => {

          if (eachObj.title !== '' && eachObj.title !== undefined && eachObj.cvss !== 'Active') {
            this.decryptedReportDataChanged.report_vulns.push(eachObj);
            this.addtochangelog('Create issue: ' + eachObj.title);
            this.afterDetectionNow();
          }

        });

        this.doStats();
      }

    });

  }


  export_by_tag(tag) {
    const filteredTags = this.decryptedReportDataChanged.report_vulns.filter((element) => element.tags.some((subElement) => subElement.name === tag));

    console.log('Export issues');
    const dialogRef = this.dialog.open(DialogExportissuesComponent, {
      width: '500px',
      data: filteredTags
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });


  }

  export_by_severity(exportitem, severity) {

    const bySeverity = exportitem.filter(item => item.severity === severity);

    if (bySeverity.length > 0) {
      console.log('Export issues');
      const dialogRef = this.dialog.open(DialogExportissuesComponent, {
        width: '500px',
        data: bySeverity
      });

      dialogRef.afterClosed().subscribe(result => {
        console.log('The dialog was closed');
      });
    }
  }

  export_issues(selected, original) {
    console.log('Export issues');

    const selecteditems = selected.find(i => i === true);
    if (selecteditems) {

      const dialogRef = this.dialog.open(DialogExportissuesComponent, {
        width: '500px',
        data: { sel: selected, orig: original }
      });

      dialogRef.afterClosed().subscribe(result => {
        console.log('The dialog was closed');
      });

    } else {

      const dialogRef = this.dialog.open(DialogExportissuesComponent, {
        width: '500px',
        data: original
      });

      dialogRef.afterClosed().subscribe(result => {
        console.log('The dialog was closed');
      });

    }
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.decryptedReportDataChanged.report_vulns, event.previousIndex, event.currentIndex);
    moveItemInArray(this.selecteditems, event.previousIndex, event.currentIndex);
    moveItemInArray(this.selected3, event.previousIndex, event.currentIndex);
    moveItemInArray(this.scopePreviewHTML, event.previousIndex, event.currentIndex);
    moveItemInArray(this.poc_editor_hide, event.previousIndex, event.currentIndex);
    moveItemInArray(this.prev_hide, event.previousIndex, event.currentIndex);
  }

  saveReportChanges(report_id: any) {
    this.report_encryption_in_progress = true;
    this.savemsg = 'Please wait, report is encrypted...';
    const pass = this.sessionsub.getSessionStorageItem(report_id);
    let useAPI = false;

    this.indexeddbService.getkeybyReportID(report_id).then(data => {
      if (data) {

        if (data.NotFound === 'NOOK') {
          console.log('no locally report');
          useAPI = true;
        } else {

          // update report
          this.decryptedReportDataChanged.report_version = this.decryptedReportDataChanged.report_version + 1;
          this.addtochangelog('Save report v.' + this.decryptedReportDataChanged.report_version);
          // tslint:disable-next-line:max-line-length
          this.indexeddbService.prepareupdatereport(this.decryptedReportDataChanged, pass, this.report_info.report_id, this.report_info.report_name, this.report_info.report_createdate, data.key).then(retu => {
            if (retu) {
              this.reportdesc.report_lastupdate = retu;
              this.report_encryption_in_progress = false;
              this.savemsg = 'All changes saved successfully!';
              this.lastsavereportdata = retu;
              this.doStats();

              this.removeSureYouWanttoLeave();

              this.snackBar.open('All changes saved successfully!', 'OK', {
                duration: 3000,
                panelClass: ['notify-snackbar-success']
              });
            }
          });

        }

      }
    }).then(() => {

      if (useAPI === true) {


        this.indexeddbService.checkAPIreportchanges(this.report_id).then(re => {
          if (re) {
            //console.log(re);
            //console.log(re.report_lastupdate);
            //console.log(this.reportdesc.report_lastupdate);

            if (this.reportdesc.report_lastupdate === re.report_lastupdate) {
              console.log('no changes');

              this.indexeddbService.searchAPIreport(this.report_info.report_id).then(ret => {

                if (ret === 'API_ERROR') {
                  console.log('api problems');

                  const dialogRef = this.dialog.open(DialogApierrorComponent, {
                    width: '400px',
                    disableClose: true
                  });

                  dialogRef.afterClosed().subscribe(result => {

                    if (result === 'tryagain') {
                      console.log('User select: try again');
                      this.saveReportChanges(this.report_info.report_id);
                    }

                    if (result === 'savelocally') {
                      console.log('User select: save locally');
                      try {
                        this.decryptedReportDataChanged.report_version = this.decryptedReportDataChanged.report_version + 1;
                        this.addtochangelog('Save report v.' + this.decryptedReportDataChanged.report_version);
                        // Encrypt
                        const ciphertext = Crypto.AES.encrypt(JSON.stringify(this.decryptedReportDataChanged), pass);
                        const now: number = Date.now();
                        const to_update = {
                          report_id: uuid(),
                          report_name: this.report_info.report_name,
                          report_createdate: this.report_info.report_createdate,
                          report_lastupdate: now,
                          encrypted_data: ciphertext.toString()
                        };

                        this.indexeddbService.cloneReportadd(to_update).then(data => {
                          if (data) {
                            this.removeSureYouWanttoLeave();
                            this.router.navigate(['/my-reports']);
                          }
                        });

                      } catch (except) {
                        console.log(except);
                      }

                    }
                  });

                } else {
                  this.decryptedReportDataChanged.report_version = this.decryptedReportDataChanged.report_version + 1;
                  this.addtochangelog('Save report v.' + this.decryptedReportDataChanged.report_version);
                  // tslint:disable-next-line:max-line-length
                  this.indexeddbService.prepareupdateAPIreport(ret.api, ret.apikey, this.decryptedReportDataChanged, pass, this.report_info.report_id, this.report_info.report_name, this.report_info.report_createdate).then(retu => {
                    if (retu === 'NOSPACE') {
                      this.savemsg = '';
                      this.report_encryption_in_progress = false;
                    } else {
                      this.report_encryption_in_progress = false;
                      this.reportdesc.report_lastupdate = retu;
                      this.savemsg = 'All changes saved on remote API successfully!';
                      this.lastsavereportdata = retu;
                      this.doStats();
                      this.removeSureYouWanttoLeave();

                      this.snackBar.open('All changes saved on remote API successfully!', 'OK', {
                        duration: 3000,
                        panelClass: ['notify-snackbar-success']
                      });
                    }

                  });

                }

              });


            } else {
              console.log('report changes detected!!!');


              const dialogRef = this.dialog.open(DialogApierrorComponent, {
                width: '400px',
                disableClose: true
              });

              dialogRef.afterClosed().subscribe(result => {

                if (result === 'tryagain') {
                  console.log('User select: try again');
                  this.saveReportChanges(this.report_info.report_id);
                }

                if (result === 'savelocally') {
                  console.log('User select: save locally');
                  try {
                    this.decryptedReportDataChanged.report_version = this.decryptedReportDataChanged.report_version + 1;
                    this.addtochangelog('Save report v.' + this.decryptedReportDataChanged.report_version);
                    // Encrypt
                    const ciphertext = Crypto.AES.encrypt(JSON.stringify(this.decryptedReportDataChanged), pass);
                    const now: number = Date.now();
                    const to_update = {
                      report_id: uuid(),
                      report_name: this.report_info.report_name,
                      report_createdate: this.report_info.report_createdate,
                      report_lastupdate: now,
                      encrypted_data: ciphertext.toString()
                    };

                    this.indexeddbService.cloneReportadd(to_update).then(data => {
                      if (data) {
                        this.removeSureYouWanttoLeave();
                        this.router.navigate(['/my-reports']);
                      }
                    });

                  } catch (except) {
                    console.log(except);
                  }

                }
              });

            }

          }
        });

      }

    });

  }

  getselectedissues(items) {
    const ret = items.filter(function (el) {
      return (el === true);
    });
    return ret.length;
  }
  getTags(items) {
    const ret = items.filter(function (el) {
      return (el.tags.length !== 0);
    });

    return ret.length;
  }

  getAllTAgs() {

    const rettag = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.tags.length > 0);
    });

    if (rettag.length > 0) {
      const xxx = [];
      this.RaportsTags = [];
      rettag.forEach(function (value) {
        value.tags.forEach(function (tagval) {

          if (!xxx.includes(tagval.name)) {
            xxx.push(tagval.name);
          }

        });
      });
      this.RaportsTags = xxx;

    }

    return this.RaportsTags
  }

  sortbycvss() {
    this.deselectall();
    this.decryptedReportDataChanged.report_vulns = this.decryptedReportDataChanged.report_vulns.sort((a, b) => b.cvss - a.cvss);
  }

  sortbyseverity() {
    this.deselectall();

    const critical = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Critical');
    });

    const high = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'High');
    });

    const medium = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Medium');
    });

    const low = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Low');
    });

    const info = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Info');
    });

    const merge = [...critical, ...high, ...medium, ...low, ...info];
    this.decryptedReportDataChanged.report_vulns = merge;
  }

  addCustomcontent(item) {

    const dialogRef = this.dialog.open(DialogCustomcontentComponent, {
      width: '550px',
      height: '450px',
      data: item
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      if (result) {
        if (result !== '') {
          this.decryptedReportDataChanged.report_settings.report_html = result;
        }
      }
    });

  }

  addCustomcss(item) {

    const dialogRef = this.dialog.open(DialogReportcssComponent, {
      width: '550px',
      height: '450px',
      data: item
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      if (result || result === "") {
        this.decryptedReportDataChanged.report_settings.report_css = result;
      }
    });

  }


  editreporttitle(item) {

    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '350px',
      data: item
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      if (result) {
        if (result !== 'nochanges') {
          this.report_info.report_name = result;
        }
      }
    });

  }

  changesecuritykey(report_id: string) {

    const dialogRef = this.dialog.open(DialogChangekeyComponent, {
      width: '450px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      if (result) {
        this.updateSecKey(report_id, result);
      }

    });

  }

  updateSecKey(report_id, pass) {

    this.savemsg = 'Please wait, report is encrypted...';
    this.sessionsub.setSessionStorageItem(report_id, pass);

    // update report
    this.addtochangelog('Change report security key');
    this.decryptedReportDataChanged.report_version = this.decryptedReportDataChanged.report_version + 1;
    this.addtochangelog('Save report v.' + this.decryptedReportDataChanged.report_version);

    this.indexeddbService.getkeybyReportID(report_id).then(data => {
      if (data) {

        if (data.NotFound === 'NOOK') {
          console.log('no locally report');
        } else {
          // tslint:disable-next-line:max-line-length
          this.indexeddbService.prepareupdatereport(this.decryptedReportDataChanged, pass, this.report_info.report_id, this.report_info.report_name, this.report_info.report_createdate, data.key).then(retu => {
            if (retu) {
              this.savemsg = 'All changes saved successfully!';
              this.lastsavereportdata = retu;
              this.doStats();
            }
          });
        }

      }
    });

  }

  editissuetitle(item) {
    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '350px',
      data: item
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      if (result) {
        if (result !== 'nochanges') {
          const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(result);
          if (index !== -1) {
            this.decryptedReportDataChanged.report_vulns[index].title = result.title;
            this.afterDetectionNow();
          }
        }
      }
    });
  }
  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.subscription.unsubscribe();
  }

  addresearcher() {

    const add = {
      reportername: '',
      reportersocial: '',
      reporterwww: '',
      reporteremail: ''
    };

    this.decryptedReportDataChanged.researcher.push(add);
    this.afterDetectionNow();

  }

  removeresearcher(item) {

    const index: number = this.decryptedReportDataChanged.researcher.indexOf(item);

    if (index !== -1) {
      this.decryptedReportDataChanged.researcher.splice(index, 1);
      this.afterDetectionNow();
    }

  }


  addchangelog() {
    const dialogRef = this.dialog.open(DialogChangelogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      if (result !== undefined) {
        this.decryptedReportDataChanged.report_changelog.push(result);
        this.doStats();
      }

    });
  }


  editchangelog(item) {
    const dialogRef = this.dialog.open(DialogChangelogComponent, {
      width: '500px',
      data: item
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      if (result) {
        const index: number = this.decryptedReportDataChanged.report_changelog.indexOf(result.origi);

        if (index !== -1) {
          this.decryptedReportDataChanged.report_changelog[index] = { date: result.date, desc: result.desc };
          this.doStats();
        }
      }

    });
  }


  addtochangelog(item) {
    const today: number = Date.now();
    const add_changelog = {
      date: today,
      desc: item
    };

    this.decryptedReportDataChanged.report_changelog.push(add_changelog);
    this.doStats();
  }
  removefromchangelog(item) {
    const remo = 'changelog';
    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '350px',
      data: [{ remo }, { item }],
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      const index: number = this.decryptedReportDataChanged.report_changelog.indexOf(result);

      if (index !== -1) {
        this.decryptedReportDataChanged.report_changelog.splice(index, 1);
        this.doStats();
      }
    });
  }


  removeIssiue(item) {
    const remo = 'remove';
    const dialogRef = this.dialog.open(DialogEditComponent, {
      width: '350px',
      data: [{ remo }, { item }],
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(result);

      if (index !== -1) {
        this.decryptedReportDataChanged.report_vulns.splice(index, 1);
        this.addtochangelog('Remove issue: ' + result.title);
        this.afterDetectionNow();
        this.doStats();
      }

    });
  }



  shareReport(report_id) {
    this.indexeddbService.downloadEncryptedReport(report_id);
  }

  downloadASCII(report_details, metadata) {

    function addNewlines(str) {
      return stringDivider(str, 100, '\n');
    }

    function stringDivider(str, width, spaceReplacer) {
      if (str.length > width) {
        let p = width;
        for (; p > 0 && str[p] !== ' '; p--) { }
        if (p > 0) {
          const left = str.substring(0, p);
          const right = str.substring(p + 1);
          return left + spaceReplacer + stringDivider(right, width, spaceReplacer);
        }
      }
      return str;
    }

    let report_ascii_head = '######################################################\n\
# Report Title: ' + metadata.report_name + '\n\
# Report ID: ' + metadata.report_id + '\n\
# Create Date: ' + new Date(metadata.report_createdate).toLocaleDateString(this.setLocal) + '\n\
# Last Update: ' + new Date(metadata.report_lastupdate).toLocaleDateString(this.setLocal) + '\n';

    if (report_details.researcher.length > 0) {

      report_ascii_head = report_ascii_head + '#####\n# Author: \n';

      report_details.researcher.forEach(function (value, key) {

        if (value.reportername !== '') {
          report_ascii_head = report_ascii_head + '# ' + value.reportername + '';
        }

        if (value.reporteremail !== '') {
          report_ascii_head = report_ascii_head + ' - E-mail: ' + value.reporteremail + '';
        }

        if (value.reportersocial !== '') {
          report_ascii_head = report_ascii_head + ' - Social: ' + value.reportersocial + '';
        }

        if (value.reporterwww !== '') {
          report_ascii_head = report_ascii_head + ' - WWW: ' + value.reporterwww + '';
        }

        report_ascii_head = report_ascii_head + '\n';
      }, this);

    }

    if (report_details.report_scope !== '') {
      report_ascii_head = report_ascii_head + '# Report scope: \n' + addNewlines(report_details.report_scope);
    }

    report_ascii_head = report_ascii_head + '######################################################\n\
# Vulnerabilities:\n\n';

    let report_ascii_vulns = '';
    report_details.report_vulns.forEach(function (value, key) {

      report_ascii_vulns += report_ascii_vulns = '\n-> ' + Number(key + 1) + '. ' + value.title;

      if (value.severity !== '') {
        report_ascii_vulns = report_ascii_vulns + '\n# Severity: ' + value.severity + '\n';
      }

      if (value.date !== '') {
        report_ascii_vulns = report_ascii_vulns + '# Find Date: ' + new Date(value.date).toLocaleDateString(this.setLocal) + '\n';
      }

      if (value.cvss !== '') {
        report_ascii_vulns = report_ascii_vulns + '# CVSS: ' + value.cvss + '\n';
      }

      if (value.cve !== '') {
        report_ascii_vulns = report_ascii_vulns + '# CVE: ' + addNewlines(value.cve) + '\n';
      }

      report_ascii_vulns = report_ascii_vulns + '# Description: \n' + addNewlines(value.desc) + '\n';

      if (value.poc !== '') {
        report_ascii_vulns = report_ascii_vulns + '# PoC: \n' + addNewlines(value.poc) + '\n';
      }

      if (value.ref !== '') {
        report_ascii_vulns = report_ascii_vulns + '# References: \n' + value.ref + '\n\n';
      }


    }, this);

    const report_ascii_end = '\n# Report generated by vulnrepo.com \n######################################################\n';
    const report_ascii = report_ascii_head + report_ascii_vulns + report_ascii_end;

    // download ascii report
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(report_ascii));
    element.setAttribute('download', metadata.report_name + ' ' + metadata.report_id + ' ASCII (vulnrepo.com).txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

  }

  embedVideo(event) {
    if (event.checked === false) {
      this.decryptedReportDataChanged.report_settings.report_video_embed = false;
    }
    if (event.checked === true) {
      this.decryptedReportDataChanged.report_settings.report_video_embed = true;
    }
  }

  removeGeninfo(event) {
    if (event.checked === false) {
      this.decryptedReportDataChanged.report_settings.report_remove_lastpage = false;
    }
    if (event.checked === true) {
      this.decryptedReportDataChanged.report_settings.report_remove_lastpage = true;
    }
  }

  removechangelogpage(event) {
    if (event.checked === false) {
      this.decryptedReportDataChanged.report_settings.report_changelog_page = false;
    }
    if (event.checked === true) {
      this.decryptedReportDataChanged.report_settings.report_changelog_page = true;
    }
  }

  parsingdescnewline(event) {
    if (event.checked === false) {
      this.decryptedReportDataChanged.report_settings.report_parsing_desc = false;
    }
    if (event.checked === true) {
      this.decryptedReportDataChanged.report_settings.report_parsing_desc = true;
    }
  }

  parsingpocmarkdown(event) {
    if (event.checked === false) {
      this.decryptedReportDataChanged.report_settings.report_parsing_poc_markdown = false;
    }
    if (event.checked === true) {
      this.decryptedReportDataChanged.report_settings.report_parsing_poc_markdown = true;
    }
  }

  removeattachname(event) {
    if (event.checked === false) {
      this.decryptedReportDataChanged.report_settings.report_remove_attach_name = false;
    }
    if (event.checked === true) {
      this.decryptedReportDataChanged.report_settings.report_remove_attach_name = true;
    }
  }

  removeResearchers(event) {
    if (event.checked === false) {
      this.decryptedReportDataChanged.report_settings.report_remove_researchers = false;
    }
    if (event.checked === true) {
      this.decryptedReportDataChanged.report_settings.report_remove_researchers = true;
    }
  }

  removeIssuestatus(event) {
    if (event.checked === false) {
      this.decryptedReportDataChanged.report_settings.report_remove_issuestatus = false;
    }
    if (event.checked === true) {
      this.decryptedReportDataChanged.report_settings.report_remove_issuestatus = true;
    }
  }

  removeIssuecvss(event) {
    if (event.checked === false) {
      this.decryptedReportDataChanged.report_settings.report_remove_issuecvss = false;
    }
    if (event.checked === true) {
      this.decryptedReportDataChanged.report_settings.report_remove_issuecvss = true;
    }
  }

  removeIssuecve(event) {
    if (event.checked === false) {
      this.decryptedReportDataChanged.report_settings.report_remove_issuecve = false;
    }
    if (event.checked === true) {
      this.decryptedReportDataChanged.report_settings.report_remove_issuecve = true;
    }
  }

  removetagsfromreport(event) {
    if (event.checked === false) {
      this.decryptedReportDataChanged.report_settings.report_remove_issuetags = false;
    }
    if (event.checked === true) {
      this.decryptedReportDataChanged.report_settings.report_remove_issuetags = true;
    }
  }

  parserefmd(str): string {
    const xx = str.split("\n");
    let ar = "";
    xx.forEach((item, index) => {
      item = item.replace(" ", "_");
      ar = ar + `[` + item + `](` + item + `)\n\n`;
    });

    return ar
  }

  DownloadMarkdown(report_info): void {

    const str = `# Security Report
## ` + report_info.report_name + `
##### Report Version: ` + this.decryptedReportDataChanged.report_version + `
##### Report ID: ` + report_info.report_id;

    let str_dates = "";
    if (this.decryptedReportDataChanged.report_metadata.starttest !== '' && this.decryptedReportDataChanged.report_metadata.endtest !== '') {
      const startdatestr = new Date(this.decryptedReportDataChanged.report_metadata.starttest).toLocaleDateString(this.setLocal);

      const enddatestr = new Date(this.decryptedReportDataChanged.report_metadata.endtest).toLocaleDateString(this.setLocal);

      str_dates = `
##### Start date: ` + startdatestr + `
##### End date: ` + enddatestr + `\n\n`;
    }


    const critical = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Critical');
    });

    const high = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'High');
    });

    const medium = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Medium');
    });

    const low = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Low');
    });

    const info = this.decryptedReportDataChanged.report_vulns.filter(function (el) {
      return (el.severity === 'Info');
    });

    const vulnstats = `## Statistics\n
Severity   | Number 
------|--------------
Critical | `+ critical.length + `
High | `+ high.length + `
Medium | `+ medium.length + `
Low | `+ low.length + `
Info | `+ info.length + `\n\n`;

    const str_scope = `
## Scope
` + this.decryptedReportDataChanged.report_scope + `\n\n`;

    let str_issues = '## Results\n\n';

    this.decryptedReportDataChanged.report_vulns.forEach((item, index) => {
      index = index + 1;
      str_issues = str_issues + `
##### ` + index + `. ` + item.title + `
###### Severity:
` + item.severity + `
###### Description:
` + item.desc + `
###### PoC:
` + item.poc + `
###### References:
` + this.parserefmd(item.ref) + `\n-------------\n\n`;
    });

    let str_researcher = '';
    if (this.decryptedReportDataChanged.report_settings.report_remove_researchers === false) {
      this.decryptedReportDataChanged.researcher.forEach((item, index) => {
        str_researcher = str_researcher + `## Researcher
  > ` + item.reportername + ` ` + item.reportersocial + `\n\n`;
      });
    }

    let str_changelog = '';
    if (this.decryptedReportDataChanged.report_settings.report_changelog_page === false) {
      str_changelog = `## Changelog\n
Date   | Description 
------|--------------\n`;

      this.decryptedReportDataChanged.report_changelog.forEach((item, index) => {

        const rdate = new Date(item.date).toLocaleDateString(this.setLocal);

        str_changelog = str_changelog + rdate + ` | ` + item.desc + `\n`;
      });
      str_changelog = str_changelog + '\n\n';
    }

    let str2 = '';
    if (this.decryptedReportDataChanged.report_settings.report_remove_lastpage === false) {
      str2 = `_Generated by [VULNRΞPO](https://vulnrepo.com/)_`;
    }

    // download HTML report
    const blob = new Blob([str + str_dates + str_scope + vulnstats + str_issues + str_researcher + str_changelog + str2], { type: 'text/markdown' });
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', report_info.report_name + ' ' + report_info.report_id + ' (vulnrepo.com).md');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  DownloadJSON(report_info): void {

    const json = {
      "report_name": report_info.report_name,
      "report_id": report_info.report_id,
      "report_createdate": report_info.report_createdate,
      "report_lastupdate": report_info.report_lastupdate,
      "report_changelog": this.decryptedReportDataChanged.report_changelog,
      "researcher": this.decryptedReportDataChanged.researcher,
      "report_vulns": this.decryptedReportDataChanged.report_vulns,
      "report_version": this.decryptedReportDataChanged.report_version,
      "report_summary": this.decryptedReportDataChanged.report_summary,
      "report_metadata": this.decryptedReportDataChanged.report_metadata,
      "report_scope": this.decryptedReportDataChanged.report_scope,
      "report_settings": this.decryptedReportDataChanged.report_settings
    };

    // download HTML report
    const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', report_info.report_name + ' ' + report_info.report_id + ' (vulnrepo.com).json');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getDataSynchronous(file) {
    return this.http.get('/assets/res/' + file, { responseType: 'text' }).toPromise()
  }


  DownloadHTMLreportv2(res, encrypted, ciphertext, json, report_info) {
    // download HTML report
    let blob = new Blob();
    if (encrypted) {
      blob = new Blob([res.replace("{'HERE':'REPLACE'};", "'" + ciphertext + "';")], { type: 'text/html' });
    } else {
      var jsondata = JSON.stringify(json);
      blob = new Blob([res.replace("{'HERE':'REPLACE'};", "'" + btoa(encodeURIComponent(jsondata)) + "';")], { type: 'text/html' });
    }

    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    let encryptedtext = "";
    if (encrypted) {
      encryptedtext = " encrypted";
    }
    link.setAttribute('href', url);
    link.setAttribute('download', report_info.report_name + ' ' + report_info.report_id + encryptedtext + ' (vulnrepo.com).html');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  encrypt_reportv2(report_info, encrypted, type_dep): void {
    const dialogRef = this.dialog.open(DialogEncryptReportComponent, {
      width: '600px',
      //height: '985px',
      disableClose: true,
      data: []
    });


    dialogRef.afterClosed().subscribe(result => {
      console.log('Encrypt report dialog was closed');
      if (result) {
        this.DownloadHTMLv2(report_info, encrypted, type_dep, result);
      }
    });

  }


  DownloadHTMLv2(report_info, encrypted, type_dep, encpass): void {
    const json = {
      "report_name": report_info.report_name,
      "report_id": report_info.report_id,
      "report_createdate": report_info.report_createdate,
      "report_lastupdate": report_info.report_lastupdate,
      "report_changelog": this.decryptedReportDataChanged.report_changelog,
      "researcher": this.decryptedReportDataChanged.researcher,
      "report_vulns": this.decryptedReportDataChanged.report_vulns,
      "report_version": this.decryptedReportDataChanged.report_version,
      "report_summary": this.decryptedReportDataChanged.report_summary,
      "report_metadata": this.decryptedReportDataChanged.report_metadata,
      "report_scope": this.decryptedReportDataChanged.report_scope,
      "report_settings": this.decryptedReportDataChanged.report_settings,
      "report_encrypted_t": true
    };

    const report_dep_css_obj = [
      { "filename": "bootstrap/5.2.3/css/bootstrap.rtl.min.css", "integrity": "sha512-tC3gnye8BsHmrW3eRP3Nrj/bs+CSVUfzkjOlfLNrfvcbKXFxk5+b8dQCZi9rgVFjDudwipXfqEhsKMMgRZGCDw==" },
      { "filename": "bootstrap-icons/1.10.3/font/bootstrap-icons.min.css", "integrity": "sha512-YFENbnqHbCRmJt5d+9lHimyEMt8LKSNTMLSaHjvsclnZGICeY/0KYEeiHwD1Ux4Tcao0h60tdcMv+0GljvWyHg==" }
    ];

    const report_dep_js_obj = [
      { "filename": "jquery/3.6.3/jquery.min.js", "integrity": "sha512-STof4xm1wgkfm7heWqFJVn58Hm3EtS31XFaagaa8VMReCXAkQnJZ+jEy8PCC/iT18dFy95WcExNHFTqLyp72eQ==" },
      { "filename": "crypto-js/4.1.1/crypto-js.min.js", "integrity": "sha512-E8QSvWZ0eCLGk4km3hxSsNmGWbLtSCSUcewDQPQWZF6pEU8GlT8a5fF32wOl1i8ftdMhssTrF/OhyGWwonTcXA==" },
      { "filename": "bootstrap/5.2.3/js/bootstrap.bundle.min.js", "integrity": "sha512-i9cEfJwUwViEPFKdC1enz4ZRGBj8YQo6QByFTF92YXHi7waCqyexvRD75S5NVTsSiTv7rKWqG9Y5eFxmRsOn0A==" },
      { "filename": "marked/4.2.5/marked.min.js", "integrity": "sha512-5JZDwulT+S/K8p/KO4tikNKA5t6Ebb+tqPwT7Ma+lVpJuS4G+Z0lSktWcl8hymXeFqCprGEuKGOCrKjyulql/A==" },
      { "filename": "dompurify/2.4.1/purify.min.js", "integrity": "sha512-uHOKtSfJWScGmyyFr2O2+efpDx2nhwHU2v7MVeptzZoiC7bdF6Ny/CmZhN2AwIK1oCFiVQQ5DA/L9FSzyPNu6Q==" },
      { "filename": "Chart.js/4.4.0/chart.umd.js", "integrity": "sha512-6HrPqAvK+lZElIZ4mZ64fyxIBTsaX5zAFZg2V/2WT+iKPrFzTzvx6QAsLW2OaLwobhMYBog/+bvmIEEGXi0p1w==" }
    ];
    let ciphertext = "";
    if (encpass === 'userepokey') {
      ciphertext = Crypto.AES.encrypt(JSON.stringify(json), this.sessionsub.getSessionStorageItem(report_info.report_id));
    } else {
      ciphertext = Crypto.AES.encrypt(JSON.stringify(json), encpass);
    }


    this.http.get('/assets/html_report_v2_template.html?v=' + new Date(), { responseType: 'text' }).subscribe(res => {

      if (this.decryptedReportDataChanged.report_settings.report_css !== '') {
        res = res.replace("/*[CSS_Injection_here]*/", DOMPurify.sanitize(this.decryptedReportDataChanged.report_settings.report_css))
      }

      if (type_dep === "mini") {

        let css_String = "";
        let js_String = "";

        report_dep_css_obj.forEach(function (value) {
          css_String = css_String + '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/' + value.filename + '" integrity="' + value.integrity + '" crossorigin="anonymous" referrerpolicy="no-referrer" />\n';
        });
        res = res.replace("<depstyle></depstyle>", css_String);

        report_dep_js_obj.forEach(function (value) {
          js_String = js_String + '<script src="https://cdnjs.cloudflare.com/ajax/libs/' + value.filename + '" integrity="' + value.integrity + '" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n';
        });
        res = res.replace("<depscripts></depscripts>", js_String);
        this.DownloadHTMLreportv2(res, encrypted, ciphertext, json, report_info);

      } else {

        // FULL REPORT DEP included
        let css_String = "";
        let js_String = "";

        of("bootstrap/5.2.3/css/bootstrap.rtl.min.css", "bootstrap-icons/1.10.3/font/bootstrap-icons.min.css")
          .pipe(
            concatMap(ind => {
              let obs1 = this.http.get('/assets/res/' + ind, { responseType: 'text' })
              return obs1
            })
          ).subscribe(data => {
            css_String = css_String + `<style>
`+ data + `
</style>`;

          }).add(() => {
            //console.log('Finally callback');
            this.http.get('/assets/res/bootstrap-icons/1.10.3/font/fonts/bootstrap-icons.woff2.b64', { responseType: 'text' }).subscribe(ret => {

              css_String = css_String + `<style>
            @font-face{
              font-display:block;
              font-family:bootstrap-icons;
              src:url(data:font/opentype;base64,`+ ret + `) format("woff2"),
              url(data:font/opentype;base64,<wofftag></wofftag>) format("woff")
            }
            </style>`;

              this.http.get('/assets/res/bootstrap-icons/1.10.3/font/fonts/bootstrap-icons.woff.b64', { responseType: 'text' }).subscribe(ret2 => {

                css_String = css_String.replace('<wofftag></wofftag>', ret2);

                res = res.replace("<depstyle></depstyle>", css_String);
                css_String = "";

                of("jquery/3.6.3/jquery.min.js", "crypto-js/4.1.1/crypto-js.min.js", "bootstrap/5.2.3/js/bootstrap.bundle.min.js", "marked/4.2.5/marked.min.js", "dompurify/2.4.1/purify.min.js", "chart-js/4.4.0/chart.js")
                  .pipe(
                    concatMap(ind => {
                      let obs1 = this.http.get('/assets/res/' + ind, { responseType: 'text' })
                      return obs1
                    })
                  ).subscribe(data2 => {
                    js_String = js_String + `<script>
            ` + data2 + `
            </script>`;

                  }).add(() => {
                    res = res.replace("<depscripts></depscripts>", js_String);
                    js_String = "";
                    this.DownloadHTMLreportv2(res, encrypted, ciphertext, json, report_info);
                  });

              });


            });

          });


      }
    });
  }

  checksumfile(dataurl, file, dec_data) {
    let file_sha2 = '';
    // sha256 file checksum
    const reader = new FileReader();
    reader.onloadend = (e) => {
      file_sha2 = sha256(reader.result);

      this.proccessUpload(dataurl, file.name, file.type, file.size, file_sha2, dec_data);
    };
    reader.readAsArrayBuffer(file);

  }

  proccessUpload(data, name, type, size, sha256check, dec_data) {

    const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(dec_data);
    const today: number = Date.now();

    this.upload_in_progress = false;
    const linkprev = data;
    // tslint:disable-next-line:max-line-length
    this.decryptedReportDataChanged.report_vulns[index].files.push({ 'data': linkprev, 'title': DOMPurify.sanitize(name), 'type': DOMPurify.sanitize(type), 'size': size, 'sha256checksum': sha256check, 'date': today });
    this.afterDetectionNow();

  }

  uploadAttach(input: HTMLInputElement, dec_data) {

    const files = input.files;
    if (files && files.length) {
      this.upload_in_progress = true;
      for (let i = 0; i < files.length; i++) {
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
          this.checksumfile(fileReader.result, files[i], dec_data);
        };
        fileReader.readAsDataURL(files[i]);
      }
    }

  }

  downloadAttach(data, name) {

    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    const byteString = atob(data.split(',')[1]);

    // separate out the mime component
    const mimeString = data.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to an ArrayBuffer
    const ab = new ArrayBuffer(byteString.length);

    // create a view into the buffer
    const ia = new Uint8Array(ab);

    // set the bytes of the buffer to the correct values
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    const blob = new Blob([ab], { type: mimeString });

    const fileName = name;
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  }


  removeAttach(data, dec_data) {
    const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(dec_data);
    const ind: number = this.decryptedReportDataChanged.report_vulns[index].files.indexOf(data);
    if (ind !== -1) {
      this.decryptedReportDataChanged.report_vulns[index].files.splice(ind, 1);
      this.afterDetectionNow();
    }
  }


  parselogo(data, name, type) {
    const linkprev = 'data:image/png;base64,' + btoa(data);
    this.uploadlogoprev = '<img src="' + linkprev + '" width="100px">';
    this.advlogo = linkprev;
    this.decryptedReportDataChanged.report_settings.report_logo.logo = this.advlogo;
    this.decryptedReportDataChanged.report_settings.report_logo.logo_name = DOMPurify.sanitize(name);
    this.decryptedReportDataChanged.report_settings.report_logo.logo_type = DOMPurify.sanitize(type);
  }

  clearlogo() {
    this.decryptedReportDataChanged.report_settings.report_logo.logo = '';
    this.decryptedReportDataChanged.report_settings.report_logo.logo_name = '';
    this.decryptedReportDataChanged.report_settings.report_logo.logo_type = '';
    this.uploadlogoprev = '';
    this.advlogo = '';
    this.advlogo_saved = '';
    console.log('Logo cleared!');
  }

  importlogo(input: HTMLInputElement) {

    const files = input.files;
    if (files && files.length) {
      /*
       console.log("Filename: " + files[0].name);
       console.log("Type: " + files[0].type);
       console.log("Size: " + files[0].size + " bytes");
       */
      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        this.parselogo(fileReader.result, files[0].name, files[0].type);

      };
      fileReader.readAsBinaryString(fileToRead);
    }

  }


  TAGadd(event: MatChipInputEvent, dec_data): void {

    const value = (event.value || '').trim();

    if (value) {
      const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(dec_data);
      this.decryptedReportDataChanged.report_vulns[index].tags.push({ name: value });
    }

    // Reset the input value
    if (event.input) {
      event.input.value = '';
    }

  }

  TAGremove(tag: Tags, dec_data): void {

    const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(dec_data);
    const ind: number = this.decryptedReportDataChanged.report_vulns[index].tags.indexOf(tag);
    if (ind !== -1) {
      this.decryptedReportDataChanged.report_vulns[index].tags.splice(ind, 1);
    }

  }

  setReportProfile(profile: any) {

    this.uploadlogoprev = '<img src="' + profile.logo + '" width="100px">';
    this.advlogo = profile.logo;
    this.advlogo_saved = '';

    this.selectedtheme = profile.theme;

    // make changes
    this.decryptedReportDataChanged.researcher = [{ reportername: profile.ResName, reportersocial: profile.ResSocial, reporterwww: profile.ResWeb, reporteremail: profile.ResEmail }];
    this.decryptedReportDataChanged.report_settings.report_logo.logo = profile.logo;
    this.decryptedReportDataChanged.report_settings.report_logo.width = profile.logow;
    this.decryptedReportDataChanged.report_settings.report_logo.height = profile.logoh;

    this.decryptedReportDataChanged.report_settings.report_theme = profile.theme;

    this.decryptedReportDataChanged.report_settings.report_css = profile.report_css;
    this.decryptedReportDataChanged.report_settings.report_html = profile.report_custom_content;
    this.decryptedReportDataChanged.report_settings.report_video_embed = profile.video_embed;
    this.decryptedReportDataChanged.report_settings.report_remove_lastpage = profile.remove_lastpage;
    this.decryptedReportDataChanged.report_settings.report_remove_issuestatus = profile.remove_issueStatus;
    this.decryptedReportDataChanged.report_settings.report_remove_issuecvss = profile.remove_issuecvss;
    this.decryptedReportDataChanged.report_settings.report_remove_issuecve = profile.remove_issuecve;
    this.decryptedReportDataChanged.report_settings.report_remove_researchers = profile.remove_researcher;
    this.decryptedReportDataChanged.report_settings.report_changelog_page = profile.remove_changelog;
    this.decryptedReportDataChanged.report_settings.report_remove_issuetags = profile.remove_tags;
    this.decryptedReportDataChanged.report_settings.report_parsing_desc = profile.report_parsing_desc;
    this.decryptedReportDataChanged.report_settings.report_parsing_poc_markdown = profile.report_parsing_poc_markdown;
    this.decryptedReportDataChanged.report_settings.report_remove_attach_name = profile.report_remove_attach_name;
  }

  savenewReportProfile() {

    const time = new Date().toLocaleDateString(this.setLocal);
    const profile = {
      profile_name: time,
      logo: this.decryptedReportDataChanged.report_settings.report_logo.logo,
      logow: this.decryptedReportDataChanged.report_settings.report_logo.width,
      logoh: this.decryptedReportDataChanged.report_settings.report_logo.height,
      report_parsing_desc: this.decryptedReportDataChanged.report_settings.report_parsing_desc,
      report_parsing_poc_markdown: this.decryptedReportDataChanged.report_settings.report_parsing_poc_markdown,
      report_remove_attach_name: this.decryptedReportDataChanged.report_settings.report_remove_attach_name,
      video_embed: this.decryptedReportDataChanged.report_settings.report_video_embed,
      remove_lastpage: this.decryptedReportDataChanged.report_settings.report_remove_lastpage,
      remove_issueStatus: this.decryptedReportDataChanged.report_settings.report_remove_issuestatus,
      remove_issuecvss: this.decryptedReportDataChanged.report_settings.report_remove_issuecvss,
      remove_issuecve: this.decryptedReportDataChanged.report_settings.report_remove_issuecve,
      remove_researcher: this.decryptedReportDataChanged.report_settings.report_remove_researchers,
      remove_changelog: this.decryptedReportDataChanged.report_settings.report_changelog_page,
      remove_tags: this.decryptedReportDataChanged.report_settings.report_remove_issuetags,
      ResName: this.decryptedReportDataChanged.researcher[0].reportername,
      ResEmail: this.decryptedReportDataChanged.researcher[0].reporteremail,
      ResSocial: this.decryptedReportDataChanged.researcher[0].reportersocial,
      ResWeb: this.decryptedReportDataChanged.researcher[0].reporterwww
    };
    this.ReportProfilesList = this.ReportProfilesList.concat(profile);
    this.indexeddbService.saveReportProfileinDB(this.ReportProfilesList).then(ret => { });
    this.getReportProfiles();
  }

  searchBounty(poc) {
    this.fastsearchBB(poc, true);
  }

  fastsearchBB(poc, showsnack) {
    this.BBmsg = 'Please wait, searching...';
    let scope = [];
    this.bugbountylist.forEach(function (item) {
      scope = scope.concat(item.domains);
    });

    const regex = /(?:[\w-]+\.)+[\w-]+/g;
    let m;
    const arr = [];
    while ((m = regex.exec(poc.poc)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      m.forEach((match) => {
        // get only scope & search
        const findedbounty = scope.find(x => x == match);
        if (findedbounty) {
          this.bugbountylist.forEach(function (item) {
            const findedbounty2 = item.domains.find(x => x == findedbounty);
            if (findedbounty2) {
              arr.push(item);
            }
          });

        }
      });
    }

    if (showsnack !== false) {
      if (arr.length == 0) {
        this.snackBar.open('No bug-bounty program found :-( !', 'OK', {
          duration: 2000,
          panelClass: ['notify-snackbar-fail']
        });
      } else {
        this.snackBar.open('Found bug-bounty program !!! :-)', 'OK', {
          duration: 2000,
          panelClass: ['notify-snackbar-success']
        });
      }
    }

    const uniqueArray = arr.filter(function (item, pos) {
      return arr.indexOf(item) == pos;
    });

    const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(poc);
    this.decryptedReportDataChanged.report_vulns[index].bounty = [];
    this.decryptedReportDataChanged.report_vulns[index].bounty = this.decryptedReportDataChanged.report_vulns[index].bounty.concat(uniqueArray);

    this.decryptedReportDataChanged.report_vulns[index].bounty = arr.filter(function (item, pos) {
      return arr.indexOf(item) == pos;
    });

    this.BBmsg = '';


  }

  redirectBounty(url) {
    window.open(url, "_blank");
  }

  changePoC(poc) {
    this.fastsearchBB(poc, false);
    this.resetselectposition();
  }

  clickselectionchangepoc(event) {
    this.textarea_click = event.target.selectionStart;
  }
  selectionchangepoc(ev: any) {
    const start = ev.target.selectionStart;
    const end = ev.target.selectionEnd;
    this.textarea_selected = ev.target.value.substr(start, end - start);
    this.textarea_selected_start = start;
    this.textarea_selected_end = end;
  }

  replaceBetween(origin, startIndex, endIndex, insertion): string {
    return origin.substring(0, startIndex) + insertion + origin.substring(endIndex);
  }

  stringslice(a, b, position): string {
    return [a.slice(0, position), b, a.slice(position)].join('');
  }

  resetselectposition(): void {
    this.textarea_selected = "";
    this.textarea_selected_start = 0;
    this.textarea_selected_end = 0;
  }

  prepfunctItem(dec_data, lsig, rsig, dsig): void {
    if (this.textarea_selected !== "") {
      const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(dec_data);
      this.decryptedReportDataChanged.report_vulns[index].poc = this.replaceBetween(this.decryptedReportDataChanged.report_vulns[index].poc, this.textarea_selected_start, this.textarea_selected_end, lsig + this.textarea_selected + rsig);
      this.resetselectposition();
    } else {
      const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(dec_data);
      this.decryptedReportDataChanged.report_vulns[index].poc = this.stringslice(this.decryptedReportDataChanged.report_vulns[index].poc, dsig, this.textarea_click);
      this.resetselectposition();
    }
  }

  format_bold_funct(dec_data): void {
    this.prepfunctItem(dec_data, "**", "**", "**bold**");
  }

  format_italic_funct(dec_data): void {
    this.prepfunctItem(dec_data, " _", "_ ", " _emphasized text_ ");
  }

  format_heading_funct(dec_data): void {
    this.prepfunctItem(dec_data, "\n### ", "", "\n### heading text");
  }

  format_strikethrough_funct(dec_data): void {
    this.prepfunctItem(dec_data, " ~~", "~~ ", "~~strikethrough~~");
  }

  format_list_funct(dec_data): void {
    this.prepfunctItem(dec_data, "\n- ", "\n", "\n- list text\n");
  }

  format_code_funct(dec_data): void {
    this.prepfunctItem(dec_data, "\n```\n", "\n```\n", "\n```\ncode text\n```\n");
  }

  format_quote_funct(dec_data): void {
    this.prepfunctItem(dec_data, "\n> ", "\n", "\n> quote here\n");
  }

  format_table_funct(dec_data): void {
    const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(dec_data);
    const dsig = ' \
\n\
IP   | hostname | role | comments\n\
------|--------------|-------|---------------\n\
127.0.0.1 | localhost.localdomain | PROD | sql inj here\n\
255.255.255.255 | N/A | DMZ | much worst ;-)\n';

    this.decryptedReportDataChanged.report_vulns[index].poc = this.stringslice(this.decryptedReportDataChanged.report_vulns[index].poc, dsig, this.textarea_click);
    this.resetselectposition();
  }

  format_link_funct(dec_data): void {
    const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(dec_data);
    const dsig = '\n[enter link description here](https://vulnrepo.com/)\n';

    this.decryptedReportDataChanged.report_vulns[index].poc = this.stringslice(this.decryptedReportDataChanged.report_vulns[index].poc, dsig, this.textarea_click);
    this.resetselectposition();
  }

  poc_preview_funct(dec_data, id): void {

    // add Markdown rendering
    const renderer = new marked.Renderer();
    renderer.code = function (code, infostring, escaped) {
      const xx = `
          <code style="white-space: pre-wrap;word-wrap: break-word;">` + DOMPurify.sanitize(code) + `</code>
      `;
      return xx;
    };

    const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(dec_data);
    this.scopePreviewHTML[id] = marked.parse(this.decryptedReportDataChanged.report_vulns[index].poc, { renderer: renderer });
    this.poc_editor_hide[id] = !this.poc_editor_hide[id];
    this.prev_hide[id] = !this.prev_hide[id];
  }

  saveTemplate(dec_data): void {

    const dialogRef = this.dialog.open(DialogAddCustomTemplateComponent, {
      width: '800px',
      disableClose: false,
      data: {
        "title": dec_data.title,
        "poc": "",
        "desc": dec_data.desc,
        "severity": dec_data.severity,
        "ref": dec_data.ref,
        "cvss": dec_data.cvss,
        "cvss_vector": dec_data.cvss_vector,
        "cve": dec_data.cve
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The add custom template dialog was closed');
    });

  }

}
