import { Injectable } from '@angular/core';
import { Http } from '@angular/http';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: Http) { }

  getCVE(cve: string): Promise<any> {
    return this.http.get('https://api.vulnrepo.com/cve/' + cve)
               .toPromise()
               .then(response => response.json())
               .catch(error => {
                console.log('error: ', error);
              });
  }

}
