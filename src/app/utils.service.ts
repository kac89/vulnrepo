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

}
