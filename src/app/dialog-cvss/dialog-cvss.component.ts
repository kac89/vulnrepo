import { Component, OnInit, ViewChild, AfterViewInit  } from '@angular/core';
import { Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { UntypedFormControl } from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-dialog-cvss',
  templateUrl: './dialog-cvss.component.html',
  styleUrls: ['./dialog-cvss.component.scss']
})

export class DialogCvssComponent implements OnInit {

  @ViewChild('tooltip') tooltip: MatTooltip;

  selectedAnswers = [];
  selectedItem: string;
  show = false;
  mobile = false;
  severity: string;
  basescore: number;
  AVvalue: any;
  ACvalue: any;
  PRvalue: any;
  UIvalue: any;
  Svalue: any;
  Cvalue: any;
  Ivalue: any;
  Avalue: any;
  scorevector = new UntypedFormControl();

  AV: any[] = [['Network (N)', 'A vulnerability exploitable with network access means the vulnerable component is bound to the network stack and the attacker\'s path is through OSI layer 3 (the network layer). Such a vulnerability is often termed "remotely exploitable" and can be thought of as an attack being exploitable one or more network hops away (e.g. across layer 3 boundaries from routers). An example of a network attack is an attacker causing a denial of service (DoS) by sending a specially crafted TCP packet from across the public Internet (e.g. CVE 2004 0230).', 0.85, 'N', false],
              ['Adjacent', 'A vulnerability exploitable with adjacent network access means the vulnerable component is bound to the network stack, however the attack is limited to the same shared physical (e.g. Bluetooth, IEEE 802.11), or logical (e.g. local IP subnet) network, and cannot be performed across an OSI layer 3 boundary (e.g. a router). An example of an Adjacent attack would be an ARP (IPv4) or neighbor discovery (IPv6) flood leading to a denial of service on the local LAN segment. See also CVE 2013 6014.', 0.62, 'A', false],
              ['Local (L)', 'A vulnerability exploitable with Local access means that the vulnerable component is not bound to the network stack, and the attacker\'s path is via read/write/execute capabilities. In some cases, the attacker may be logged in locally in order to exploit the vulnerability, otherwise, she may rely on User Interaction to execute a malicious file.', 0.55, 'L', false],
              ['Physical (P)', 'A vulnerability exploitable with Physical access requires the attacker to physically touch or manipulate the vulnerable component. Physical interaction may be brief (e.g. evil maid attack [1]) or persistent. An example of such an attack is a cold boot attack which allows an attacker to access to disk encryption keys after gaining physical access to the system, or peripheral attacks such as Firewire/USB Direct Memory Access attacks.', 0.2, 'P', false]];

  AC: any[] = [['Low (L)', 'Specialized access conditions or extenuating circumstances do not exist. An attacker can expect repeatable success against the vulnerable component.', 0.77, 'L', false],
              ['High (H)', 'A successful attack depends on conditions beyond the attacker\'s control. That is, a successful attack cannot be accomplished at will, but requires the attacker to invest in some measurable amount of effort in preparation or execution against the vulnerable component before a successful attack can be expected. 2 For example, a successful attack may depend on an attacker overcoming any of the following conditions:\n- The attacker must conduct target-specific reconnaissance. For example, on target configuration settings, sequence numbers, shared secrets, etc.\n- The attacker must prepare the target environment to improve exploit reliability. For example, repeated exploitation to win a race condition, or overcoming advanced exploit mitigation techniques.\n- The attacker must inject herself into the logical network path between the target and the resource requested by the victim in order to read and/or modify network communications (e.g. man in the middle attack).', 0.44, 'H', false]];

  PR: any[] = [['None (N)', 'The attacker is unauthorized prior to attack, and therefore does not require any access to settings or files to carry out an attack.', 0.85, 'N', false],
              ['Low (L)', 'The attacker is authorized with (i.e. requires) privileges that provide basic user capabilities that could normally affect only settings and files owned by a user. Alternatively, an attacker with Low privileges may have the ability to cause an impact only to non-sensitive resources.', [0.62, 0.68], 'L', false],
              ['High (H)', 'The attacker is authorized with (i.e. requires) privileges that provide significant (e.g. administrative) control over the vulnerable component that could affect component-wide settings and files.', [0.27, 0.5], 'H', false]];

  UI: any[] = [['None (N)', 'The vulnerable system can be exploited without interaction from any user.', 0.85, 'N', false],
              ['Required (R)', 'Successful exploitation of this vulnerability requires a user to take some action before the vulnerability can be exploited. For example, a successful exploit may only be possible during the installation of an application by a system administrator.', 0.62, 'R', false]];

  S: any[] = [['Unchanged (U)', 'An exploited vulnerability can only affect resources managed by the same authority. In this case the vulnerable component and the impacted component are the same.', [true, 6.42], 'U', false], ['Changed (C)', 'An exploited vulnerability can affect resources beyond the authorization privileges intended by the vulnerable component. In this case the vulnerable component and the impacted component are different.', [false, 7.52], 'C', false]];

  C: any[] = [['High (H)', 'There is total loss of confidentiality, resulting in all resources within the impacted component being divulged to the attacker. Alternatively, access to only some restricted information is obtained, but the disclosed information presents a direct, serious impact. For example, an attacker steals the administrator\'s password, or private encryption keys of a web server.', 0.56, 'H', false],
             ['Low (L)', 'There is some loss of confidentiality. Access to some restricted information is obtained, but the attacker does not have control over what information is obtained, or the amount or kind of loss is constrained. The information disclosure does not cause a direct, serious loss to the impacted component.', 0.22, 'L', false],
             ['None (N)', 'There is no loss of confidentiality within the impacted component.', 0, 'N', false]];

  I: any[] = [['High (H)', 'There is a total loss of integrity, or a complete loss of protection. For example, the attacker is able to modify any/all files protected by the impacted component. Alternatively, only some files can be modified, but malicious modification would present a direct, serious consequence to the impacted component.', 0.56, 'H', false],
             ['Low (L)', 'Modification of data is possible, but the attacker does not have control over the consequence of a modification, or the amount of modification is constrained. The data modification does not have a direct, serious impact on the impacted component.', 0.22, 'L', false],
             ['None (N)', 'There is no loss of integrity within the impacted component.', 0, 'N', false]];

  A: any[] = [['High (H)', 'There is total loss of availability, resulting in the attacker being able to fully deny access to resources in the impacted component; this loss is either sustained (while the attacker continues to deliver the attack) or persistent (the condition persists even after the attack has completed). Alternatively, the attacker has the ability to deny some availability, but the loss of availability presents a direct, serious consequence to the impacted component (e.g., the attacker cannot disrupt existing connections, but can prevent new connections; the attacker can repeatedly exploit a vulnerability that, in each instance of a successful attack, leaks a only small amount of memory, but after repeated exploitation causes a service to become completely unavailable).', 0.56, 'H', false],
             ['Low (L)', 'There is reduced performance or interruptions in resource availability. Even if repeated exploitation of the vulnerability is possible, the attacker does not have the ability to completely deny service to legitimate users. The resources in the impacted component are either partially available all of the time, or fully available only some of the time, but overall there is no direct, serious consequence to the impacted component.', 0.22, 'L', false],
             ['None (N)', 'There is no impact to availability within the impacted component.', 0, 'N', false]];

  constructor(public router: Router, public dialogRef: MatDialogRef<DialogCvssComponent>,
    @Inject(MAT_DIALOG_DATA) public data) { }

  ngOnInit() {
    window.onresize = () => this.mobile = window.innerWidth <= 1024;
    //this.scorevector.disable();

    if (this.data.cvss_vector !== undefined && this.data.cvss_vector !== '') {
      this.scorevector.setValue(this.data.cvss_vector);
    } else {
      this.scorevector.setValue('CVSS:3.1/AV:_/AC:_/PR:_/UI:_/S:_/C:_/I:_/A:_');
    }
  }
  ngAfterViewInit(){
    setTimeout(() => this.refreshfromvector(this.data.cvss_vector));
  }
  copyText() {
    setTimeout(() => {
      this.tooltip.show();
      this.tooltip.message = "Copied!";
      });
    setTimeout(() => {
      this.tooltip.hide();
      this.tooltip.message = "Copy to clipboard";
    }, 2000);
  }

  refreshfromvector(vector) {
    const regex = new RegExp('\\\/AV:(\\w)\\\/AC:(\\w)\\\/PR:(\\w)\\\/UI:(\\w)\\\/S:(\\w)\\\/C:(\\w)\\\/I:(\\w)\\\/A:(\\w)', '');
    let m;
    
    if ((m = regex.exec(vector)) !== null) {
        m.forEach((match, groupIndex) => {
            //console.log(`Found match, group ${groupIndex}: ${match}`);
            if (groupIndex === 1) {
              this.AV = this.setselected(this.AV, match);
              const val = this.AV.filter(item => item[3] === match);
              this.AVvalue = val[0][2];
            } else if (groupIndex === 2) {
              this.AC = this.setselected(this.AC, match);
              const val = this.AC.filter(item => item[3] === match);
              this.ACvalue = val[0][2];
            } else if (groupIndex === 3) {
              this.PR = this.setselected(this.PR, match);
              const val = this.PR.filter(item => item[3] === match);
              this.PRvalue = val[0][2];
            } else if (groupIndex === 4) {
              this.UI = this.setselected(this.UI, match);
              const val = this.UI.filter(item => item[3] === match);
              this.UIvalue = val[0][2];
            } else if (groupIndex === 5) {
              this.S = this.setselected(this.S, match);
              const val = this.S.filter(item => item[3] === match);
              this.Svalue = val[0][2];
            } else if (groupIndex === 6) {
              this.C = this.setselected(this.C, match);
              const val = this.C.filter(item => item[3] === match);
              this.Cvalue = val[0][2];
            } else if (groupIndex === 7) {
              this.I = this.setselected(this.I, match);
              const val = this.I.filter(item => item[3] === match);
              this.Ivalue = val[0][2];
            } else if (groupIndex === 8) {
              this.A = this.setselected(this.A, match);
              const val = this.A.filter(item => item[3] === match);
              this.Avalue = val[0][2];
            }
        });

        
    }
    this.calcit();
    //
  }

  setselected(arr, vector) {

    for (let i = 0; i < arr.length; i++) {
      if (arr[i][3] === vector) {
        arr[i][4] = true;
      } else {
        arr[i][4] = false;
      }
    }

    return arr
  }

  changevector(vector, event) {
    const regex = new RegExp("\/"+vector+':(\\w)', 'gi');
    const newstr = this.scorevector.value.replace("\/"+vector+":_", "/"+vector+":"+event);
    const newstr2 = newstr.replace(regex, "\/"+vector+":"+event);
    this.scorevector.setValue(newstr2);

  }



  AVonclick(event) {
    this.selectedItem = event[0] + ': ' + event[1];
    this.AVvalue = event[2];
    this.calcit();
    this.changevector("AV", event[3]);
  }
  AConclick(event) {
    this.selectedItem = event[0] + ': ' + event[1];
    this.ACvalue = event[2];
    this.calcit();
    this.changevector("AC", event[3]);
  }
  PRonclick(event) {
    this.selectedItem = event[0] + ': ' + event[1];
    this.PRvalue = event[2];
    this.calcit();
    this.changevector("PR", event[3]);
  }
  UIonclick(event) {
    this.selectedItem = event[0] + ': ' + event[1];
    this.UIvalue = event[2];
    this.calcit();
    this.changevector("UI", event[3]);
  }

  Sonclick(event) {
    this.selectedItem = event[0] + ': ' + event[1];
    this.Svalue = event[2];
    this.calcit();
    this.changevector("S", event[3]);
  }
  Conclick(event) {
    this.selectedItem = event[0] + ': ' + event[1];
    this.Cvalue = event[2];
    this.calcit();
    this.changevector("C", event[3]);
  }
  Ionclick(event) {
    this.selectedItem = event[0] + ': ' + event[1];
    this.Ivalue = event[2];
    this.calcit();
    this.changevector("I", event[3]);
  }
  Aonclick(event) {
    this.selectedItem = event[0] + ': ' + event[1];
    this.Avalue = event[2];
    this.calcit();
    this.changevector("A", event[3]);
  }


  calcit() {

    const severityRatings = [{
      name: 'Info',
      bottom: 0.0,
      top: 0.0
  }, {
      name: 'Low',
      bottom: 0.1,
      top: 3.9
  }, {
      name: 'Medium',
      bottom: 4.0,
      top: 6.9
  }, {
      name: 'High',
      bottom: 7.0,
      top: 8.9
  }, {
      name: 'Critical',
      bottom: 9.0,
      top: 10.0
  }];

    if (this.AVvalue !== undefined && this.ACvalue !== undefined && this.PRvalue !== undefined &&
        this.UIvalue !== undefined && this.Svalue !== undefined && this.Cvalue !== undefined && this.Ivalue !== undefined
        && this.Avalue !== undefined) {

        if (this.Svalue[0] === true) {
        // unchange
          if (this.PRvalue[0]) {
            this.PRvalue = this.PRvalue[0];
          }
        } else if (this.Svalue[0] === false) {
          // change
            if (this.PRvalue[1]) {
              this.PRvalue = this.PRvalue[1];
            }
        }
          const exploitabilityCoefficient = 8.22;
          const scopeCoefficient = 1.08;
          let impactSubScore: number;
          // tslint:disable-next-line:max-line-length
          const exploitabalitySubScore = exploitabilityCoefficient * Number(this.AVvalue) * Number(this.ACvalue) * Number(this.PRvalue) * Number(this.UIvalue);
          const impactSubScoreMultiplier = (1 - ((1 - Number(this.Cvalue)) * (1 - Number(this.Ivalue)) * (1 - Number(this.Avalue))));

          if (this.Svalue[0] === true) {
             impactSubScore = Number(this.Svalue[1]) * impactSubScoreMultiplier;
        } else {
             // tslint:disable-next-line:max-line-length
             impactSubScore = Number(this.Svalue[1]) * (impactSubScoreMultiplier - 0.029) - 3.25 * Math.pow(impactSubScoreMultiplier - 0.02, 15);
        }

        if (impactSubScore <= 0) {
          this.basescore = 0;
        } else {
          if (this.Svalue[0]) {
              this.basescore = Math.min((exploitabalitySubScore + impactSubScore), 10);
          } else {
              this.basescore = Math.min((exploitabalitySubScore + impactSubScore) * scopeCoefficient, 10);
          }
      }

      this.basescore = Math.ceil(this.basescore * 10) / 10;
      this.show = true;
      for (let _i = 0; _i < severityRatings.length; _i++) {
          if (severityRatings[_i].bottom <= this.basescore &&  severityRatings[_i].top >= this.basescore) {
            this.severity = severityRatings[_i].name;
          }
      }

    }

  }

  save(cvss: number, severity: string, scorevector: string) {
    this.data.cvss = cvss;
    this.data.cvss_vector = scorevector;
    this.data.severity = severity;
    this.dialogRef.close(this.data);
  }

}
