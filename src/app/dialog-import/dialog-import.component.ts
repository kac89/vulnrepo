import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import * as xml2js from 'xml2js';
import * as Crypto from 'crypto-js';
import { CurrentdateService } from '../currentdate.service';

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
  checked = true;

  public show_input = true;
  public please_wait = false;

  public trivyshow_input = true;
  public trivyplease_wait = false;
  public bugcrowdshow_input = true;
  public bugcrowdplease_wait = false;
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
  public jiraxmlshow_input = true;
  public jiraxmlplease_wait = false;

  file: any;
  hide = true;
  sour: Importsource[] = [
    { value: 'vulnrepojson', viewValue: 'VULNRΞPO (.VULN)' },
    { value: 'burp', viewValue: 'Burp Suite (.XML)' },
    { value: 'bugcrowd', viewValue: 'Bugcrowd (.CSV)' },
    { value: 'nmap', viewValue: 'Nmap (.XML)' },
    { value: 'openvas', viewValue: 'OpenVAS 9 (.XML)' },
    { value: 'nessus_xml', viewValue: 'Tenable Nessus (.NESSUS)' },
    { value: 'nessus', viewValue: 'Tenable Nessus (.CSV)' },
    { value: 'trivy', viewValue: 'Trivy (.JSON)' },
    { value: 'jira_xml', viewValue: 'Jira (.XML)' }
  ];

  constructor(public dialogRef: MatDialogRef<DialogImportComponent>, public datePipe: DatePipe,
    private currentdateService: CurrentdateService) { }

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
    const info = parsedCsv.map((res, key) => {

      const def = {
        title: res[7],
        poc: res[4],
        files: [],
        desc: res[8] + '\n\n' + res[9],
        severity: res[3],
        ref: res[11],
        cvss: res[2],
        cvss_vector: '',
        cve: res[1],
        tags: [],
        bounty: [],
        date: this.currentdateService.getcurrentDate()
      };

      return def;
    });

    info.splice(info.length - 1, 1);
    info.splice(0, 1);
    this.dialogRef.close(info);

  }

  bugcrowdonFileSelect(input: HTMLInputElement) {
    const files = input.files;
    if (files && files.length) {
      this.bugcrowdshow_input = false;
      this.bugcrowdplease_wait = true;
      const fileToRead = files[0];
      const fileReader = new FileReader();
      fileReader.onload = this.onFileLoad;
      fileReader.onload = (e) => {
        this.parsebugcrowd(fileReader.result);
      };
      fileReader.readAsText(fileToRead, 'UTF-8');
    }
  }


  
  parsebugcrowd(csv) {
    
    const csvData = csv || '';
    let m: any;
    const issuelist = [];
    let text = csvData.substring(csvData.indexOf("\n") + 1);
    text = text.replace(/, /g,'. ');
    

    function setseverity(severity: string) {

      if (severity === "5") {
        severity = "Info";
      } else if (severity === "4") {
        severity = "Low";
      } else if (severity === "3") {
        severity = "Medium";
      } else if (severity === "2") {
        severity = "High";
      } else if (severity === "1") {
        severity = "Critical";
      }

      return severity;
    }


    const regex = /(.*),(.*),(.*),(.*),(.*),(.*),([\S\s]*?),([\S\s]*?),(.*),(.*),(.*),(.*),(.*)/gm;
    while ((m = regex.exec(text)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        
        const def = {
          title: m[4],
          poc: m[6] + "\n\n" + m[8],
          files: [],
          desc: m[7],
          severity: setseverity(m[11]),
          ref: 'https://bugcrowd.com/vulnerability-rating-taxonomy',
          cvss: '',
          cvss_vector: '',
          cve: '',
          tags: [{name: 'bugcrowd'}],
          bounty: [],
          date: this.currentdateService.getcurrentDate()
        };

        issuelist.push(def);

    }
    this.dialogRef.close(issuelist);

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


    function stripHtml(html)
    {
       let tmp = document.createElement("DIV");
       tmp.innerHTML = html;
       return tmp.textContent || tmp.innerText || "";
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

    const info = emp.map((res, key) => {

      let item = '';
      if (res.vulnerabilityClassifications !== undefined) {
        item = stripHtml(res.vulnerabilityClassifications[0]);
      } else {
        item = '';
      }

      let itempoc = '';
      if (res.issueDetail !== undefined) {
        itempoc = stripHtml(res.issueDetail[0]);
      } else {
        itempoc = '';
      }

      let itemrem = '';
      if (res.remediationBackground !== undefined) {
        itemrem = stripHtml(res.remediationBackground[0]);
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
        desc: stripHtml(res.issueBackground[0]) + '\n\n' + itemrem,
        severity: res.severity[0],
        ref: item,
        cvss: setcvss(res.severity[0]),
        cvss_vector: '',
        cve: '',
        tags: [],
        bounty: [],
        date: this.currentdateService.getcurrentDate()
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

function isarr(arr) {
  return Array.isArray(arr)
}

    const info = xml.map((res, key) => {
      let zref = "";
      if(res.nvt[0].xref || res.nvt[0].refs) {

        let references = res.nvt[0].xref ?? res.nvt[0].refs[0].ref;
        references.forEach(function (value) {
          if(value.$.id) {
            zref = zref + value.$.id +"\n"
          }
          
        }); 

      }

      //title
      var res_name = "";
      if (isarr(res.name) == true) {
        res_name = res.name[0];
      }
      if (isarr(res.name) == false) {
        res_name = res.name;
      }

      //desc
      var res_desc = "";
      if (isarr(res.description) == true) {
        res_desc = res.description[0];
      }
      if (isarr(res.description) == false) {
        res_desc = res.description;
      }

      //severity
      if (res.threat[0] == 'Log') {
        res.threat[0] = 'Info';
      }

      const def = {
        title: res_name,
        poc: res.port[0] + '\n\n' + res.host[0]._,
        files: [],
        desc: res_desc,
        severity: res.threat[0],
        ref: zref,
        cvss: res.severity[0],
        cvss_vector: '',
        cve: '',
        tags: [],
        bounty: [],
        date: this.currentdateService.getcurrentDate()
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


      let out_ip = 'Output:\n\n';
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
        poc: out_hosts + "\n\n" + out_ip,
        files: [],
        desc: res[5],
        severity: res[8].toString(),
        ref: res[7],
        cvss: res[3],
        cvss_vector: '',
        cve: '',
        tags: [],
        bounty: [],
        date: this.currentdateService.getcurrentDate()
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
    
    // only state up ip's
    if(this.checked) {
      const getUp = hosts.filter(function (el) {
        return (el.status[0]['$'].state === 'up');
      });
      hosts=getUp;
    }

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
        cvss_vector: '',
        cve: '',
        tags: [],
        bounty: [],
        date: this.currentdateService.getcurrentDate()
      };

      return def;
    });

    this.dialogRef.close(info);

  }

  trivyonFileSelect(input: HTMLInputElement) {

    const files = input.files;
    if (files && files.length) {
      this.trivyshow_input = false;
      this.trivyplease_wait = true;

      const fileToRead = files[0];

      const fileReader = new FileReader();
      fileReader.onload = this.onFileLoad;


      fileReader.onload = (e) => {
        this.trivyparse(fileReader.result);
      };

      fileReader.readAsText(fileToRead, 'UTF-8');
    }

  }

  trivyparse(json) {
    
    const data = JSON.parse(json);
    const issuelist = [];

    function setseverity(severity: string) {

      if (severity === "INFO") {
        severity = "Info";
      } else if (severity === "LOW") {
        severity = "Low";
      } else if (severity === "MEDIUM") {
        severity = "Medium";
      } else if (severity === "HIGH") {
        severity = "High";
      } else if (severity === "CRITICAL") {
        severity = "Critical";
      }

      return severity;
    }


    data.Results.forEach((myObject, index) => {

      const intvulns = [];
      myObject.Vulnerabilities.forEach((myObject2, index) => {


        if (Object.values(intvulns).indexOf(myObject2.VulnerabilityID) > -1) {
          // console.log('has VulnerabilityID');
        } else {
          const reff = myObject2.References.join("\n"); 
          let cvss = '';

          if (typeof myObject2.CVSS !== 'undefined') {
            if (typeof myObject2.CVSS.nvd !== 'undefined') {
              cvss = myObject2.CVSS.nvd.V3Score;
            }
  
          }

          const def = {
            title: myObject2.Title,
            poc: 'Target: ' + myObject.Target + '\nClass: ' + myObject.Class + '\nType: ' + myObject.Type + '\nPkgID: ' + myObject2.PkgID + '\nPkgName: ' + myObject2.PkgName + '\nInstalled Version: ' + myObject2.InstalledVersion + '\nFixed Version: ' + myObject2.FixedVersion + '\n',
            files: [],
            desc: myObject2.Description,
            severity: setseverity(myObject2.Severity),
            ref: reff,
            cvss: cvss,
            cvss_vector: '',
            cve: '',
            tags: [],
            bounty: [],
            date: this.currentdateService.getcurrentDate()
          };
  
          intvulns.push(myObject2.VulnerabilityID);
          issuelist.push(def);
        }
        
      });
      
    });





    this.dialogRef.close(issuelist);

  }

  jiraxmlonFileSelect(input: HTMLInputElement) {

    const files = input.files;
    if (files && files.length) {
      this.jiraxmlshow_input = false;
      this.jiraxmlplease_wait = true;

      const fileToRead = files[0];

      const fileReader = new FileReader();
      fileReader.onload = this.onFileLoad;

      fileReader.onload = (e) => {
        this.parseJiraxml(fileReader.result);
      };

      fileReader.readAsText(fileToRead, 'UTF-8');
    }

  }

  parseJiraxml(xml) {
    let xmltojson = [];
    const parser = new xml2js.Parser({ strict: true, trim: true });
    parser.parseString(xml, (err, result) => {
      xmltojson = result.rss.channel[0].item;
    });

    const info = xmltojson.map((res, key) => {

      //severity
      if (res.priority[0]._.toString() === 'Blocker') {
        res.priority[0]._ = 'Critical';
      }
      if (res.priority[0]._.toString() === 'Major') {
        res.priority[0]._ = 'High';
      }
      if (res.priority[0]._.toString() === 'Minor') {
        res.priority[0]._ = 'Medium';
      }
      if (res.priority[0]._.toString() === 'Trivial') {
        res.priority[0]._ = 'Low';
      }

      const rrr = res.description[0].split('POC:');
      let nn2 = "";
      if (rrr[1] == undefined) {
        nn2 = rrr[0].split('\n\n');
      } else {
        nn2 = rrr[1].split('\n\n');
      }

      if (nn2[0] === rrr[0]) {
        rrr[0] = "";
      }

      //remove HTML tags 
      let html_desc = rrr[0];
      let div = document.createElement("div");
      div.innerHTML = html_desc;
      let html_poc = nn2[0];
      let div2 = document.createElement("div");
      div2.innerHTML = html_poc;


      //extract ref
      const exref = res.description[0].split('Reference:');
      let refn = "";
      if (exref[1] == undefined) {
        refn = exref[0].split('\n\n');
      } else {
        refn = exref[1].split('\n\n');
      }
      if (exref[0] === nn2[0]) {
        refn = "";
      }
      if (exref[0] === rrr[0]) {
        refn = "";
      }

      let html_ref = refn;
      let div3 = document.createElement("div");
      div3.innerHTML = html_ref;

      const def = {
        title: res.summary[0],
        poc: div2.innerText,
        files: [],
        desc: div.innerText,
        severity: res.priority[0]._,
        ref: div3.innerText + '\n' + res.link[0],
        cvss: '',
        cvss_vector: '',
        cve: '',
        tags: [],
        bounty: [],
        date: this.currentdateService.getcurrentDate()
      };

      return def;
    });

    this.dialogRef.close(info);

  }

}
