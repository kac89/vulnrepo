import { Injectable } from '@angular/core';
import { ReportComponent } from './report/report.component';

@Injectable({
  providedIn: 'root'
})
export class DeactivateGuardService {

  constructor() { }

  canDeactivate(component: ReportComponent) {
    return component.canDeactivate();
  }
}
