import { Injectable } from '@angular/core';

interface SeverityEntry { readonly name: string; readonly value: number; }
interface IssueStatusEntry { readonly status: string; readonly value: number; }

@Injectable({
  providedIn: 'root'
})
export class UtilsService {


  readonly issueStatustable: readonly IssueStatusEntry[] = [
    { status: 'Open (Waiting for review)', value: 1 },
    { status: 'Fix In Progress', value: 2 },
    { status: 'Fixed', value: 3 },
    { status: 'Won\'t Fix', value: 4 }
  ];

  readonly severitytable: readonly SeverityEntry[] = [
    { name: 'Critical', value: 1 },
    { name: 'High', value: 2 },
    { name: 'Medium', value: 3 },
    { name: 'Low', value: 4 },
    { name: 'Info', value: 5 }
  ];

  constructor() { }


  setseverity(severity: string): string {
    const entry = this.severitytable.find(s => s.value === Number(severity));
    return entry ? entry.name : severity;
  }


  generatePassword(length: number): string {
    const lower   = 'abcdefghijklmnopqrstuvwxyz';
    const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numeric = '0123456789';
    const special = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    const all     = lower + upper + numeric + special;

    // Rejection-sampling pick: avoids modulo bias
    const pick = (charset: string): string => {
      const limit = 256 - (256 % charset.length);
      let b: number;
      do { b = crypto.getRandomValues(new Uint8Array(1))[0]; } while (b >= limit);
      return charset[b % charset.length];
    };

    const chars: string[] = [];

    // Seed one char from each category only when length leaves room for all four.
    // For length < 4 the per-category guarantee is impossible, so draw from the
    // full charset and let shuffle order things — previously the seed + slice path
    // could silently discard the guaranteed digit/special.
    if (length >= 4) {
      chars.push(pick(lower), pick(upper), pick(numeric), pick(special));
    }
    while (chars.length < length) { chars.push(pick(all)); }

    // Fisher-Yates shuffle using crypto (rejection sampling to avoid modulo bias)
    for (let i = chars.length - 1; i > 0; i--) {
      const range = i + 1;
      const limit = 256 - (256 % range);
      let r: number;
      do { r = crypto.getRandomValues(new Uint8Array(1))[0]; } while (r >= limit);
      const j = r % range;
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }



  parseCSV(str: string) {

    const arr: any = [];
    let quote = false;  // 'true' means we're inside a quoted field

    // Iterate over each character, keep track of current row and column (of the returned array)
    for (let row = 0, col = 0, c = 0; c < str.length; c++) {
      let cc = str[c], nc = str[c + 1];        // Current character, next character
      arr[row] = arr[row] || [];             // Create a new row if necessary
      arr[row][col] = arr[row][col] || '';   // Create a new column (start with empty string) if necessary

      // If the current character is a quotation mark, and we're inside a
      // quoted field, and the next character is also a quotation mark,
      // add a quotation mark to the current column and skip the next character
      if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }

      // If it's just one quotation mark, begin/end quoted field
      if (cc == '"') { quote = !quote; continue; }

      // If it's a comma and we're not in a quoted field, move on to the next column
      if (cc == ',' && !quote) { ++col; continue; }

      // If it's a newline (CRLF) and we're not in a quoted field, skip the next character
      // and move on to the next row and move to column 0 of that new row
      if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }

      // If it's a newline (LF or CR) and we're not in a quoted field,
      // move on to the next row and move to column 0 of that new row
      if (cc == '\n' && !quote) { ++row; col = 0; continue; }
      if (cc == '\r' && !quote) { ++row; col = 0; continue; }

      // Otherwise, append the current character to the current column
      arr[row][col] += cc;
    }

    // Drop a trailing phantom row produced by extra blank lines at EOF
    // (e.g. "a,b\nc,d\n\n" → [['a','b'],['c','d'],['']]). A genuine single-cell
    // empty row would still equal [''], but CSVs don't legitimately encode that.
    if (arr.length && arr[arr.length - 1].length === 1 && arr[arr.length - 1][0] === '') {
      arr.pop();
    }
    return arr;
  }

  removeHTMLTags(htmlString: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    // textContent walks into <script>/<style>/<noscript>/<template> and emits
    // their source as visible text — strip them so attacker-controlled imports
    // (e.g. <script>alert(1)</script>) don't leak code into issue fields.
    doc.querySelectorAll('script, style, noscript, template').forEach(el => el.remove());
    const textContent = doc.body.textContent || "";
    return textContent.trim();
  }

}
