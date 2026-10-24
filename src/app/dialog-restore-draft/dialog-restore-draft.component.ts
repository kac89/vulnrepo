import { Component, Inject, Optional, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface RestoreDraftDialogData {
  saved_at: number;
  report_version: number;
}

@Component({
  selector: 'app-dialog-restore-draft',
  templateUrl: './dialog-restore-draft.component.html',
  styleUrls: ['./dialog-restore-draft.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class DialogRestoreDraftComponent {
  savedAt: number;
  reportVersion: number;

  constructor(
    public dialogRef: MatDialogRef<DialogRestoreDraftComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) data: RestoreDraftDialogData
  ) {
    this.savedAt = data?.saved_at ?? Date.now();
    this.reportVersion = data?.report_version ?? 0;
  }

  discard(): void {
    this.dialogRef.close('discard');
  }

  restore(): void {
    this.dialogRef.close('restore');
  }
}
