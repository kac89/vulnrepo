import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

export interface FilterSyntaxExample {
  snippet: string;
  label: string;
  description: string;
}

@Component({
  standalone: false,
  selector: 'app-dialog-filter-help',
  templateUrl: './dialog-filter-help.component.html',
  styleUrls: ['./dialog-filter-help.component.scss']
})
export class DialogFilterHelpComponent {

  readonly examples: FilterSyntaxExample[] = [
    { snippet: 'severity:High',           label: 'severity:High',           description: 'Exact severity match' },
    { snippet: 'severity:Critical,High',  label: 'severity:Critical,High',  description: 'In-set (any of)' },
    { snippet: 'cvss:>=7.0',              label: 'cvss:>=7.0',              description: 'Numeric comparison' },
    { snippet: 'cvss:3..7',               label: 'cvss:3..7',               description: 'Numeric range (inclusive)' },
    { snippet: '-status:Fixed',           label: '-status:Fixed',           description: 'Negate (also !key:value)' },
    { snippet: 'status:open',             label: 'status:open',             description: 'open | in-progress | fixed | wontfix' },
    { snippet: 'tag:xss',                 label: 'tag:xss',                 description: 'Tag name contains' },
    { snippet: 'has:bounty',              label: 'has:bounty',              description: 'Presence check (bounty|tag|poc|desc|cvss)' },
    { snippet: '"sql injection"',         label: '"sql injection"',         description: 'Quoted phrase (title, PoC, description)' },
    { snippet: 'xss OR csrf',             label: 'xss OR csrf',             description: 'Boolean OR (AND is implicit)' },
    { snippet: '(severity:High OR severity:Critical) -status:Fixed',
      label: '(A OR B) -C',
      description: 'Grouping with parentheses' },
  ];

  constructor(public dialogRef: MatDialogRef<DialogFilterHelpComponent, string>) {}

  insert(snippet: string) {
    this.dialogRef.close(snippet);
  }

  close() {
    this.dialogRef.close();
  }
}
