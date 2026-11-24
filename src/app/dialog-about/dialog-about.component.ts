import { Component, OnInit, OnDestroy, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { version } from "../../version";
import { PwaService } from '../pwa.service';

@Component({
  standalone: false,
  //imports: [],
  selector: 'app-dialog-about',
  templateUrl: './dialog-about.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dialog-about.component.scss']
})
export class DialogAboutComponent implements OnInit, OnDestroy {

  app_ver = '';
  app_ver_short = '';

  /** app shell is precached, so the app can be opened with no network */
  offline_ready = false;
  /** a newer build is already cached and waiting for a reload */
  update_ready = false;
  /** an update check is in flight */
  checking = false;
  offlineStatus = 'Not available';

  private subs = new Subscription();

  constructor(public dialogRef: MatDialogRef<DialogAboutComponent>, private pwa: PwaService) {

  }


  ngOnInit() {
    this.app_ver = version.number;

    if (this.app_ver !== ''){
      this.app_ver_short = this.app_ver.substring(0, 7)
    } else {
      this.app_ver_short = 'N/A';
    }

    this.subs.add(this.pwa.offlineReady$.subscribe(v => {
      this.offline_ready = v;
      this.refreshStatus();
    }));
    this.subs.add(this.pwa.updateReady$.subscribe(v => {
      this.update_ready = v;
      this.refreshStatus();
    }));
  }

  private refreshStatus(): void {
    if (this.update_ready) {
      this.offlineStatus = 'New build cached — reload to apply';
    } else if (this.offline_ready) {
      this.offlineStatus = 'App shell cached — tap to check for updates';
    } else {
      this.offlineStatus = 'Not available on this origin';
    }
  }

  async checkUpdate(): Promise<void> {
    if (!this.offline_ready || this.checking) return;
    this.checking = true;
    this.offlineStatus = 'Checking for a newer build…';
    const found = await this.pwa.checkForUpdate();
    this.checking = false;
    if (!found) {
      this.offlineStatus = 'Up to date';
    } else {
      // updateReady$ fires separately once the new build finishes downloading
      this.refreshStatus();
    }
  }

  closedialog(): void {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

}
