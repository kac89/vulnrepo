import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class MessageService {

  constructor() { }

  private subject = new Subject<any>();

  sendDecrypted(message: string) {
      this.subject.next(message);
  }

  clearDecrypted() {
      this.subject.next(false);
  }

  getDecrypted(): Observable<any> {
      return this.subject.asObservable();
  }

}
