import { Injectable } from '@angular/core';
import { ReplaySubject } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class SessionstorageserviceService {
  public storageChange: ReplaySubject<any> = new ReplaySubject();
  constructor() { }
  public setSessionStorageItem(key, val): void {
    sessionStorage.setItem(key, val);
    this.storageChange.next(key);
  }

  public getSessionStorageItem(key) {
    return sessionStorage.getItem(key);
  }

  public removeSessionStorageItem(key) {
    this.storageChange.next(key);
    return sessionStorage.removeItem(key);
  }

}
