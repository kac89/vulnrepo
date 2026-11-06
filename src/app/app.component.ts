import { Component, OnInit, OnDestroy, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { IndexeddbService } from './indexeddb.service';
import { Router, NavigationEnd } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Subscription, combineLatest, interval } from 'rxjs';
import { startWith, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { SessionstorageserviceService } from "./sessionstorageservice.service"
import { KeyVaultService } from './key-vault.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogAboutComponent } from './dialog-about/dialog-about.component';
import { DialogOllamaComponent } from './dialog-ollama/dialog-ollama.component';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';

/** the two captions the status badge resolves between — same length, so the pill never reflows */
const STATUS_ENCRYPTED = 'Report encrypted';
const STATUS_DECRYPTED = 'Report decrypted';
/** alphabet the caption churns through while it is still ciphertext */
const CIPHER_GLYPHS = '01ABCDEF#$%&/\\<>[]{}*+=~^!?';
const SCRAMBLE_TICK_MS = 24;
/** frames each character churns before it locks into place */
const SCRAMBLE_FRAMES_PER_CHAR = 2;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
})

export class AppComponent implements OnInit, OnDestroy {
  show_status: any;
  enc_status: any;
  /** transient class driving the one-shot badge pulse on an encryption state flip */
  statusPulse: 'decrypted' | 'encrypted' | null = null;
  /** badge caption, churned through the cipher alphabet by scrambleStatus() */
  statusLabel = STATUS_ENCRYPTED;
  /** true while the caption is mid-churn; lights it up via .status-churn */
  statusChurn = false;
  private scrambleTimer: any = null;
  status_unsaved = false;
  report_id: any;
  subscription: Subscription;
  getunsavedchang: Subscription;
  show_active_reports = false;
  arr_oreports: any = [];
  dialogRef: MatDialogRef<DialogAboutComponent>;
  lockSecondsRemaining: number | null = null;
  private keyVaultSub: Subscription;
  private lockTimerSub: Subscription;
  private lockWarningSub: Subscription;
  private lockWarningSnackRef: MatSnackBarRef<TextOnlySnackBar> | null = null;

  @HostListener('window:keydown.control.shift.y', ['$event'])
  GoToNewReport(event: KeyboardEvent) {
    event.preventDefault();
    this.router.navigate(['/new-report']);
  }

  @HostListener('window:keydown.control.shift.u', ['$event'])
  GoToSettings(event: KeyboardEvent) {
    event.preventDefault();
    this.router.navigate(['/my-reports']);
  }

  constructor(public route: ActivatedRoute, private snackBar: MatSnackBar, public router: Router, public sessionsub: SessionstorageserviceService, private indexeddbService: IndexeddbService, public dialog: MatDialog, private keyVault: KeyVaultService) {
    this.keyVaultSub = this.keyVault.change$.subscribe(() => {
      this.getopenreports();
    });

    this.lockTimerSub = this.keyVault.idleResetAt$.pipe(
      switchMap(resetAt => {
        if (resetAt === null) return of(null);
        return interval(1000).pipe(
          startWith(0),
          map(() => Math.max(0, Math.floor((resetAt - Date.now()) / 1000)))
        );
      })
    ).subscribe(secs => { this.lockSecondsRemaining = secs; });

    this.lockWarningSub = this.keyVault.warning$.subscribe(show => {
      if (show) {
        this.showLockWarning();
      } else {
        this.dismissLockWarning();
      }
    });

    this.getunsavedchang = this.indexeddbService.getchangesStatus().subscribe(value => {
      // Defer to next microtask: emitters can fire synchronously from a child
      // component's event handler during change detection (e.g. report editors
      // calling sureYouWanttoLeave()). Writing here in-pass would race the
      // parent's [class.has-unsaved] binding and throw
      // ExpressionChangedAfterItHasBeenCheckedError.
      queueMicrotask(() => { this.status_unsaved = value; });
    });
  }

  private showLockWarning(): void {
    this.dismissLockWarning();
    this.lockWarningSnackRef = this.snackBar.open(
      'Auto-lock in 30 seconds',
      'Stay unlocked',
      { duration: 30000 }
    );
    this.lockWarningSnackRef.onAction().subscribe(() => {
      this.keyVault.extendSession();
    });
    this.lockWarningSnackRef.afterDismissed().subscribe(() => {
      this.lockWarningSnackRef = null;
    });
  }

  private dismissLockWarning(): void {
    if (this.lockWarningSnackRef) {
      this.lockWarningSnackRef.dismiss();
      this.lockWarningSnackRef = null;
    }
  }

  ngOnInit() {
    this.show_active_reports = false;

    const db = window.indexedDB.open('testindexeddb');
    db.onerror = () => {
      console.error('Your browser doesn\'t support a stable version of IndexedDB. Try use latest modern browser and not in private browsing mode! Note: In private browsing mode, most data storage is not supported.');
    };

    if (!window.indexedDB) {
      console.error('Your browser doesn\'t support a stable version of IndexedDB.');
    }
    if (!window.sessionStorage) {
      console.error('Your browser doesn\'t support a stable version of sessionStorage.');
    }

    this.subscription = this.indexeddbService.getstatusencryption().subscribe(value => {
      if (!!this.enc_status !== !!value) {
        this.statusPulse = value ? 'decrypted' : 'encrypted';
        this.scrambleStatus(value ? STATUS_DECRYPTED : STATUS_ENCRYPTED);
      }
      this.enc_status = value;
    });

    this.router.events.subscribe(value => {
      if (value instanceof NavigationEnd) {
        this.report_id = value.url;
        if (value.url.includes('/report/')) {
          this.show_status = true;
        } else {
          this.show_status = false;
          this.enc_status = false;
          this.stopScramble();
          this.statusLabel = STATUS_ENCRYPTED;
        }
      }
    });

    this.getopenreports();

  }




  // the badge pulse is a one-shot CSS animation; drop the class once it has played
  // so the next state flip can re-trigger it (the persistent `status-breathe` halo
  // loops forever and so never reports animationend)
  onStatusPulseEnd(event: AnimationEvent) {
    if (event.animationName.startsWith('status-pulse')) {
      this.statusPulse = null;
    }
  }

  // The caption is the ciphertext: every character churns through CIPHER_GLYPHS and the
  // string resolves left to right, one more character locking every
  // SCRAMBLE_FRAMES_PER_CHAR frames. Both captions are 16 characters and the label is set
  // in a monospace face, so the pill holds its width for the whole run (~790ms).
  private scrambleStatus(target: string) {
    this.stopScramble();

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.statusLabel = target;
      return;
    }

    this.statusChurn = true;
    let frame = 0;
    const lastFrame = target.length * SCRAMBLE_FRAMES_PER_CHAR;

    this.scrambleTimer = setInterval(() => {
      const locked = Math.floor(frame / SCRAMBLE_FRAMES_PER_CHAR);
      let out = '';
      for (let i = 0; i < target.length; i++) {
        if (i < locked || target[i] === ' ') {
          out += target[i];
        } else {
          out += CIPHER_GLYPHS[(Math.random() * CIPHER_GLYPHS.length) | 0];
        }
      }
      this.statusLabel = out;

      if (++frame > lastFrame) {
        this.stopScramble();
        this.statusLabel = target;
      }
    }, SCRAMBLE_TICK_MS);
  }

  private stopScramble() {
    if (this.scrambleTimer !== null) {
      clearInterval(this.scrambleTimer);
      this.scrambleTimer = null;
    }
    this.statusChurn = false;
  }

  closeReport() {
    console.log('close report');

    const report_id = this.report_id.substring(this.report_id.lastIndexOf("/") + 1, this.report_id.length);

    if (this.status_unsaved) {

      console.log('unsaved changes');

      this.snackBar.open('You have unsaved changes!', 'OK', {
        duration: 2000,
        panelClass: ['notify-snackbar-fail']
      });

    } else {

      this.keyVault.remove(report_id);
      window.location.reload();

    }



  }

  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.subscription.unsubscribe();
    this.getunsavedchang.unsubscribe();
    if (this.keyVaultSub) this.keyVaultSub.unsubscribe();
    if (this.lockTimerSub) this.lockTimerSub.unsubscribe();
    if (this.lockWarningSub) this.lockWarningSub.unsubscribe();
    this.stopScramble();
    this.dismissLockWarning();
  }

  formatLockTimer(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  goAbout(): void {

    const dialogRef = this.dialog.open(DialogAboutComponent, {
      width: '500px',
      panelClass: 'about-dialog-panel',
      backdropClass: 'vr-blur-backdrop',
      disableClose: false,
      data: []
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The CVSS dialog was closed');
    });

  }

  goAI(): void {

    const dialogRef = this.dialog.open(DialogOllamaComponent, {
      width: '1040px',
      maxWidth: '90vw',
      panelClass: 'ollama-dialog-panel',
      backdropClass: 'vr-blur-backdrop',
      disableClose: true,
      data: []
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The AI dialog was closed');
    });

  }


  getopenreports() {
    this.arr_oreports = [];
    this.show_active_reports = false;

    const openIds = this.keyVault.openReportIds();

    for (const report_id of openIds) {
      this.indexeddbService.checkifreportexist(report_id).then(data => {
        if (data) {
          this.show_active_reports = true;
          this.arr_oreports.push({ "report_id": data.report_id, "report_name": data.report_name });
        }

        const localkey = this.keyVault.getApiVault();
        if (localkey) {

          const vaultobj = JSON.parse(localkey);
          vaultobj.forEach((element) => {

            this.indexeddbService.checkAPIreport_single(report_id, element.value, element.apikey).then(data => {
              if (data) {
                this.show_active_reports = true;
                this.arr_oreports.push({ "report_id": data.report_id, "report_name": data.report_name, "report_source": 'api' });
              }
            });

          });

        }

      });
    }

    this.arr_oreports = [...this.arr_oreports.reduce((map, obj) => map.set(obj.report_id, obj), new Map()).values()];

  }

}
