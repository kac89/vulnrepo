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

//  getCVENVD(cve: string): Promise<any> {
//    return this.http.get<any>('https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=' + cve)
//               .toPromise()
//               .then(response => response)
//               .catch(error => {
//                console.log('CVE error: ', error);
//              });
//  }

  getCVEbyCPE(cpe: string): Promise<any> {
    return this.http.get<any>('https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=' + cpe)
               .toPromise()
               .then(response => response)
               .catch(error => {
                console.log('CVE error: ', error);
                this.snackBar.open('404 Not Found on API', 'OK', {
                  duration: 5000,
                  panelClass: ['notify-snackbar-fail']
                });
              });
  }

  searchCVEpage(keyword: string, resultsPerPage: number, startIndex: number): Promise<any> {
    return this.http.get<any>('https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=' + encodeURI(keyword) + '&keywordExactMatch&resultsPerPage='+String(resultsPerPage)+'&startIndex='+String(startIndex))
               .toPromise()
               .then(response => response)
               .catch(error => {
                console.log('CVE error: ', error);
                this.snackBar.open('API Response ERROR, wait 30sec and try again!', 'OK', {
                  duration: 5000,
                  panelClass: ['notify-snackbar-fail']
                });
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
                 } else if (reason.status === 404) {
                    //nothing to do
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
