import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import * as xml2js from 'xml2js';
import * as Crypto from 'crypto-js';

interface Importsource {
  value: string;
  viewValue: string;
}

@Component({
  selector: 'app-dialog-import',
  templateUrl: './dialog-import.component.html',
  styleUrls: ['./dialog-import.component.scss']
})
export class DialogImportComponent implements OnInit {
  selected = '';
  selected_source = '';
  csvContent: string;
  parsedCsv: any[];
  xmltojson: any[];
  public show_input = true;
  public please_wait = false;
  public burpshow_input = true;
  public burpplease_wait = false;
  public openvas9show_input = true;
  public openvas9please_wait = false;
  public nessusxmlshow_input = true;
  public nessusxmlplease_wait = false;
  public vulnrepojsonshow_input = true;
  public vulnrepojsonplease_wait = false;
  public vulnrepowrongpass = false;
  public nmapshow_input = true;
  public nmapplease_wait = false;
  public nmapwrongpass = false;

  file: any;
  hide = true;
  sour: Importsource[] = [
    { value: 'vulnrepojson', viewValue: 'VULNRΞPO (.VULN)' },
    { value: 'burp', viewValue: 'Burp Suite (.XML)' },
    { value: 'nmap', viewValue: 'Nmap (.XML)' },
    { value: 'openvas', viewValue: 'OpenVAS 9 (.XML)' },
    { value: 'nessus_xml', viewValue: 'Tenable Nessus (.NESSUS)' },
    { value: 'nessus', viewValue: 'Tenable Nessus (.CSV)' }
  ];

  constructor(public dialogRef: MatDialogRef<DialogImportComponent>, public datePipe: DatePipe) { }

  ngOnInit() {
  }

  onFileLoad(fileLoadedEvent) {
  }

  onFileSelect(input: HTMLInputElement) {

    const files = input.files;
    if (files && files.length) {
      this.show_input = false;
      this.please_wait = true;

      const fileToRead = files[0];

      const fileReader = new FileReader();
      fileReader.onload = this.onFileLoad;


      fileReader.onload = (e) => {
        this.parseNessus(fileReader.result);
      };

      fileReader.readAsText(fileToRead, 'UTF-8');
    }

  }

  cancel(): void {
    this.dialogRef.close();
  }

  parseNessus(imp): void {

    const csvData = imp || '';
    const allTextLines = csvData.split(/\r\n/);
    const headers = allTextLines[0].split(',');
    const lines = [];

    for (let i = 0; i < allTextLines.length; i++) {
      // split content based on comma
      const data = allTextLines[i].split('","');

      const tarr = [];
      for (let j = 0; j < headers.length; j++) {
        tarr.push(data[j]);
      }

      lines.push(tarr);

    }
    this.parsedCsv = lines;

    function unique(array, propertyName) {
      return array.filter((e, i) => array.findIndex(a => a[propertyName] === e[propertyName]) === i);
    }

    function group_issues(array) {

      const ret = [];
      array.forEach((item, index) => {

        ret.forEach((retit, retindex) => {

          if (retit[0] === item[0]) {

            if (retit[1] !== '') {
              retit[1] = retit[1] + ',' + item[1];
            }
            if (retit[4] !== item[4]) {

              if (retit[4] !== '') {


                const doesContains = retit[4].match(item[4]);

                if (doesContains !== null) {

                } else {
                  if (item[6] === '0') {
                    retit[4] = retit[4] + '\n' + item[4];
                  } else {
                    retit[4] = retit[4] + '\n' + item[5] + '://' + item[4] + ':' + item[6];
                  }
                }

              }

            }

          }

        });

        if (item[6] !== '0') {
          item[4] = item[5] + '://' + item[4] + ':' + item[6];
        }

        ret.push(item);

      });

      return ret;
    }


    const parsedCsv2 = group_issues(this.parsedCsv);
    const parsedCsv = unique(parsedCsv2, 0);
    const date = new Date();
    const today = this.datePipe.transform(date, 'yyyy-MM-dd');
    const info = parsedCsv.map((res, key) => {

      const def = {
        title: res[7],
        poc: res[4],
        files: [],
        desc: res[8] + '\n\n' + res[9],
        severity: res[3],
        ref: res[11],
        cvss: res[2],
        cve: res[1],
        tags: [],
        bounty: [],
        date: today
      };

      return def;
    });

    info.splice(info.length - 1, 1);
    info.splice(0, 1);
    this.dialogRef.close(info);

  }


  burponFileSelect(input: HTMLInputElement) {
    const files = input.files;
    if (files && files.length) {
      this.burpshow_input = false;
      this.burpplease_wait = true;
      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = this.onFileLoad;
      fileReader.onload = (e) => {
        this.parseBurp(fileReader.result);
      };
      fileReader.readAsText(fileToRead, 'UTF-8');
    }
  }



  parseBurp(xml) {

    function returnhost(host, path) {
      let ret = '';
      host.map((res, key) => {
        ret = ret + res.$.ip + ' ' + res._ + path[key] + '\n';
      });
      return ret;
    }

    function setcvss(severity) {

      let cvss = 0;
      if (severity === 'High') {
        cvss = 8;
      } else if (severity === 'Medium') {
        cvss = 5;
      } else if (severity === 'Low') {
        cvss = 2;
      } else if (severity === 'Info') {
        cvss = 0;
      }

      return cvss;
    }

    this.xmltojson = [];
    const parser = new xml2js.Parser({ strict: true, trim: true });
    parser.parseString(xml, (err, result) => {
      this.xmltojson = result.issues.issue;
    });


    const emp = [];

    this.xmltojson.map((res, key) => {

      if (!emp.find(x => x.type[0] === res.type[0])) {
        emp.push(res);
      } else {
        const index = emp.findIndex(x => x.type[0] === res.type[0]);

        emp[index].location.push(res.location[0]);
        emp[index].path.push(res.path[0]);
        emp[index].host.push(res.host[0]);

      }


    });

    const date = new Date();
    const today = this.datePipe.transform(date, 'yyyy-MM-dd');
    const info = emp.map((res, key) => {

      let item = '';
      if (res.vulnerabilityClassifications !== undefined) {
        item = res.vulnerabilityClassifications[0].replace(/<[^>]*>/g, '');
      } else {
        item = '';
      }

      let itempoc = '';
      if (res.issueDetail !== undefined) {
        itempoc = res.issueDetail[0].replace(/<[^>]*>/g, '');
      } else {
        itempoc = '';
      }

      let itemrem = '';
      if (res.remediationBackground !== undefined) {
        itemrem = res.remediationBackground[0].replace(/<[^>]*>/g, '');
      } else {
        itemrem = '';
      }

      if (res.severity[0] === 'Information') {
        res.severity[0] = 'Info';
      }

      const def = {
        title: res.name[0],
        poc: itempoc + '\n\n' + returnhost(res.host, res.path),
        files: [],
        desc: res.issueBackground[0].replace(/<[^>]*>/g, '') + '\n\n' + itemrem,
        severity: res.severity[0],
        ref: item,
        cvss: setcvss(res.severity[0]),
        cve: '',
        tags: [],
        bounty: [],
        date: today
      };

      return def;
    });


    this.dialogRef.close(info);

  }

  openvas9onFileSelect(input: HTMLInputElement) {
    const files = input.files;
    if (files && files.length) {
      this.openvas9show_input = false;
      this.openvas9please_wait = true;
      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = this.onFileLoad;
      fileReader.onload = (e) => {
        this.parseOpenvas9(fileReader.result);
      };
      fileReader.readAsText(fileToRead, 'UTF-8');
    }
  }

  parseOpenvas9(xml) {

    this.xmltojson = [];
    const parser = new xml2js.Parser({ strict: true, trim: true });

    parser.parseString(xml, (err, result) => {
      if (result.report !== undefined) {
        if (result.report.report) {
          this.xmltojson = result.report.report;
        }
      } else {
        if (result.get_results_response !== undefined) {
          this.parseOpenvasxml(result.get_results_response.result);
        }
      }
    });

    this.xmltojson.forEach((myObject, index) => {
      if (myObject.results) {
        myObject.results.forEach((myarrdeep) => {
          this.parseOpenvasxml(myarrdeep.result);
        });
      }
    });

  }

  parseOpenvasxml(xml) {

    const date = new Date();
    const today = this.datePipe.transform(date, 'yyyy-MM-dd');
    const info = xml.map((res, key) => {

      const def = {
        title: res.name,
        poc: res.port[0] + '\n\n' + res.host[0]._,
        files: [],
        desc: res.description,
        severity: res.threat[0],
        ref: res.nvt[0].xref[0],
        cvss: res.severity[0],
        cve: '',
        tags: [],
        bounty: [],
        date: today
      };

      return def;
    });

    this.dialogRef.close(info);
  }






  nessusxmlonFileSelect(input: HTMLInputElement) {

    const files = input.files;
    if (files && files.length) {
      this.nessusxmlshow_input = false;
      this.nessusxmlplease_wait = true;

      const fileToRead = files[0];

      const fileReader = new FileReader();
      fileReader.onload = this.onFileLoad;

      fileReader.onload = (e) => {
        this.parseNessusxml(fileReader.result);
      };

      fileReader.readAsText(fileToRead, 'UTF-8');
    }

  }

  parseNessusxml(xml) {

    function getSafe(fn, defaultVal) {
      try {
          return fn();
      } catch (e) {
          return defaultVal;
      }
  }

    this.xmltojson = [];
    const issues = [];
    const parser = new xml2js.Parser({ strict: true, trim: true });

    parser.parseString(xml, (err, result) => {
      this.xmltojson = result.NessusClientData_v2.Report;
    });

    this.xmltojson.forEach((myObject, index) => {
      if (myObject.ReportHost) {
        myObject.ReportHost.forEach((myarrdeep) => {

          myarrdeep.ReportItem.forEach((itemissue) => {

              // tslint:disable-next-line:max-line-length
              type MyArrayType = Array<{ ip: string, port: string, protocol: string, hostfqdn: string, hostname: string, pluginout: string }>;
              const arr: MyArrayType = [
                // tslint:disable-next-line:max-line-length
                { ip: myarrdeep.$.name, port: itemissue.$.port, protocol: itemissue.$.protocol, hostfqdn: getSafe(() => myarrdeep.HostProperties[0].tag[2]._, ''), hostname: getSafe(() => myarrdeep.HostProperties[0].tag[14]._, ''), pluginout: itemissue.plugin_output }
              ];

            if (myarrdeep.HostProperties[0].tag[2]._) {

            }
            // tslint:disable-next-line:max-line-length
            issues.push([itemissue.$.pluginName, itemissue.$.pluginID, arr, itemissue.cvss_base_score, itemissue.solution, itemissue.description, itemissue.cve, itemissue.see_also, itemissue.risk_factor]);
          });

        });
      }
    });


    const uniq_items = [];
    issues.forEach((myissues, index) => {

      if (!uniq_items.some((item) => item[1] === myissues[1])) {
        uniq_items.push(myissues);
      } else {
        const ind = uniq_items.findIndex(x => x[1] === myissues[1]);
        uniq_items[ind][2].push(myissues[2]);
      }

    });

    const date = new Date();
    const today = this.datePipe.transform(date, 'yyyy-MM-dd');
    const info = uniq_items.map((res, key) => {

      if (res[8].toString() === 'Information') {
        res[8] = 'Info';
      }
      if (res[8].toString() === 'None') {
        res[8] = 'Info';
        res[3] = '0';
      }


      let out_hosts = 'IP List:\n\n';
      res[2].forEach((myObject, index) => {

        if (myObject.ip !== undefined) {
          let port = '';
          if (myObject.port.toString() === '0') {
            port = '';
          } else {
            port = 'Port: ' + myObject.protocol + '/' + myObject.port;
          }

          if (myObject.hostname.toString() === 'true') {
            myObject.hostname = '';
          }

          out_hosts = out_hosts + myObject.ip + ' ' + myObject.hostname + ' ' + port + '\n';
        } else {

          let port = '';
          if (myObject[0].port.toString() === '0') {
            port = '';
          } else {
            port = 'Port: ' + myObject[0].protocol + '/' + myObject[0].port;
          }
          if (myObject[0].hostname.toString() === 'true') {
            myObject[0].hostname = '';
          }

          // tslint:disable-next-line:max-line-length
          out_hosts = out_hosts + myObject[0].ip + ' ' + myObject[0].hostname + ' ' + port + '\n';
        }

      });


      let out_ip = '\nOutput:\n';
      res[2].forEach((myObject, index) => {

        if (myObject.ip !== undefined) {
          let port = '';
          if (myObject.port.toString() === '0') {
            port = '';
          } else {
            port = 'Port: ' + myObject.protocol + '/' + myObject.port;
          }

          if (myObject.hostname.toString() === 'true') {
            myObject.hostname = '';
          }
          if (myObject.pluginout === undefined) {
            myObject.pluginout = '';
          }

          out_ip = out_ip + '===\n' + myObject.ip + '\n' + myObject.hostname + '\n' + port + '\n\n' + myObject.pluginout + '\n\n';
        } else {

          let port = '';
          if (myObject[0].port.toString() === '0') {
            port = '';
          } else {
            port = 'Port: ' + myObject[0].protocol + '/' + myObject[0].port;
          }

          if (myObject[0].hostname.toString() === 'true') {
            myObject[0].hostname = '';
          }
          if (myObject[0].pluginout === undefined) {
            myObject[0].pluginout = '';
          }

          // tslint:disable-next-line:max-line-length
          out_ip = out_ip + '===\n' + myObject[0].ip + '\n' + myObject[0].hostname + '\n' + port + '\n\n' + myObject[0].pluginout + '\n\n';
        }

      });

      res[3] = getSafe(() => res[3], '0');

      if (res[7] === undefined) {
        res[7] = '';
      }
      if (res[5] === undefined) {
        res[5] = '';
      }

      const def = {
        title: res[0],
        poc: out_hosts + out_ip,
        files: [],
        desc: res[5],
        severity: res[8].toString(),
        ref: res[7],
        cvss: res[3],
        cve: '',
        tags: [],
        bounty: [],
        date: today
      };

      return def;
    });

    this.dialogRef.close(info);
  }

  fileChanged(e) {
    this.file = e.target.files[0];
  }

  startUpload(pass) {

    if (pass !== '' && this.file) {
      this.vulnrepojsonshow_input = false;
      this.vulnrepojsonplease_wait = true;
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        this.vulnrepojson(fileReader.result, pass);
      };
      fileReader.readAsText(this.file, 'UTF-8');
    }

  }

  vulnrepojson(json, pass) {

      try {
        // Decrypt
        const bytes = Crypto.AES.decrypt(json.toString(), pass);
        const decryptedData = JSON.parse(bytes.toString(Crypto.enc.Utf8));

        if (decryptedData) {
          this.dialogRef.close(decryptedData);
        }

      } catch (except) {
        this.vulnrepojsonplease_wait = false;
        this.vulnrepowrongpass = true;
      }

  }

  nmaponFileSelect(input: HTMLInputElement) {

    const files = input.files;
    if (files && files.length) {
      this.show_input = false;
      this.please_wait = true;

      const fileToRead = files[0];

      const fileReader = new FileReader();
      fileReader.onload = this.onFileLoad;


      fileReader.onload = (e) => {
        this.parseNmap(fileReader.result);
      };

      fileReader.readAsText(fileToRead, 'UTF-8');
    }

  }

  parseNmap(xml) {

    let json = '';
    let hosts = [];
    const parser = new xml2js.Parser({ strict: true, trim: true });

    parser.parseString(xml, (err, result) => {
      json = result.nmaprun;
      hosts = result.nmaprun.host;
    });

    const date = new Date();
    const today = this.datePipe.transform(date, 'yyyy-MM-dd');
    const info = hosts.map((res, key) => {
      let addre = '';
      if (res.address[0]['$'].addr !== undefined) {
        addre = res.address[0]['$'].addr + ' ';
      } else {
        addre = '';
      }

      let hostt = '';
      if(res.hostnames) {
        if(res.hostnames[0].hostname) {
          if (res.hostnames[0].hostname[0]['$'].name !== undefined) {
            hostt = ' - ' + res.hostnames[0].hostname[0]['$'].name;
          } else {
            hostt = '';
          }
        }
      }

      let cmd = '';
      if (json['$'].args !== undefined) {
        cmd = 'Execute: ' + json['$'].args + '\n\n';
      }

      let status = '';
      let ipstat = '';
      if (res.status) {
        if (res.status[0]['$'].state !== undefined) {
          // tslint:disable-next-line:max-line-length
          status = 'IP: ' + res.address[0]['$'].addr + '\nStatus: ' + res.status[0]['$'].state + '\nReason: ' + res.status[0]['$'].reason + '\nReason TTL: ' + res.status[0]['$'].reason_ttl + '\n';
          ipstat = ' (' + res.status[0]['$'].state + ')';
        }
      }

      let ports = 'Open ports:\n';
      let filteredports = '';
      if (res.ports) {
        if (res.ports[0].port !== undefined) {
          res.ports[0].port.forEach((myObject, index) => {
            let service = '';
            let service_name = '';
            if (myObject.service[0]['$'].name !== undefined) {
              service_name = myObject.service[0]['$'].name;
            }
            let service_product = '';
            if (myObject.service[0]['$'].product !== undefined) {
              service_product = myObject.service[0]['$'].product;
            }
            if (service_product === '') {
              service = service_name
            } else {
              service = service_name + ' - ' + service_product;
            }
            
            ports = ports + myObject['$'].protocol + '/' + myObject['$'].portid + ' - ' + service + '\n';
          });
  
        }
      
        if (res.ports[0].extraports !== undefined) {
          const title = '\nFiltered ports:\n';
          res.ports[0].extraports.forEach((myObject, index) => {
            filteredports = myObject['$'].state + '/' + myObject['$'].count + '\n';
          });
          filteredports = title + filteredports;
        }
    }

      let osdetect = '';
      if (res.os) {
        if (res.os[0].osmatch !== undefined) {
          const title = '\n====================\nOS detection:\n';
          res.os[0].osmatch.forEach((myObject, index) => {
            osdetect = osdetect + myObject['$'].name + ' - ' + myObject['$'].accuracy + '% \n';
          });
          osdetect = title + osdetect;
        }
      }

      const pocc = ports + filteredports + osdetect + '';
      const descc = cmd + status + '';

      const def = {
        title: 'Nmap scan for: ' + addre + hostt + ipstat,
        poc: pocc,
        files: [],
        desc: descc,
        severity: 'Info',
        ref: 'https://nmap.org/',
        cvss: '',
        cve: '',
        tags: [],
        bounty: [],
        date: today
      };

      return def;
    });

    this.dialogRef.close(info);

  }

}
