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
  ReportProfilesList = [];
  scopePreviewHTML = [];
  RaportsTags = [];
  pok = 0;
  timerCounter = 0;
  savemsg = '';
  report_decryption_in_progress: boolean;
  report_encryption_in_progress: boolean;
  upload_in_progress = false;
  youhaveunsavedchanges = false;
  decryptedReportData: any;
  decryptedReportDataChanged: any;
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
 colorSchemeheat = {
  domain: ['#0e4429', '#006d32','#26a641', '#39d353']
};
  // options stats activity
  legend: boolean = true;
  animations: boolean = true;
  xAxis: boolean = true;
  yAxis: boolean = true;
  showYAxisLabel: boolean = true;
  showXAxisLabel: boolean = true;
  xAxisLabel: string = 'Severity';
  yAxisLabel: string = 'Timeline';
  timeline: boolean = true;

  multi = [];

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
    private snackBar: MatSnackBar) {

    // console.log(route);
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
    this.report_id = this.route.snapshot.params['report_id'];

    // check if report exist
    this.indexeddbService.checkifreportexist(this.report_id).then(data => {
      if (data) {
        console.log('Report exist: OK');
        this.report_info = data;
        this.reportdesc = data;
        // check if pass in sessionStorage
        if (sessionStorage.getItem(data.report_id) !== null) {
          this.report_decryption_in_progress = true;
          const pass = sessionStorage.getItem(data.report_id);
          this.indexeddbService.decrypt(pass, data.report_id).then(returned => {

            if (returned) {
              this.report_decryption_in_progress = false;
            }

          });
        } else {
          setTimeout(_ => this.openDialog(data)); // BUGFIX: https://github.com/angular/angular/issues/6005#issuecomment-165911194
        }

      } else {
        console.log('Report not exist locally: YES');
        this.indexeddbService.checkAPIreport(this.report_id).then(re => {
          if (re) {
            this.report_info = re;
            this.reportdesc = re;
            // check if pass in sessionStorage
            if (sessionStorage.getItem(re.report_id) !== null) {
              this.report_decryption_in_progress = true;
              const pass = sessionStorage.getItem(re.report_id);

              if (this.indexeddbService.decodeAES(re, pass)) {
                this.report_decryption_in_progress = false;
              }
            } else {
              setTimeout(_ => this.openDialog(re)); // BUGFIX: https://github.com/angular/angular/issues/6005#issuecomment-165911194
            }
          } else {
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
    const localkey = sessionStorage.getItem('VULNREPO-API');
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
      // console.log('ADDED: ',record);
      if (record.previousValue !== null) {
        this.afterDetection();
      }
    });

    changes.forEachChangedItem((record) => {
      // console.log('CHANGED: ',record);
      if (record.key !== 'report_version') {
        // console.log('Detection start');
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

    if (this.selected3.indexOf(true) !== -1) {
      this.pok = 1;
    } else {
      this.pok = 0;
    }

  }

  selectall() {
    this.selecteditems = [];
    this.selected3 = [];

    let i = 0;
    do {
      this.selected3.push(true);
      i++;
    }
    while (i < this.decryptedReportDataChanged.report_vulns.length);

  }

  deselectall() {
    this.selecteditems = [];
    this.selected3 = [];
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

  getheatmapData(critical, high, medium, low, info) {

    function getcri(item) {
      const groupBy = (items, key) => items.reduce(
        (result, item) => ({
          ...result,
          [item[key]]: [
            ...(result[item[key]] || []),
            item,
          ],
        }), 
        {},
      );

      let list = groupBy(item, 'date');

      const arrret = [];
      for (let key in list) {
        let value = list[key];
        arrret.push({ 
          "value": value.length, 
          "name": new Date(key)
        });
      }
      return arrret
      
    }

let rea = [
  {
    "name": "Critical",
    "series": getcri(critical)
  },
  {
    "name": "High",
    "series": getcri(high)
  },
  {
    "name": "Medium",
    "series": getcri(medium)
  },
  {
    "name": "Low",
    "series": getcri(low)
  },
  {
    "name": "Info",
    "series": getcri(info)
  }
];

    return rea
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
    
    this.multi = this.getheatmapData(critical, high, medium, low, info);

    this.listchangelog = this.decryptedReportData.report_changelog;
    this.dataSource = new MatTableDataSource(this.decryptedReportData.report_changelog);
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    setTimeout(() => this.dataSource.sort = this.sort);
    setTimeout(() => this.dataSource.paginator = this.paginator);

    // this.reportdesc.report_lastupdate = this.decryptedReportDataChanged.report_lastupdate;

  }

  addissue() {
    console.log('Add issue');
    const dialogRef = this.dialog.open(DialogAddissueComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      if (result.length !== undefined) {
        for (var elem of result) {
          if (elem.title !== '') {
            this.decryptedReportDataChanged.report_vulns.push(elem);
            this.addtochangelog('Create issue: ' + elem.title);
            this.afterDetectionNow();
            this.doStats();
          }
        }
      } else {
        if (result.title !== '') {
          this.decryptedReportDataChanged.report_vulns.push(result);
          this.addtochangelog('Create issue: ' + result.title);
          this.afterDetectionNow();
          this.doStats();
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
    const pass = sessionStorage.getItem(report_id);
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
      return (el.tags.length >0);
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
      if (result) {
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
    sessionStorage.setItem(report_id, pass);

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
# Create Date: ' + new Date(metadata.report_createdate).toLocaleString() + '\n\
# Last Update: ' + new Date(metadata.report_lastupdate).toLocaleString() + '\n';

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
        report_ascii_vulns = report_ascii_vulns + '# Find Date: ' + value.date + '\n';
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
      const stringToSplit = new Date(this.decryptedReportDataChanged.report_metadata.starttest).toLocaleString();
      const x = stringToSplit.split(',');
      const stringToSplit2 = new Date(this.decryptedReportDataChanged.report_metadata.endtest).toLocaleString();
      const y = stringToSplit2.split(',');
      str_dates = `
##### Start date: ` + x[0] + `
##### End date: ` + y[0] + `\n\n`;
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

        const stringToSplit = new Date(item.date).toLocaleString();
        const rdate = stringToSplit.split(',');

        str_changelog = str_changelog + rdate[0] + ` | ` + item.desc + `\n`;
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

  DownloadHTMLv2(report_info, encrypted, type_dep): void {

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
      { "filename": "dompurify/2.4.1/purify.min.js", "integrity": "sha512-uHOKtSfJWScGmyyFr2O2+efpDx2nhwHU2v7MVeptzZoiC7bdF6Ny/CmZhN2AwIK1oCFiVQQ5DA/L9FSzyPNu6Q==" }
    ];


    const ciphertext = Crypto.AES.encrypt(JSON.stringify(json), sessionStorage.getItem(report_info.report_id));

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

                of("jquery/3.6.3/jquery.min.js", "crypto-js/4.1.1/crypto-js.min.js", "bootstrap/5.2.3/js/bootstrap.bundle.min.js", "marked/4.2.5/marked.min.js", "dompurify/2.4.1/purify.min.js")
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

  DownloadHTML(report_data, report_metadata, issueStatus) {

    function escapeHtml(unsafe) {
      return unsafe.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function parse_newline(text) {
      return text.toString().replace(/(?:\r\n|\r|\n)/g, '<br>');
    }

    function statusDesc(status) {
      const ret = issueStatus.filter(function (el) {
        return (el.value === status);
      });
      return ret[0].status;
    }

    function parse_links(text) {
      const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
      // tslint:disable-next-line:no-shadowed-variable
      return text.replace(urlRegex, function (url) {
        return '<a target="_blank" href="' + url + '">' + url + '</a>';
      });
    }

    let report_html = `
    <html>
    <head>
    <meta charset="utf-8"/>
    <style>

    ` + this.report_css + `


    @import "compass/css3";
    * {
      padding: 0;
      margin: 0;
    }
    body {
      margin: 20 10 20 10;
    }
    .pagebreak { page-break-before: always; }


    .label {
      color: white;
      display: inline-block;
      font-family: verdana, sans-serif;
      padding: 4px;
    }
    /*critical*/
    .critical {
      border-color: #FF0039;
      background-color: #FF0039;
    }
    /*high*/
    .high {
      border-color: #FF7518;
      background-color: #FF7518;
    }
    /*medium*/
    .medium {
      color: #000;
      border-color: #F9EE06;
      background-color: #F9EE06;
    }
    /*low*/
    .low {
      border-color: #3FB618;
      background-color: #3FB618;
    }
    /*information*/
    .info {
      border-color: #2780E3;
      background-color: #2780E3;
    }
    .strbreak {
      word-break: break-word;
    }
    ul {
      list-style-position: inside;
    }
    .row {
      margin-left: 0px;
    }
    </style>
    </head>
    <body class="container">
    <br><br>`;

    // report settings
    const advlogo = report_data.report_settings.report_logo.logo;
    if (advlogo !== '') {
      const er = '<center><img src="' + escapeHtml(advlogo) + '" width="' + escapeHtml(report_data.report_settings.report_logo.width) + '" height="' + escapeHtml(report_data.report_settings.report_logo.height) + '"></center><br><br>';
      report_html = report_html + er;
    }

    const advhtml = report_data.report_settings.report_html;
    if (advhtml !== '') {
      this.advhtml = advhtml;
    }


    let intro = ' \
    <div id="row"> \
    <center> \
      <div class="card border-light mb-3" style="max-width: 30rem;"> \
        <div class="card-header">Security Report</div> \
        <div class="card-body"> \
        <h4 class="card-title">' + escapeHtml(report_metadata.report_name) + '</h4> \
        <p class="card-text">Report Version: ' + escapeHtml(report_data.report_version) + '</p> \
        <p class="card-text">Report ID: ' + escapeHtml(report_metadata.report_id) + '</p>';

    if (report_data.report_metadata.starttest !== '' && report_data.report_metadata.endtest !== '') {

      const stringToSplit = new Date(report_data.report_metadata.starttest).toLocaleString();
      const x = stringToSplit.split(',');

      const stringToSplit2 = new Date(report_data.report_metadata.endtest).toLocaleString();
      const y = stringToSplit2.split(',');

      // tslint:disable-next-line:max-line-length
      const cond0 = '<p class="card-text">Date: ' + escapeHtml(x[0]) + ' - ' + escapeHtml(y[0]) + '</p>';
      intro = intro + cond0;
    }

    const cond5 = ' \
        </div> \
      </div> \
    </center> \
    </div> \
    <br> \
    <br> \
    <br> \
    <div class="d-flex justify-content-center"><div style="width: 500px; text-align: center;" class="label Critical"><h2>CONFIDENTIAL</h2></div></div> \
    <div class="pagebreak"></div> \
    <br>';
    intro = intro + cond5;

    const tableofcontent_one = ' \
    <div id="row"> \
    <h2>Table of contents</h2> \
    <ul class="list-group">';

    let tableofcontentlist = '<li class="list-group-item d-flex justify-content-between align-items-center"> \
                                  <a href="#Scope">Scope</a> \
                              </li> \
                              <li class="list-group-item d-flex justify-content-between align-items-center"> \
                                  <a href="#Statistics and Risk">Statistics and Risk</a> \
                              </li> \
                              <li class="list-group-item d-flex justify-content-between align-items-center"> \
                                  <a href="#Results">Results (' + report_data.report_vulns.length + ')</a> \
                              </li>';

    report_data.report_vulns.forEach((item, index) => {
      let tags = '';
      if (report_data.report_settings.report_remove_issuetags === false) {
        if (item.tags.length > 0) {
          item.tags.forEach((ite, ind) => {
            tags = tags + '<span style="color: #fff" class="badge rounded-pill bg-dark">' + escapeHtml(ite.name) + '</span>&nbsp;';
          });

        }
      }

      tableofcontentlist = tableofcontentlist + ' \
      <li class="list-group-item d-flex justify-content-between align-items-center"> \
        <a href="#' + index + '"> \
          <span class="label ' + escapeHtml(item.severity) + '">' + escapeHtml(item.severity) + '</span> ' + escapeHtml(item.title) + ' \
        </a> \
        <span>' + tags + '</span> \
      </li>';

    });


    let summarycomment = '';
    if (report_data.report_summary !== '') {
      summarycomment = '<li class="list-group-item d-flex justify-content-between align-items-center"> \
      <a href="#Report summary comment">Report summary comment</a> \
  </li>';
    }

    let authors = '';
    if (report_data.report_settings.report_remove_researchers === false) {
      if (report_data.researcher.length > 0 && report_data.researcher[0].reportername !== '') {
        authors = '<li class="list-group-item d-flex justify-content-between align-items-center"> \
        <a href="#Report authors">Report authors</a> \
    </li>';
      }
    }

    let tableofcontent_1 = '';
    if (report_data.report_settings.report_changelog_page === false) {
      tableofcontent_1 = '<li class="list-group-item d-flex justify-content-between align-items-center"> \
      <a href="#Changelog">Changelog</a> \
  </li>';
    }

    const endtable = ' \
    </ul> \
    </div> \
    <br> \
    <div class="pagebreak"></div> \
    <br><br>';
    const tableofcontent = tableofcontent_one + tableofcontentlist + summarycomment + authors + tableofcontent_1 + endtable;

    const critical = report_data.report_vulns.filter(function (el) {
      return (el.severity === 'Critical');
    });

    const high = report_data.report_vulns.filter(function (el) {
      return (el.severity === 'High');
    });

    const medium = report_data.report_vulns.filter(function (el) {
      return (el.severity === 'Medium');
    });

    const low = report_data.report_vulns.filter(function (el) {
      return (el.severity === 'Low');
    });

    const info = report_data.report_vulns.filter(function (el) {
      return (el.severity === 'Info');
    });

    const stats = '<table class="table table-hover"> \
    <thead> \
      <tr> \
        <th>Severity</th> \
        <th>Number</th> \
      </tr> \
    </thead> \
    <tbody> \
      <tr> \
        <td><span class="label Critical">Critical</span></td> \
        <td>' + critical.length + '</td> \
      </tr> \
    <tr> \
        <td><span class="label High">High</span></td> \
        <td>' + high.length + '</td> \
      </tr> \
    <tr> \
        <td><span class="label Medium">Medium</span></td> \
        <td>' + medium.length + '</td> \
      </tr> \
    <tr> \
        <td><span class="label Low">Low</span></td> \
        <td>' + low.length + '</td> \
      </tr> \
    <tr> \
        <td><span class="label Info">Info</span></td> \
        <td>' + info.length + '</td> \
      </tr> \
    </tbody> \
  </table>';


    const risktable = '<table class="table table-hover"> \
<thead> \
  <tr> \
    <th colspan="5" class="text-center">Overall Risk Severity</th> \
  </tr> \
</thead> \
<tbody> \
  <tr> \
    <td rowspan="4" class="text-center"><b>Impact</b></td> \
  <td class="text-center" style="color: #EB7F30;"><b>HIGH</b></td> \
  <td class="text-center"><span style="width: 100%;" class="label Medium">Medium</span></td> \
  <td class="text-center"><span style="width: 100%;" class="label High">High</span></td> \
  <td class="text-center"><span style="width: 100%;" class="label Critical">Critical</span></td> \
  </tr> \
  <tr> \
  <td class="text-center" style="color: #FFFB01;"><b>MEDIUM</b></td> \
  <td class="text-center"><span style="width: 100%;" class="label Low">Low</span></td> \
  <td class="text-center"><span style="width: 100%;" class="label Medium">Medium</span></td> \
  <td class="text-center"><span style="width: 100%;" class="label High">High</span></td> \
  </tr> \
  <tr> \
  <td class="text-center" style="color: #91D054;"><b>LOW</b></td> \
  <td class="text-center"><span style="width: 100%;" class="label Info">Info</span></td> \
  <td class="text-center"><span style="width: 100%;" class="label Low">Low</span></td> \
  <td class="text-center"><span style="width: 100%;" class="label Medium">Medium</span></td> \
  </tr> \
  <tr> \
    <td>&nbsp;</td> \
  <td class="text-center" style="color: #91D054;"><b>LOW</b></td> \
  <td class="text-center" style="color: #FFFB01;"><b>MEDIUM</b></td> \
  <td class="text-center" style="color: #EB7F30;"><b>HIGH</b></td> \
  </tr> \
</tbody> \
<tfoot> \
  <tr> \
    <td>&nbsp;</td> \
  <td colspan="4" class="text-center"><b>Likelihood</b></td> \
  </tr> \
</tfoot> \
</table>';

    // add Markdown rendering
    const renderer = new marked.Renderer();
    renderer.table = function (header, body) {
      const table = `
          <table class="table">
              <thead>${header}</thead>
              <tbody>${body}</tbody>
          </table>
      `;
      return table;
    };
    const scopemarked = marked(report_data.report_scope, { renderer: renderer });

    // advanced text
    let projscope = '<h2 id="Scope">Scope</h2><p>' + DOMPurify.sanitize(scopemarked) + '</p>';

    if (this.advhtml !== '') {
      const reportHTMLmarked = marked(this.advhtml, { renderer: renderer });
      projscope = projscope + '<br>' + DOMPurify.sanitize(reportHTMLmarked) + '<br>';
    }

    const statsandrisk = '<h2 id="Statistics and Risk">Statistics and Risk</h2> \
    <p>' + stats + '</p><br>  \
    <p>The risk of application security vulnerabilities discovered during an assessment will be rated according to a custom-tailored version the <a target="_blank" href="https://www.owasp.org/index.php/OWASP_Risk_Rating_Methodology">OWASP Risk Rating Methodology</a>. \
    Risk severity is determined based on the estimated technical and business impact of the vulnerability, and on the estimated likelihood of the vulnerability being exploited:<br><br> \
    ' + risktable + '<br>Our Risk rating is based on this calculation: <b>Risk = Likelihood * Impact</b>.</p><div class="pagebreak"></div><br>';

    const advtext = projscope + statsandrisk;

    let issues = '<div class="card border-light mb-3"><div class="card-header"><center><h3 id="Results">Results (' + report_data.report_vulns.length + ')</h3></center></div><div class="card-body">';
    report_data.report_vulns.forEach((item, index) => {

      let iscve = '';
      if (report_data.report_settings.report_remove_issuecve === false) {
        if (item.cve) {
          iscve = '<dt>CVE:</dt> \
          <dd>' + item.cve + '</dd><br>';
        }
      }

      let iscvss = '';
      if (report_data.report_settings.report_remove_issuecvss === false) {
        if (item.cvss) {
          iscvss = '<dt>CVSS v3.1 (Base score):</dt> \
          <dd>' + item.cvss + '</dd><br>';
        }
      }

      let issstatus = '';
      if (report_data.report_settings.report_remove_issuestatus === false) {
        if (item.status) {
          issstatus = '<dt>Status:</dt> \
          <dd>' + statusDesc(item.status) + '</dd><br>';
        }
      }


      let issuetags = '';
      if (report_data.report_settings.report_remove_issuetags === false) {
        if (item.tags.length > 0) {
          let tags = '';
          item.tags.forEach((ite, ind) => {
            tags = tags + '<span style="color: #fff" class="badge rounded-pill bg-dark">' + escapeHtml(ite.name) + '</span>&nbsp;';
          });

          issuetags = '<dt>TAGs:</dt> \
          <dd>' + tags + '</dd><br>';

        }
      }

      let desc = '';
      if (report_data.report_settings.report_parsing_desc === false) {
        desc = '<dt>Description:</dt> \
        <dd class="strbreak">' + escapeHtml(item.desc) + '</dd><br>';
      } else {
        desc = '<dt>Description:</dt> \
        <dd class="strbreak">' + parse_newline(escapeHtml(item.desc)) + '</dd><br>';
      }

      issues = issues + ' \
      <div class="row"> \
      <h4 id="' + index + '"> \
      <span class="label ' + escapeHtml(item.severity) + '">' + escapeHtml(item.severity) + '</span> \
      ' + escapeHtml(item.title) + '</h4> \
        <dl>' + iscve + iscvss + issstatus + desc;



      if (item.poc !== '' || item.files.length !== 0) {
        let ewe = '';
        if (report_data.report_settings.report_parsing_poc_markdown === true) {

          ewe = ' \
              <dt>Proof of Concept:</dt> \
              <dd class="strbreak"> \
              <div style="white-space: pre-wrap;">' + DOMPurify.sanitize(marked.parse(item.poc)) + '</div>';

        } else {
          ewe = ' \
              <dt>Proof of Concept:</dt> \
              <dd class="strbreak"> \
              <div style="white-space: pre-wrap;">' + escapeHtml(item.poc) + '</div>';
        }

        let fil = '';
        item.files.forEach((ite, ind) => {


          let shac = '';
          if (ite.sha256checksum) {
            shac = '<br><small>(SHA256 File Checksum: ' + escapeHtml(ite.sha256checksum) + ')</small>';
          }

          let fsize = '';
          if (ite.size) {
            fsize = '&nbsp;<small>(Size: ' + escapeHtml(ite.size) + ' bytes)</small>';
          }

          if (ite.type.includes('image')) {
            // tslint:disable-next-line:max-line-length
            fil = fil + '<b>Attachment: <i>' + escapeHtml(ite.title) + '</i></b>' + fsize + shac + '<br><img src="' + escapeHtml(ite.data) + '" title="' + escapeHtml(ite.title) + '" class="img-fluid"><br><br>';
          } else if (ite.type === 'video/mp4' || ite.type === 'video/ogg' || ite.type === 'video/webm') {
            if (report_data.report_settings.report_video_embed === true) {
              // tslint:disable-next-line:max-line-length
              fil = fil + '<b>Attachment: <i>' + escapeHtml(ite.title) + '</i></b>' + fsize + shac + '<br><video width="100%" height="600" controls><source src="' + escapeHtml(ite.data) + '" type="' + escapeHtml(ite.type) + '">Your browser does not support the video tag.</video><br><br>';
            }
            if (report_data.report_settings.report_video_embed === false) {
              fil = fil + '<b>Attachment: <a href="' + escapeHtml(ite.data) + '" download="' + escapeHtml(ite.title) + '"><i>' + escapeHtml(ite.title) + '</i></a></b>' + fsize + shac + '<br><br>';
            }
          } else if (ite.type === 'text/plain') {
            const byteString = atob(ite.data.split(',')[1]);
            // tslint:disable-next-line:max-line-length
            fil = fil + '<b>Attachment: <i>' + escapeHtml(ite.title) + '</i></b>' + fsize + shac + '<br><b>[file content]:</b><pre style="white-space: pre-wrap;">' + escapeHtml(byteString) + '</pre><br><br>';
          } else {
            fil = fil + '<b>Attachment: <a href="' + escapeHtml(ite.data) + '" download="' + escapeHtml(ite.title) + '"><i>' + escapeHtml(ite.title) + '</i></a></b>' + fsize + shac + '<br><br>';
          }

        });

        const ewe2 = '</dd><br>';
        issues = issues + ewe + fil + ewe2;
      }

      if (item.ref !== '') {
        const reference_item = ' \
            <dt>References:</dt> \
            <dd class="strbreak">' + parse_links(parse_newline(escapeHtml(item.ref))) + '</dd><br>';
        issues = issues + issuetags + reference_item;
      }

      const end_issues = '</dl></div>';
      issues = issues + end_issues;
    });

    issues = issues + '</div></div><div class="pagebreak"></div>';

    let summarycomment_value = '';
    if (report_data.report_summary !== '') {
      // tslint:disable-next-line:max-line-length
      summarycomment_value = '<h2 id="Report summary comment">Report summary comment</h2><p>' + parse_newline(escapeHtml(report_data.report_summary)) + '</p><br>';
    }


    let authors_value = '';
    if (report_data.researcher.length > 0 && report_data.researcher[0].reportername !== '') {
      if (report_data.report_settings.report_remove_researchers === false) {

        let aut = '';

        report_data.researcher.forEach((ite, ind) => {

          if (ite.reportername !== '') {
            aut = aut + '<i class="bi bi-alarm"></i><div class="col-lg-4"> \
            <figure>\
              <blockquote class="blockquote">' + (ite.reportername !== '' ? '<p class="mb-0">' + escapeHtml(ite.reportername) + '</p>' : '') + '</blockquote>\
              ' + (ite.reporteremail !== '' ? '<figcaption class="blockquote-footer">E-Mail: <cite>' + escapeHtml(ite.reporteremail) + '</cite></figcaption>' : '') + '\
              ' + (ite.reportersocial !== '' ? '<figcaption class="blockquote-footer">Social: <cite>' + parse_links(escapeHtml(ite.reportersocial)) + '</cite></figcaption>' : '') + '\
              ' + (ite.reporterwww !== '' ? '<figcaption class="blockquote-footer">WWW: <cite>' + parse_links(escapeHtml(ite.reporterwww)) + '</cite></figcaption>' : '') + '\
            </figure>\
            </div>';
          }
        });

        // tslint:disable-next-line:max-line-length
        authors_value = '<h2 id="Report authors">Report authors</h2><p><div class="row">' + aut + '</div></p><br>';

      }

    }


    let changeloghtml = '';
    if (report_data.report_settings.report_changelog_page === false) {

      changeloghtml = summarycomment_value + '<h2 id="Changelog">Changelog</h2> \
      <p><table class="table table-hover"> \
      <thead> \
        <tr> \
          <th>Date</th> \
        <th>Description</th> \
        </tr> \
      </thead> \
      <tbody>';

      report_data.report_changelog.forEach((item, index) => {

        changeloghtml = changeloghtml + '<tr> \
      <td>' + escapeHtml(new Date(item.date).toLocaleString()) + '</td> \
      <td>' + escapeHtml(item.desc) + '</td> \
      </tr>';
      });
      changeloghtml = changeloghtml + '</tbody></table></p>';

    }

    let report_gen_info = '';
    if (report_data.report_settings.report_remove_lastpage === false) {
      report_gen_info = `<div class="pagebreak"></div>
  <p>Generated by <a href="https://vulnrepo.com/">VULNRΞPO</a></p>
  `;
    }

    const report_close = '</body></html>';

    // tslint:disable-next-line:max-line-length
    const download_report_complete = report_html + intro + tableofcontent + advtext + issues + authors_value + changeloghtml + report_gen_info + report_close;

    // download HTML report
    const blob = new Blob([download_report_complete], { type: 'text/html' });
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', report_metadata.report_name + ' ' + report_metadata.report_id + ' HTML (vulnrepo.com).html');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  }

  checksumfile(dataurl, files, dec_data) {
    let file_sha2 = '';
    // sha256 file checksum
    const reader = new FileReader();
    reader.onloadend = (e) => {
      file_sha2 = sha256(reader.result);
      this.proccessUpload(dataurl, files[0].name, files[0].type, files[0].size, file_sha2, dec_data);
    };
    reader.readAsArrayBuffer(files[0]);

  }

  proccessUpload(data, name, type, size, sha256check, dec_data) {

    const index: number = this.decryptedReportDataChanged.report_vulns.indexOf(dec_data);
    const today: number = Date.now();

    function escapeHtml(unsafe) {
      return unsafe.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    this.upload_in_progress = false;
    const linkprev = data;
    // tslint:disable-next-line:max-line-length
    this.decryptedReportDataChanged.report_vulns[index].files.push({ 'data': linkprev, 'title': escapeHtml(name), 'type': escapeHtml(type), 'size': size, 'sha256checksum': sha256check, 'date': today });
    this.afterDetectionNow();

  }

  uploadAttach(input: HTMLInputElement, dec_data) {

    const files = input.files;
    if (files && files.length) {
      this.upload_in_progress = true;
      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        this.checksumfile(fileReader.result, files, dec_data);
      };
      fileReader.readAsDataURL(fileToRead);

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
    this.decryptedReportDataChanged.report_settings.report_logo.logo_name = name;
    this.decryptedReportDataChanged.report_settings.report_logo.logo_type = type;
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
  }

  savenewReportProfile() {
    const time = new Date().toLocaleString();
    const profile = {
      profile_name: time,
      logo: this.decryptedReportDataChanged.report_settings.report_logo.logo,
      logow: this.decryptedReportDataChanged.report_settings.report_logo.width,
      logoh: this.decryptedReportDataChanged.report_settings.report_logo.height,
      report_parsing_desc: this.decryptedReportDataChanged.report_settings.report_parsing_desc,
      report_parsing_poc_markdown: this.decryptedReportDataChanged.report_settings.report_parsing_poc_markdown,
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

}
