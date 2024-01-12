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

}
