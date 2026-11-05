import { Component, Inject, Optional, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import DOMPurify from 'dompurify';

interface ResetDialogData {
  title?: string;
  bodyHtml?: string;
  subtitle?: string;
  icon?: string;
  confirmLabel?: string;
}

@Component({
  selector: 'app-dialog-asvs-reset',
  templateUrl: './dialog-asvs-reset.component.html',
  styleUrls: ['./dialog-asvs-reset.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class DialogAsvsResetComponent {
  title: string;
  bodyHtml: string;
  subtitle: string;
  icon: string;
  confirmLabel: string;

  constructor(
    public dialogRef: MatDialogRef<DialogAsvsResetComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) data: ResetDialogData
  ) {
    this.title = data?.title || 'Reset ASVS checklist';
    this.subtitle = data?.subtitle || 'This action cannot be undone';
    this.icon = data?.icon || 'restart_alt';
    this.confirmLabel = data?.confirmLabel || 'Reset';
    const rawBody = data?.bodyHtml
      || 'All selected requirements <strong class="highlight">and notes</strong> will be removed from your local storage.';
    this.bodyHtml = DOMPurify.sanitize(rawBody);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
