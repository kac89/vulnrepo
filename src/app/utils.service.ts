import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {


  issueStatustable = [
    { status: 'Open (Waiting for review)', value: 1 },
    { status: 'Fix In Progress', value: 2 },
    { status: 'Fixed', value: 3 },
    { status: 'Won\'t Fix', value: 4 }
  ];

 severitytable = [
    { name: 'Critical', value: 1 },
    { name: 'High', value: 2 },
    { name: 'Medium', value: 3 },
    { name: 'Low', value: 4 },
    { name: 'Info', value: 5 }
  ];

  constructor() { }


  setseverity(severity: string): string {

    if (severity === "5") {
      severity = "Info";
    } else if (severity === "4") {
      severity = "Low";
    } else if (severity === "3") {
      severity = "Medium";
    } else if (severity === "2") {
      severity = "High";
    } else if (severity === "1") {
      severity = "Critical";
    }

    return severity;
  }


  generatePassword(length) {
    const string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numeric = '0123456789';
    const punctuation = '!@#$%^&*()_+~`|}{[]\:;?><,./-=';
    let password = '', character = '', ent1 = 0, ent2 = 0, ent3 = 0, hold = '', pass = '';
    while ( password.length < length ) {
        ent1 = Math.ceil(string.length * Math.random() * Math.random());
        ent2 = Math.ceil(numeric.length * Math.random() * Math.random());
        ent3 = Math.ceil(punctuation.length * Math.random() * Math.random());
        hold = string.charAt( ent1 );
        hold = (password.length % 2 === 0) ? (hold.toUpperCase()) : (hold);
        character += hold;
        character += numeric.charAt( ent2 );
        character += punctuation.charAt( ent3 );
        password = character;
    }
    password = password.split('').sort(function() {return 0.5 - Math.random(); }).join('');
    pass = password.substr(0, length);
    return pass
  }



  parseCSV(str) {

    const arr = [];
    let quote = false;  // 'true' means we're inside a quoted field

    // Iterate over each character, keep track of current row and column (of the returned array)
    for (let row = 0, col = 0, c = 0; c < str.length; c++) {
        let cc = str[c], nc = str[c+1];        // Current character, next character
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
    return arr;
}



}
