import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CurrentdateService {

  constructor() { }

  getcurrentDate(): number {
    const today: number = Date.now(); //timestamp
    //const date = new Date();
    //const today = this.datePipe.transform(date, 'yyyy-MM-dd');
    return today
  }

}
