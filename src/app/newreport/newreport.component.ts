import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { IndexeddbService } from '../indexeddb.service';
import { SeckeyValidatorService } from '../seckey-validator.service';
import { ThemePalette } from '@angular/material/core';
import { ProgressBarMode } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import { DialogApikeyComponent } from '../dialog-apikey/dialog-apikey.component';
import { MatDialog } from '@angular/material/dialog';
import { AbstractControl, UntypedFormControl, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { SessionstorageserviceService } from "../sessionstorageservice.service"
import { KeyVaultService } from '../key-vault.service';
import { UtilsService } from '../utils.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';

// SeckeyValidatorService grades a key 0-4 (Short, Common, Weak, Ok, Strong).
// Its PasswordCheckStrength is a `const enum`, which cannot be imported across
// files under the esbuild pipeline, so the levels this screen gates on are
// named here instead of referenced by number in five places.
const STRENGTH = { SHORT: 0, COMMON: 1, WEAK: 2, OK: 3, STRONG: 4 };

// A destination is "where this report's bytes end up": this browser's
// IndexedDB, or one of the vulnrepo servers whose credentials are in the open
// API vault. It is always rendered, including when there is exactly one — a
// first-time user otherwise never learns the report lives in this one browser.
interface Destination {
  id: string;
  label: string;
  hint: string;
  apiurl: string;
  apikey: string;
}

@Component({
  standalone: false,
  selector: 'app-newreport',
  templateUrl: './newreport.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./newreport.component.scss']
})
export class NewreportComponent implements OnInit {

  // 32 chars from the CSPRNG is already past anything the KDF can be pushed
  // on. Longer keys only make the one thing the user MUST do by hand — move
  // the key somewhere safe — harder.
  readonly KEY_LENGTH = 32;
  readonly MIN_LENGTH = SeckeyValidatorService.MinimumLength;

  // 'generated' is the default: the key exists before the user has typed
  // anything, so the page opens on the step that matters and the strength
  // meter is never in an empty state. 'own' is the escape hatch, and the only
  // mode where a confirm field earns its place.
  keyMode: 'generated' | 'own' = 'generated';
  // Masked until asked for: Copy and Download move the key without it ever
  // being on screen, so revealing it is a choice the user makes about their
  // surroundings, not the default the page imposes on them.
  revealKey = false;
  revealOwnKey = false;

  submitted = false;
  creating = false;
  keyCopied = false;
  keyDownloaded = false;
  cancelArmed = false;

  // Strength, from the key control only. Both fields used to write these, so a
  // single character typed into "confirm" dropped a strong key to "Too short".
  color: ThemePalette = 'warn';
  mode: ProgressBarMode = 'determinate';
  value = 0;
  str = '';
  strengthClass = '';

  // Key criteria, shown instead of a bare colour the user has to decode.
  criteria = {
    length: false,
    mixedcase: false,
    digitsymbol: false,
    nospaces: true
  };

  destinations: Destination[] = [];
  localReportCount = 0;
  storageBytes = 0;

  profiles: any[] = [];
  profilesLoading = false;
  profilesError = '';
  private localProfiles: any[] = [];
  private remoteProfiles: any[] = [];
  private failedEndpoints: string[] = [];

  form = new UntypedFormGroup({
    title: new UntypedFormControl('', [Validators.required]),
    key: new UntypedFormControl('', [Validators.required]),
    confirm: new UntypedFormControl(''),
    saved: new UntypedFormControl(false, [Validators.requiredTrue]),
    destination: new UntypedFormControl('local'),
    profile: new UntypedFormControl(null)
  });

  constructor(private indexeddbService: IndexeddbService, private passwordService: SeckeyValidatorService,
    private apiService: ApiService, public dialog: MatDialog, public router: Router,
    public sessionsub: SessionstorageserviceService, private utilsService: UtilsService,
    private keyVault: KeyVaultService, private snackBar: MatSnackBar, private clipboard: Clipboard) {

    this.form.get('key')!.setValidators([Validators.required, NewreportComponent.noSpaces, this.strongEnough]);
    this.form.get('confirm')!.setValidators(this.keysMatch);
  }

  ngOnInit() {

    // Strength and criteria follow the value, not the keystroke: (keyup) never
    // fired for a right-click paste or for the generator writing the field.
    this.form.get('key')!.valueChanges.subscribe((v: string) => {
      this.passCheck(v || '');
      // A new key voids the acknowledgement that the old one was saved.
      if (this.form.get('saved')!.value) {
        this.form.get('saved')!.setValue(false);
      }
      this.form.get('confirm')!.updateValueAndValidity({ emitEvent: false });
    });

    this.generateKey(false);
    this.buildDestinations();
    this.loadLocalStats();

    this.indexeddbService.retrieveReportProfile().then(ret => {
      if (ret) {
        this.localProfiles = ret;
        this.profiles = [...this.localProfiles, ...this.remoteProfiles];
      }
      this.loadRemoteProfiles();
    });

  }

  // ── Validators ─────────────────────────────────────────────────────────────
  // The save path in IndexeddbService refuses any key containing whitespace.
  // That used to be a console.log and a silent return: the click did nothing,
  // and the strength meter happily rated such a key "Strong" because it counts
  // a space as a special character. Same predicate, enforced here, at type time.
  static noSpaces(c: AbstractControl): ValidationErrors | null {
    return /\s/.test(c.value || '') ? { whitespace: true } : null;
  }

  private strongEnough = (c: AbstractControl): ValidationErrors | null => {
    const v: string = c.value || '';
    if (!v) { return null; }
    if (v.length < this.MIN_LENGTH) { return { tooweakpass: true }; }
    if (this.passwordService.checkPasswordStrength(v) < STRENGTH.OK) { return { tooweakpass: true }; }
    return null;
  }

  // On the confirm control rather than the group: a mat-error only renders
  // when the field's own control is in an error state, so a group-level
  // mismatch error was never shown to anyone.
  private keysMatch = (c: AbstractControl): ValidationErrors | null => {
    if (this.keyMode !== 'own') { return null; }
    const key = this.form.get('key')!.value;
    if (!key || !c.value) { return null; }
    return key === c.value ? null : { passnotmatch: true };
  }

  // ── The key ────────────────────────────────────────────────────────────────

  // reveal: a key the user asked for is shown, because the click is the ask —
  // they are looking at the field. The key minted on page load is not asked
  // for, so it stays masked and the page never puts a secret on screen before
  // anyone requested it.
  generateKey(reveal = true) {
    this.form.get('key')!.setValue(this.utilsService.generatePassword(this.KEY_LENGTH));
    this.form.get('confirm')!.setValue('');
    this.keyCopied = false;
    this.keyDownloaded = false;
    if (reveal) {
      this.revealKey = true;
    }
  }

  useOwnKey() {
    this.keyMode = 'own';
    this.form.get('key')!.setValue('');
    this.form.get('confirm')!.setValue('');
    this.revealOwnKey = false;
    this.keyCopied = false;
    this.keyDownloaded = false;
    this.submitted = false;
    this.form.get('key')!.markAsUntouched();
    this.form.updateValueAndValidity();
  }

  useGeneratedKey() {
    this.keyMode = 'generated';
    this.submitted = false;
    this.generateKey();
    this.form.updateValueAndValidity();
  }

  // Display only — the key itself never carries the spaces, because a key with
  // whitespace is exactly what the save path rejects.
  get groupedKey(): string {
    const k: string = this.form.get('key')!.value || '';
    return (k.match(/.{1,8}/g) || []).join(' ');
  }

  copyKey() {
    const key = this.form.get('key')!.value;
    if (!key) { return; }
    this.clipboard.copy(key);
    this.keyCopied = true;
    this.snackBar.open('Key copied to clipboard', 'OK', {
      duration: 2500,
      panelClass: ['notify-snackbar-success']
    });
  }

  // A key held only in this tab's in-memory vault is one closed tab away from
  // gone. Offer the user a file before that happens, not after.
  downloadKey() {
    const key = this.form.get('key')!.value;
    if (!key) { return; }

    const title: string = (this.form.get('title')!.value || '').trim();
    const body = [
      'VULNREPO — report encryption key',
      '',
      'Report:  ' + (title || '(unnamed report)'),
      'Created: ' + new Date().toISOString(),
      '',
      'Key: ' + key,
      '',
      'This key is the only way to decrypt the report. It is not stored by',
      'vulnrepo, it is never sent anywhere, and it cannot be reset or',
      'recovered. Keep this file in a password manager or another safe place.',
      ''
    ].join('\n');

    const slug = (title || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    const stamp = new Date().toISOString().slice(0, 10);

    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vulnrepo-key-' + (slug || 'report') + '-' + stamp + '.txt';
    a.click();
    URL.revokeObjectURL(url);

    this.keyDownloaded = true;
  }

  passCheck(pass: string) {

    this.criteria = {
      length: pass.length >= this.MIN_LENGTH,
      mixedcase: /[a-z]/.test(pass) && /[A-Z]/.test(pass),
      digitsymbol: /[0-9]/.test(pass) && /[^a-zA-Z0-9]/.test(pass),
      nospaces: !/\s/.test(pass)
    };

    if (!pass) {
      this.str = '';
      this.strengthClass = '';
      this.value = 0;
      this.color = 'warn';
      return;
    }

    switch (this.passwordService.checkPasswordStrength(pass)) {
      case STRENGTH.SHORT:
        this.set('Too short', 'tooshort', 20, 'warn');
        break;
      case STRENGTH.COMMON:
        this.set('Common', 'common', 40, 'warn');
        break;
      case STRENGTH.WEAK:
        this.set('Weak', 'weak', 60, 'warn');
        break;
      case STRENGTH.OK:
        this.set('OK', 'itsok', 80, 'accent');
        break;
      case STRENGTH.STRONG:
        this.set('Strong', 'strong', 100, 'accent');
        break;
    }

  }

  private set(label: string, cls: string, value: number, color: ThemePalette) {
    this.str = label;
    this.strengthClass = cls;
    this.value = value;
    this.color = color;
  }

  // The gate is stated, not guessed at: whatever is still missing is named
  // next to the button, and the button reveals the same errors on the fields.
  get missing(): string[] {
    const out: string[] = [];
    if (this.form.get('key')!.invalid || this.form.get('confirm')!.invalid) { out.push('a key strong enough to use'); }
    if (!this.form.get('saved')!.value) { out.push('confirmation that you saved the key'); }
    if (this.form.get('title')!.invalid) { out.push('a report name'); }
    return out;
  }

  get stepsReady(): number {
    let n = 0;
    if (this.form.get('key')!.valid && this.form.get('confirm')!.valid && this.form.get('saved')!.value) { n++; }
    if (this.form.get('title')!.valid) { n++; }
    n++; // destination always has a valid answer
    return n;
  }

  // ── Destination and templates ──────────────────────────────────────────────

  private buildDestinations() {
    const local: Destination = {
      id: 'local',
      label: 'This browser',
      hint: 'IndexedDB',
      apiurl: '',
      apikey: ''
    };

    const remote: Destination[] = [];
    const vault = this.keyVault.getApiVault();
    if (vault) {
      JSON.parse(vault).forEach((ep: any) => {
        remote.push({
          id: ep.value,
          label: ep.viewValue || ep.value,
          hint: ep.value,
          apiurl: ep.value,
          apikey: ep.apikey
        });
      });
    }

    this.destinations = [local, ...remote];

    // Unlocking the vault mid-page rebuilds the list; keep the user's pick if
    // it is still on it.
    if (!this.destinations.some(d => d.id === this.form.get('destination')!.value)) {
      this.form.get('destination')!.setValue('local');
    }
  }

  private async loadLocalStats() {
    try {
      const reports = await this.indexeddbService.getReports();
      this.localReportCount = (reports || []).length;
    } catch { /* a count is a nicety; the page works without it */ }

    try {
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        this.storageBytes = est.usage ?? 0;
      }
    } catch { /* same */ }
  }

  // Templates can come from this machine and from every server in the open
  // vault. The remote fetch used to set a `msg` string that the template never
  // rendered, and swallow failures in an empty catch — so a dead server and a
  // server with no templates looked identical. Both are now visible.
  private loadRemoteProfiles() {

    const vault = this.keyVault.getApiVault();

    if (!vault) {
      // Credentials exist but the vault is locked: offer the unlock once.
      this.indexeddbService.retrieveAPIkey().then(ret => {
        if (ret && this.sessionsub.getSessionStorageItem('hidedialog') !== 'true') {
          setTimeout(() => this.openDialog(ret));
        }
      });
      return;
    }

    const endpoints: any[] = JSON.parse(vault);
    if (!endpoints.length) { return; }

    this.remoteProfiles = [];
    this.failedEndpoints = [];
    this.profilesError = '';
    this.profilesLoading = true;

    Promise.all(endpoints.map(ep =>
      this.apiService.APISend(ep.value, ep.apikey, 'getreportprofiles', '')
        .then((resp: any) => {
          if (resp && resp.length > 0) {
            resp.forEach((p: any) => {
              p.api = 'remote';
              p.apiurl = ep.value;
              p.apikey = ep.apikey;
              p.apiname = ep.viewValue;
            });
            this.remoteProfiles.push(...resp);
          }
        })
        .catch(() => { this.failedEndpoints.push(ep.viewValue || ep.value); })
    )).then(() => {
      this.profilesLoading = false;
      this.profiles = [...this.localProfiles, ...this.remoteProfiles];
      if (this.failedEndpoints.length) {
        this.profilesError = 'No templates from ' + this.failedEndpoints.join(', ') + '.';
      }
    });

  }

  retryProfiles() {
    this.loadRemoteProfiles();
  }

  profileOrigin(profile: any): string {
    return profile && profile.api ? profile.apiname || profile.apiurl : 'local';
  }

  openDialog(data: any): void {

    const dialogRef = this.dialog.open(DialogApikeyComponent, {
      width: '400px',
      disableClose: true,
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.keyVault.setApiVault(result);
        this.buildDestinations();
        this.loadRemoteProfiles();
      }
    });

  }

  // ── Create / cancel ────────────────────────────────────────────────────────

  async create() {

    this.submitted = true;
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }

    const title: string = this.form.get('title')!.value.trim();
    const key: string = this.form.get('key')!.value;
    const profile = this.form.get('profile')!.value;

    // The control holds a destination id, not the object, so the selection
    // survives the list being rebuilt when the API vault is unlocked.
    const dest = this.destinations.find(d => d.id === this.form.get('destination')!.value) || this.destinations[0];

    this.creating = true;

    const created = !dest.apiurl
      ? await this.indexeddbService.addnewReport(title, key, profile)
      : await this.indexeddbService.addnewReportonAPI(dest.apiurl, dest.apikey, title, key, profile);

    // On success the service navigates to /my-reports; on failure it has
    // already said why, so the form stays put and usable.
    if (!created) {
      this.creating = false;
    }

  }

  private focusFirstInvalid() {
    const id = this.form.get('key')!.invalid || this.form.get('confirm')!.invalid
      ? (this.keyMode === 'own' ? 'nr-key' : null)
      : (this.form.get('title')!.invalid ? 'nr-title' : null);
    if (id) {
      document.getElementById(id)?.focus();
    }
  }

  // Cancel used to call history.back(), which on a deep link or a fresh tab
  // leaves vulnrepo entirely. It now goes where the user expects, and asks
  // first if there is anything to lose.
  cancel(): void {
    if (this.form.dirty && !this.cancelArmed) {
      this.cancelArmed = true;
      return;
    }
    this.router.navigate(['/my-reports']);
  }

  keepEditing(): void {
    this.cancelArmed = false;
  }

}
