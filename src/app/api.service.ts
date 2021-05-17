import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) { }

  getCVE(cve: string): Promise<any> {
    return this.http.get<any>('https://api.vulnrepo.com/cve/' + cve)
               .toPromise()
               .then(response => response)
               .catch(error => {
                console.log('CVE error: ', error);
              });
  }

  APISend(apiurl: string, apikey: string, action: string, body: string): Promise<any> {
    const header = new HttpHeaders().set('VULNREPO-AUTH', apikey).set('VULNREPO-ACTION', action).set('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    return this.http.post<any>('https://' + apiurl + '/api/', body, {headers: header})
               .toPromise()
               .then(response => response)
               .catch(error => {
                console.log('API error: ', error);
              });
  }


}
