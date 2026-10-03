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

  getGHSA(ghsa_id: string): Promise<any> {
    return this.http.get<any>('https://api.github.com/advisories/' + ghsa_id)
               .toPromise()
               .then(response => response)
               .catch(error => {
                console.log('GHSA error: ', error);
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

  // ── NVD 2.0 ────────────────────────────────────────────────────────────────
  // An API key lifts the public rate limit from 5 requests per 30s to 50, which
  // is the difference between a 2 minute paged fetch and a 15 second one.
  private nvdOptions(apiKey?: string) {
    return apiKey ? { headers: new HttpHeaders().set('apiKey', apiKey) } : {};
  }

  // Every NVD call resolves; failures come back in one shape the caller can test
  // with `resp.__error` instead of having to tell an error object from a payload.
  private nvdError(error: any) {
    console.log('NVD error: ', error);
    return {
      __error: true,
      status: error?.status ?? 0,
      message: error?.status === 403 || error?.status === 429
        ? 'NVD rate limit reached. Wait 30 seconds and try again.'
        : 'NVD request failed. Check your connection and try again.'
    };
  }

  getCVEbyCPE(cpe: string, resultsPerPage = 2000, startIndex = 0, apiKey = ''): Promise<any> {
    return this.http.get<any>('https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=' + encodeURIComponent(cpe)
                 + '&resultsPerPage=' + String(resultsPerPage)
                 + '&startIndex=' + String(startIndex), this.nvdOptions(apiKey))
               .toPromise()
               .then(response => response)
               .catch(error => this.nvdError(error));
  }

  searchCVEpage(keyword: string, resultsPerPage: number, startIndex: number, exactMatch = false, apiKey = ''): Promise<any> {
    return this.http.get<any>('https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=' + encodeURIComponent(keyword)
                 + (exactMatch ? '&keywordExactMatch' : '')
                 + '&resultsPerPage=' + String(resultsPerPage)
                 + '&startIndex=' + String(startIndex), this.nvdOptions(apiKey))
               .toPromise()
               .then(response => response)
               .catch(error => this.nvdError(error));
  }

  // ── Background calls ───────────────────────────────────────────────────────
  // A listing or an existence probe runs without the user asking for it, and
  // the caller already has somewhere to put the failure. Raising the global
  // snackbar as well produces "CAN'T CONNECT TO API" floating over a page that
  // is visibly showing data from that same API — so `silent` callers get the
  // reason back as a value (the same __error shape the NVD helpers use) and
  // decide for themselves how to show it.
  private apiError(apiurl: string, reason: any) {
    const status = reason?.status ?? 0;
    console.log('API error (' + apiurl + '): ', reason);
    return { __error: true, status, message: this.apiErrorMessage(status) };
  }

  private apiErrorMessage(status: number): string {
    if (status === 0) return 'no response';
    if (status === 200) return 'invalid response (not JSON)';
    if (status === 401 || status === 403) return 'HTTP ' + status + ', API key rejected';
    if (status === 404) return 'HTTP 404, no API at this address';
    return 'HTTP ' + status;
  }

  APISend(apiurl: string, apikey: string, action: string, body: string, silent = false): Promise<any> {
    const header = new HttpHeaders().set('VULNREPO-AUTH', apikey).set('VULNREPO-ACTION', action).set('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    return this.http.post<any>('https://' + apiurl + '/api/', body, {headers: header})
               .toPromise()
               .then(response => response, (reason) => {
                 if (silent) {
                  return this.apiError(apiurl, reason);
                 } else if (reason.AUTH_ACCESS === 'ACCOUNT_EXPIRES') {
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
