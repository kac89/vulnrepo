import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient, private snackBar: MatSnackBar) { }

  getCVE(cve: string): Promise<any> {
    return this.http.get<any>('https://cve.vulnrepo.com/' + cve)
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
               .then(response => response, (reason) => {
                 if (reason.AUTH_ACCESS === 'ACCOUNT_EXPIRES') {
                  this.snackBar.open('API ' + apiurl + ' AUTH ERROR: ACCESS EXPIRES!', 'OK', {
                    duration: 3000,
                    panelClass: ['notify-snackbar-fail']
                  });
                 } else {
                  this.snackBar.open('CAN\'T CONNECT TO API: ' + apiurl, 'OK', {
                    duration: 3000,
                    panelClass: ['notify-snackbar-fail']
                  });
                 }
              })
               .catch(error => {
                console.log('API error: ', error);
              });
  }


}
