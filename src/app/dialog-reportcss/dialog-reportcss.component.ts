import {
  Component, OnInit, OnDestroy, AfterViewInit, Inject, ViewChild, ElementRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { UntypedFormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { CssPreset, CSS_PRESETS, SUPPORT_LABEL } from './css-presets';
import { buildPreviewDoc } from './preview-doc';

/** A problem worth telling the author about before they export. */
interface CssHint {
  level: 'error' | 'warn';
  text: string;
}

@Component({
  standalone: false,
  selector: 'app-dialog-reportcss',
  templateUrl: './dialog-reportcss.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dialog-reportcss.component.scss']
})
export class DialogReportcssComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('preview') previewRef: ElementRef<HTMLIFrameElement>;
  @ViewChild('editor') editorRef: ElementRef<HTMLTextAreaElement>;

  report_css = new UntypedFormControl('');

  readonly presets = CSS_PRESETS;
  readonly supportLabel = SUPPORT_LABEL;

  /** Value the dialog opened with -- what "Reset" goes back to. */
  private originalCss = '';
  /** Content of the last preset applied, so edits on top of it are detectable. */
  private appliedPresetCss: string | null = null;

  activePresetId: string | null = null;
  /** Set when the author edits after applying a preset. */
  presetEdited = false;

  previewTheme: 'dark' | 'light' = 'dark';
  previewReady = false;

  /** The stylesheet starts hidden -- most people just pick a theme. */
  showEditor = false;

  loadingPresetId: string | null = null;
  /** Preset awaiting confirmation because applying it would discard edits. */
  pendingPreset: CssPreset | null = null;
  /** True once Cancel has been pressed with unsaved edits. */
  confirmingCancel = false;

  hints: CssHint[] = [];
  lineCount = 1;
  byteSize = 0;

  private sub = new Subscription();

  constructor(
    private http: HttpClient,
    public dialogRef: MatDialogRef<DialogReportcssComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    // Callers pass either the whole report settings object or a bare CSS string.
    const initial = (this.data && this.data.report_settings)
      ? this.data.report_settings.report_css
      : this.data;

    const css = typeof initial === 'string' ? initial : '';
    this.report_css.setValue(css);
    this.originalCss = css;
    if (css.trim() === '') {
      this.activePresetId = 'none';
      this.appliedPresetCss = '';
    }
    this.analyse(css);

    this.sub.add(
      this.report_css.valueChanges.pipe(debounceTime(220)).subscribe((value: string) => {
        const text = value || '';
        this.analyse(text);
        this.pushPreviewCss(text);
        if (this.appliedPresetCss !== null && text !== this.appliedPresetCss) {
          this.presetEdited = true;
        }
        // Any further typing makes a standing cancel prompt stale.
        this.confirmingCancel = false;
      })
    );
  }

  ngAfterViewInit(): void {
    this.writePreviewSkeleton();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // ── Preview ────────────────────────────────────────────────────────────────

  /**
   * Write the preview document once. Later updates only replace the text of its
   * trailing <style>, so the embedded font sheet is parsed a single time and the
   * pane never flashes while the author types.
   */
  private writePreviewSkeleton(): void {
    const frame = this.previewRef && this.previewRef.nativeElement;
    if (!frame) { return; }
    try {
      const doc = frame.contentDocument;
      if (!doc) { return; }
      doc.open();
      doc.write(buildPreviewDoc());
      doc.close();
      this.previewReady = true;
      this.applyPreviewTheme();
      this.pushPreviewCss(this.report_css.value || '');
    } catch {
      // A browser that refuses same-origin access to the frame just means no
      // preview; the editor itself keeps working.
      this.previewReady = false;
    }
  }

  private pushPreviewCss(css: string): void {
    if (!this.previewReady) { return; }
    try {
      const doc = this.previewRef.nativeElement.contentDocument;
      const target = doc && doc.getElementById('vr-user');
      if (target) { target.textContent = css; }
    } catch { /* preview is best-effort */ }
  }

  private applyPreviewTheme(): void {
    if (!this.previewReady) { return; }
    try {
      const doc = this.previewRef.nativeElement.contentDocument;
      const body = doc && doc.getElementById('vr-body');
      if (body) { body.classList.toggle('light-mode', this.previewTheme === 'light'); }
    } catch { /* preview is best-effort */ }
  }

  setPreviewTheme(theme: 'dark' | 'light'): void {
    this.previewTheme = theme;
    this.applyPreviewTheme();
  }

  // ── Presets ────────────────────────────────────────────────────────────────

  selectPreset(preset: CssPreset): void {
    if (this.loadingPresetId) { return; }

    // Only interrupt when the author would actually lose something: content
    // they typed rather than content a preset put there.
    const current = (this.report_css.value || '');
    const wouldDiscard = current.trim() !== '' && current !== this.appliedPresetCss;
    if (wouldDiscard) {
      this.pendingPreset = preset;
      return;
    }
    this.loadPreset(preset);
  }

  confirmPendingPreset(): void {
    const preset = this.pendingPreset;
    this.pendingPreset = null;
    if (preset) { this.loadPreset(preset); }
  }

  dismissPendingPreset(): void {
    this.pendingPreset = null;
  }

  private loadPreset(preset: CssPreset): void {
    if (!preset.file) {
      this.setCss('');
      this.activePresetId = preset.id;
      this.appliedPresetCss = '';
      this.presetEdited = false;
      return;
    }

    this.loadingPresetId = preset.id;
    this.http.get('/assets/report-css/' + preset.file, { responseType: 'text' })
      .subscribe({
        next: css => {
          this.setCss(css);
          this.activePresetId = preset.id;
          this.appliedPresetCss = css;
          this.presetEdited = false;
          this.loadingPresetId = null;
        },
        error: () => {
          this.loadingPresetId = null;
          this.hints = [{ level: 'error', text: `Could not load “${preset.name}”. Check your connection and try again.` }];
        }
      });
  }

  /** Set the editor value and refresh everything that derives from it. */
  private setCss(css: string): void {
    this.report_css.setValue(css);
    this.analyse(css);
    this.pushPreviewCss(css);
    this.confirmingCancel = false;
  }

  // ── Editor ─────────────────────────────────────────────────────────────────

  toggleEditor(): void {
    this.showEditor = !this.showEditor;
    if (this.showEditor) {
      // Opening it is a request to write in it, so put the caret there once
      // the textarea has actually been rendered.
      setTimeout(() => {
        const area = this.editorRef && this.editorRef.nativeElement;
        if (area) { area.focus(); }
      });
    }
  }

  /**
   * Tab indents instead of escaping the field, and Ctrl/Cmd+S saves. A plain
   * textarea otherwise makes Tab a trap for anyone writing nested rules.
   */
  onEditorKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      const area = event.target as HTMLTextAreaElement;
      const start = area.selectionStart;
      const end = area.selectionEnd;
      const value = area.value;
      const indent = '  ';
      area.value = value.slice(0, start) + indent + value.slice(end);
      area.selectionStart = area.selectionEnd = start + indent.length;
      this.report_css.setValue(area.value);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.savechange();
    }
  }

  /** Line/byte counters plus the checks that matter for an offline report. */
  private analyse(css: string): void {
    const text = css || '';
    this.lineCount = text === '' ? 1 : text.split('\n').length;
    this.byteSize = new Blob([text]).size;

    const hints: CssHint[] = [];
    if (text.trim() === '') {
      this.hints = hints;
      return;
    }

    // Brace balance, ignoring comments and quoted strings so a brace inside a
    // data: URI or a comment does not raise a false alarm.
    const stripped = text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''");
    const opens = (stripped.match(/{/g) || []).length;
    const closes = (stripped.match(/}/g) || []).length;
    if (opens !== closes) {
      hints.push({
        level: 'error',
        text: opens > closes
          ? `${opens - closes} unclosed ${opens - closes === 1 ? 'brace' : 'braces'} — rules after it will be ignored.`
          : `${closes - opens} extra closing ${closes - opens === 1 ? 'brace' : 'braces'}.`
      });
    }

    // The report is a single self-contained file: anything fetched over the
    // network is simply missing when it is opened offline or from disk.
    if (/@import\b/i.test(stripped)) {
      hints.push({ level: 'warn', text: '@import will not load in an exported report — paste the rules in instead.' });
    }
    if (/url\(\s*['"]?https?:/i.test(stripped)) {
      hints.push({ level: 'warn', text: 'Remote url(...) assets will not load offline — embed them as data: URIs.' });
    }

    // The export escapes a literal </style, but the author should know why
    // their stylesheet looks different in the file than in this box.
    if (/<\/style/i.test(text)) {
      hints.push({ level: 'warn', text: '“</style” is escaped on export so it cannot break out of the stylesheet.' });
    }

    // The report's custom CSS is injected after the built-in sheet, so a bare
    // :root block outranks the template's .light-mode one and leaks dark
    // values into the light theme. Easy to miss without checking both modes.
    if (/:root\b/.test(stripped) && !/\.light-mode\b/.test(stripped)) {
      hints.push({
        level: 'warn',
        text: 'Defines :root but not .light-mode — light mode will keep these colours. Preview Light to check.'
      });
    }

    this.hints = hints;
  }

  get isDirty(): boolean {
    return (this.report_css.value || '') !== this.originalCss;
  }

  get canReset(): boolean {
    return this.isDirty;
  }

  get hasErrors(): boolean {
    return this.hints.some(h => h.level === 'error');
  }

  resetChanges(): void {
    this.setCss(this.originalCss);
    this.activePresetId = this.originalCss.trim() === '' ? 'none' : null;
    this.appliedPresetCss = this.originalCss.trim() === '' ? '' : null;
    this.presetEdited = false;
  }

  clearCss(): void {
    this.setCss('');
    this.activePresetId = 'none';
    this.appliedPresetCss = '';
    this.presetEdited = false;
  }

  // ── Closing ────────────────────────────────────────────────────────────────

  cancel(): void {
    if (this.isDirty && !this.confirmingCancel) {
      this.confirmingCancel = true;
      return;
    }
    this.dialogRef.close();
  }

  dismissCancelPrompt(): void {
    this.confirmingCancel = false;
  }

  discardAndClose(): void {
    this.dialogRef.close();
  }

  savechange(): void {
    this.dialogRef.close(this.report_css.value || '');
  }
}
