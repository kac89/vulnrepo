import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';

export interface ExportIntegrityData {
  filename: string;
  size: number;
  sha256: string;
}

@Component({
  standalone: false,
  selector: 'app-dialog-export-integrity',
  templateUrl: './dialog-export-integrity.component.html',
  styleUrls: ['./dialog-export-integrity.component.scss']
})
export class DialogExportIntegrityComponent {

  verifyOpen = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ExportIntegrityData,
    public dialogRef: MatDialogRef<DialogExportIntegrityComponent>
  ) {}

  get linuxCmd(): string {
    return `sha256sum "${this.data.filename}"`;
  }

  get windowsCmd(): string {
    return `Get-FileHash "${this.data.filename}" -Algorithm SHA256`;
  }

  get fullInstruction(): string {
    return [
      `File: ${this.data.filename}`,
      `Size: ${this.formatSize(this.data.size)}`,
      `SHA-256: ${this.data.sha256}`,
      ``,
      `To verify integrity, run one of the following and confirm the output matches the SHA-256 above:`,
      ``,
      `Linux / macOS:`,
      `  ${this.linuxCmd}`,
      ``,
      `Windows PowerShell:`,
      `  ${this.windowsCmd}`,
    ].join('\n');
  }

  formatSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
  }

  flashCopied(tip: MatTooltip, restore: string): void {
    setTimeout(() => {
      tip.show();
      tip.message = 'Copied!';
    });
    setTimeout(() => {
      tip.hide();
      tip.message = restore;
    }, 2000);
  }

  closedialog(): void {
    this.dialogRef.close();
  }
}
