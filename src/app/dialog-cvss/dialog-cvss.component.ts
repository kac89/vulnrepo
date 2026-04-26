import { Component, OnInit, ViewChild, AfterViewInit  } from '@angular/core';
import { Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { UntypedFormControl } from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';

// ── CVSS 4.0 lookup table (MacroVector → score) ───────────────────────────────
const CVSS40_LOOKUP: {[key: string]: number} = {
  '000000': 10,   '000001': 9.9,  '000010': 9.8,  '000011': 9.5,
  '000020': 9.5,  '000021': 9.2,  '001000': 10,   '001001': 9.6,
  '001010': 9.3,  '001011': 8.7,  '001020': 9.1,  '001021': 8.1,
  '002001': 8.6,  '002011': 7.4,  '002021': 7.3,  '002010': 7.5,
  '002020': 7.4,  '002000': 8.3,  '010000': 9.8,  '010001': 9.5,
  '010010': 9.4,  '010011': 8.7,  '010020': 9.2,  '010021': 8.2,
  '011000': 9.5,  '011001': 9.1,  '011010': 8.3,  '011011': 7.1,
  '011020': 8.2,  '011021': 7.0,  '012001': 7.1,  '012011': 5.9,
  '012021': 5.9,  '012010': 6.6,  '012020': 6.5,  '012000': 6.7,
  '100000': 9.8,  '100001': 9.5,  '100010': 9.2,  '100011': 8.4,
  '100020': 9.0,  '100021': 8.0,  '101000': 9.3,  '101001': 9.0,
  '101010': 8.1,  '101011': 6.8,  '101020': 7.9,  '101021': 6.7,
  '102001': 6.9,  '102011': 5.8,  '102021': 5.7,  '102010': 6.4,
  '102020': 6.3,  '102000': 6.5,  '110000': 9.5,  '110001': 9.0,
  '110010': 8.3,  '110011': 7.1,  '110020': 8.3,  '110021': 6.9,
  '111000': 9.2,  '111001': 8.5,  '111010': 7.4,  '111011': 5.6,
  '111020': 7.2,  '111021': 5.5,  '112001': 5.7,  '112011': 4.5,
  '112021': 4.5,  '112010': 5.2,  '112020': 5.2,  '112000': 5.3,
  '200000': 9.4,  '200001': 8.9,  '200010': 8.6,  '200011': 7.4,
  '200020': 7.7,  '200021': 6.4,  '201000': 8.7,  '201001': 7.6,
  '201010': 6.7,  '201011': 5.2,  '201020': 6.5,  '201021': 5.1,
  '202001': 5.5,  '202011': 4.1,  '202021': 4.0,  '202010': 4.8,
  '202020': 4.8,  '202000': 4.9,  '210000': 9.2,  '210001': 8.5,
  '210010': 7.2,  '210011': 5.3,  '210020': 7.2,  '210021': 5.3,
  '211000': 8.5,  '211001': 7.4,  '211010': 6.0,  '211011': 4.5,
  '211020': 6.0,  '211021': 4.2,  '212001': 4.6,  '212011': 3.3,
  '212021': 3.3,  '212010': 4.4,  '212020': 4.4,  '212000': 4.5,
};

function cvss40eq1(AV: string, PR: string, UI: string): number {
  if (AV === 'N' && PR === 'N' && UI === 'N') return 0;
  if ((AV === 'N' || PR === 'N' || UI === 'N') && !(AV === 'N' && PR === 'N' && UI === 'N') && AV !== 'P') return 1;
  return 2;
}

function cvss40eq2(AC: string, AT: string): number {
  if (AC === 'L' && AT === 'N') return 0;
  return 1;
}

function cvss40eq3(VC: string, VI: string, VA: string): number {
  if (VC === 'H' && VI === 'H') return 0;
  if ((VC === 'H' || VI === 'H' || VA === 'H') && !(VC === 'H' && VI === 'H')) return 1;
  return 2;
}

function cvss40eq4(SC: string, SI: string, SA: string): number {
  if (SC === 'H' || SI === 'H' || SA === 'H') return 0;
  if (SC === 'L' || SI === 'L' || SA === 'L') return 1;
  return 2;
}

function cvss40eq5(): number {
  // E defaults to 'A' for base score
  return 0;
}

function cvss40eq6(VC: string, VI: string, VA: string): number {
  // CR=H, IR=H, AR=H for base score
  if (VC === 'H' || VI === 'H' || VA === 'H') return 0;
  return 1;
}

function calcCVSS40Score(m: {AV: string, AC: string, AT: string, PR: string, UI: string,
                              VC: string, VI: string, VA: string, SC: string, SI: string, SA: string}): number {
  if (m.VC === 'N' && m.VI === 'N' && m.VA === 'N' &&
      m.SC === 'N' && m.SI === 'N' && m.SA === 'N') return 0;
  const eq1v = cvss40eq1(m.AV, m.PR, m.UI);
  const eq2v = cvss40eq2(m.AC, m.AT);
  const eq3v = cvss40eq3(m.VC, m.VI, m.VA);
  const eq4v = cvss40eq4(m.SC, m.SI, m.SA);
  const eq5v = cvss40eq5();
  const eq6v = cvss40eq6(m.VC, m.VI, m.VA);
  // Key order: EQ1 EQ2 EQ3 EQ5 EQ4 EQ6
  // EQ5 is always 0 (E=A) for base score, occupying position 3 in the table
  const key = `${eq1v}${eq2v}${eq3v}${eq5v}${eq4v}${eq6v}`;
  const score = CVSS40_LOOKUP[key];
  return score !== undefined ? score : 0;
}

@Component({
  standalone: false,
  //imports: [],
  selector: 'app-dialog-cvss',
  templateUrl: './dialog-cvss.component.html',
  styleUrls: ['./dialog-cvss.component.scss']
})

export class DialogCvssComponent implements OnInit {

  @ViewChild('tooltip') tooltip: MatTooltip;

  // ── Shared state ─────────────────────────────────────────────────────────────
  selectedAnswers = [];
  selectedItem: string;
  show = false;
  mobile = false;
  severity: string;
  basescore: number;
  cvssVersion: '4.0' | '3.1' = '4.0';

  // ── CVSS 3.1 metric values ───────────────────────────────────────────────────
  AVvalue: any;
  ACvalue: any;
  PRvalue: any;
  UIvalue: any;
  Svalue: any;
  Cvalue: any;
  Ivalue: any;
  Avalue: any;
  scorevector = new UntypedFormControl();

  // ── CVSS 4.0 metric values (short code strings) ──────────────────────────────
  AV4value: string;
  AC4value: string;
  AT4value: string;
  PR4value: string;
  UI4value: string;
  VC4value: string;
  VI4value: string;
  VA4value: string;
  SC4value: string;
  SI4value: string;
  SA4value: string;
  scorevector40 = new UntypedFormControl();

  // ── CVSS 3.1 metric arrays [label, description, numericValue, code, selected] ─
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

  // ── CVSS 4.0 metric arrays [label, description, code, selected] ──────────────
  AV4: any[] = [
    ['Network (N)', 'The vulnerable component is bound to the network stack and the attacker\'s path is through OSI layer 3.', 'N', false],
    ['Adjacent (A)', 'The vulnerable component is bound to the network stack, but the attack is limited to the same shared physical or logical network.', 'A', false],
    ['Local (L)', 'The vulnerable component is not bound to the network stack, and the attacker\'s path is via read/write/execute capabilities.', 'L', false],
    ['Physical (P)', 'The attack requires the attacker to physically touch or manipulate the vulnerable component.', 'P', false],
  ];

  AC4: any[] = [
    ['Low (L)', 'The attacker must take no measurable steps to alter the execution environment. The attack can be repeated reliably.', 'L', false],
    ['High (H)', 'The attack depends on evasion or circumvention of protection mechanisms or the collection of more information to carry out the attack.', 'H', false],
  ];

  AT4: any[] = [
    ['None (N)', 'The successful attack does not depend on the deployment and execution conditions of the vulnerable system.', 'N', false],
    ['Present (P)', 'The successful attack depends on the presence of a specific deployment and execution conditions.', 'P', false],
  ];

  PR4: any[] = [
    ['None (N)', 'The attacker is unauthorized prior to attack, and therefore does not require any access to the system.', 'N', false],
    ['Low (L)', 'The attacker requires privileges that provide basic capabilities.', 'L', false],
    ['High (H)', 'The attacker requires privileges that provide significant control.', 'H', false],
  ];

  UI4: any[] = [
    ['None (N)', 'The vulnerable system can be exploited without any interaction from any human.', 'N', false],
    ['Passive (P)', 'Successful exploitation requires limited interaction by a targeted user with the vulnerable component.', 'P', false],
    ['Active (A)', 'Successful exploitation requires a targeted user to perform specific, conscious interactions with the vulnerable system.', 'A', false],
  ];

  VC4: any[] = [
    ['High (H)', 'Total loss of confidentiality in the vulnerable system.', 'H', false],
    ['Low (L)', 'Some loss of confidentiality in the vulnerable system.', 'L', false],
    ['None (N)', 'No loss of confidentiality in the vulnerable system.', 'N', false],
  ];

  VI4: any[] = [
    ['High (H)', 'Total loss of integrity in the vulnerable system.', 'H', false],
    ['Low (L)', 'Some loss of integrity in the vulnerable system.', 'L', false],
    ['None (N)', 'No loss of integrity in the vulnerable system.', 'N', false],
  ];

  VA4: any[] = [
    ['High (H)', 'Total loss of availability in the vulnerable system.', 'H', false],
    ['Low (L)', 'Some loss of availability in the vulnerable system.', 'L', false],
    ['None (N)', 'No loss of availability in the vulnerable system.', 'N', false],
  ];

  SC4: any[] = [
    ['High (H)', 'Total loss of confidentiality in downstream systems.', 'H', false],
    ['Low (L)', 'Some loss of confidentiality in downstream systems.', 'L', false],
    ['None (N)', 'No loss of confidentiality in downstream systems.', 'N', false],
  ];

  SI4: any[] = [
    ['High (H)', 'Total loss of integrity in downstream systems.', 'H', false],
    ['Low (L)', 'Some loss of integrity in downstream systems.', 'L', false],
    ['None (N)', 'No loss of integrity in downstream systems.', 'N', false],
  ];

  SA4: any[] = [
    ['High (H)', 'Total loss of availability in downstream systems.', 'H', false],
    ['Low (L)', 'Some loss of availability in downstream systems.', 'L', false],
    ['None (N)', 'No loss of availability in downstream systems.', 'N', false],
  ];

  // @ts-ignore
  constructor(@Inject(MAT_DIALOG_DATA) public data, public router: Router, public dialogRef: MatDialogRef<DialogCvssComponent>) { }

  ngOnInit() {
    window.onresize = () => this.mobile = window.innerWidth <= 1024;

    const vec: string = this.data.cvss_vector;

    if (vec && vec.startsWith('CVSS:4.0/')) {
      this.cvssVersion = '4.0';
      this.scorevector40.setValue(vec);
      this.scorevector.setValue('CVSS:3.1/AV:_/AC:_/PR:_/UI:_/S:_/C:_/I:_/A:_');
    } else if (vec && vec.startsWith('CVSS:3.1/')) {
      this.cvssVersion = '3.1';
      this.scorevector.setValue(vec);
      this.scorevector40.setValue('CVSS:4.0/AV:_/AC:_/AT:_/PR:_/UI:_/VC:_/VI:_/VA:_/SC:_/SI:_/SA:_');
    } else {
      this.cvssVersion = '4.0';
      this.scorevector40.setValue('CVSS:4.0/AV:_/AC:_/AT:_/PR:_/UI:_/VC:_/VI:_/VA:_/SC:_/SI:_/SA:_');
      this.scorevector.setValue('CVSS:3.1/AV:_/AC:_/PR:_/UI:_/S:_/C:_/I:_/A:_');
    }
  }

  ngAfterViewInit() {
    const vec: string = this.data.cvss_vector;
    if (vec && vec.startsWith('CVSS:4.0/')) {
      setTimeout(() => this.refreshfromvector40(vec));
    } else if (vec && vec.startsWith('CVSS:3.1/')) {
      setTimeout(() => this.refreshfromvector(vec));
    }
  }

  // ── Version switching ─────────────────────────────────────────────────────────
  switchVersion(version: '4.0' | '3.1') {
    if (this.cvssVersion === version) return;
    this.cvssVersion = version;
    this.show = false;
    this.basescore = undefined;
    this.severity = undefined;

    if (version === '4.0') {
      // Reset 4.0 selections
      this.AV4 = this.resetSelections(this.AV4);
      this.AC4 = this.resetSelections(this.AC4);
      this.AT4 = this.resetSelections(this.AT4);
      this.PR4 = this.resetSelections(this.PR4);
      this.UI4 = this.resetSelections(this.UI4);
      this.VC4 = this.resetSelections(this.VC4);
      this.VI4 = this.resetSelections(this.VI4);
      this.VA4 = this.resetSelections(this.VA4);
      this.SC4 = this.resetSelections(this.SC4);
      this.SI4 = this.resetSelections(this.SI4);
      this.SA4 = this.resetSelections(this.SA4);
      this.AV4value = undefined; this.AC4value = undefined; this.AT4value = undefined;
      this.PR4value = undefined; this.UI4value = undefined; this.VC4value = undefined;
      this.VI4value = undefined; this.VA4value = undefined; this.SC4value = undefined;
      this.SI4value = undefined; this.SA4value = undefined;
      this.scorevector40.setValue('CVSS:4.0/AV:_/AC:_/AT:_/PR:_/UI:_/VC:_/VI:_/VA:_/SC:_/SI:_/SA:_');
    } else {
      // Reset 3.1 selections
      this.AV = this.resetSelections(this.AV);
      this.AC = this.resetSelections(this.AC);
      this.PR = this.resetSelections(this.PR);
      this.UI = this.resetSelections(this.UI);
      this.S = this.resetSelections(this.S);
      this.C = this.resetSelections(this.C);
      this.I = this.resetSelections(this.I);
      this.A = this.resetSelections(this.A);
      this.AVvalue = undefined; this.ACvalue = undefined; this.PRvalue = undefined;
      this.UIvalue = undefined; this.Svalue = undefined; this.Cvalue = undefined;
      this.Ivalue = undefined; this.Avalue = undefined;
      this.scorevector.setValue('CVSS:3.1/AV:_/AC:_/PR:_/UI:_/S:_/C:_/I:_/A:_');
    }
  }

  resetSelections(arr: any[]): any[] {
    return arr.map(item => { item[item.length - 1] = false; return item; });
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

  // ── CVSS 3.1 methods ─────────────────────────────────────────────────────────
  refreshfromvector(vector) {
    const regex = new RegExp('\\\/AV:(\\w)\\\/AC:(\\w)\\\/PR:(\\w)\\\/UI:(\\w)\\\/S:(\\w)\\\/C:(\\w)\\\/I:(\\w)\\\/A:(\\w)', '');
    let m;

    if ((m = regex.exec(vector)) !== null) {
        m.forEach((match, groupIndex) => {
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
  }

  setselected(arr, vector) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i][3] === vector) {
        arr[i][4] = true;
      } else {
        arr[i][4] = false;
      }
    }
    return arr;
  }

  changevector(vector, event) {
    const regex = new RegExp("\/"+vector+':(\\w)', 'gi');
    const newstr = this.scorevector.value.replace("\/"+vector+":_", "/"+vector+":"+event);
    const newstr2 = newstr.replace(regex, "\/"+vector+":"+event);
    this.scorevector.setValue(newstr2);
  }

  AVonclick(event) { this.selectedItem = event[0] + ': ' + event[1]; this.AVvalue = event[2]; this.calcit(); this.changevector("AV", event[3]); }
  AConclick(event) { this.selectedItem = event[0] + ': ' + event[1]; this.ACvalue = event[2]; this.calcit(); this.changevector("AC", event[3]); }
  PRonclick(event) { this.selectedItem = event[0] + ': ' + event[1]; this.PRvalue = event[2]; this.calcit(); this.changevector("PR", event[3]); }
  UIonclick(event) { this.selectedItem = event[0] + ': ' + event[1]; this.UIvalue = event[2]; this.calcit(); this.changevector("UI", event[3]); }
  Sonclick(event)  { this.selectedItem = event[0] + ': ' + event[1]; this.Svalue  = event[2]; this.calcit(); this.changevector("S",  event[3]); }
  Conclick(event)  { this.selectedItem = event[0] + ': ' + event[1]; this.Cvalue  = event[2]; this.calcit(); this.changevector("C",  event[3]); }
  Ionclick(event)  { this.selectedItem = event[0] + ': ' + event[1]; this.Ivalue  = event[2]; this.calcit(); this.changevector("I",  event[3]); }
  Aonclick(event)  { this.selectedItem = event[0] + ': ' + event[1]; this.Avalue  = event[2]; this.calcit(); this.changevector("A",  event[3]); }

  calcit() {
    const severityRatings = [
      { name: 'Info',     bottom: 0.0, top: 0.0 },
      { name: 'Low',      bottom: 0.1, top: 3.9 },
      { name: 'Medium',   bottom: 4.0, top: 6.9 },
      { name: 'High',     bottom: 7.0, top: 8.9 },
      { name: 'Critical', bottom: 9.0, top: 10.0 },
    ];

    if (this.AVvalue !== undefined && this.ACvalue !== undefined && this.PRvalue !== undefined &&
        this.UIvalue !== undefined && this.Svalue !== undefined && this.Cvalue !== undefined &&
        this.Ivalue !== undefined && this.Avalue !== undefined) {

      if (this.Svalue[0] === true) {
        if (this.PRvalue[0]) { this.PRvalue = this.PRvalue[0]; }
      } else if (this.Svalue[0] === false) {
        if (this.PRvalue[1]) { this.PRvalue = this.PRvalue[1]; }
      }

      const exploitabilityCoefficient = 8.22;
      const scopeCoefficient = 1.08;
      let impactSubScore: number;
      const exploitabalitySubScore = exploitabilityCoefficient * Number(this.AVvalue) * Number(this.ACvalue) * Number(this.PRvalue) * Number(this.UIvalue);
      const impactSubScoreMultiplier = (1 - ((1 - Number(this.Cvalue)) * (1 - Number(this.Ivalue)) * (1 - Number(this.Avalue))));

      if (this.Svalue[0] === true) {
        impactSubScore = Number(this.Svalue[1]) * impactSubScoreMultiplier;
      } else {
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
        if (severityRatings[_i].bottom <= this.basescore && severityRatings[_i].top >= this.basescore) {
          this.severity = severityRatings[_i].name;
        }
      }
    }
  }

  // ── CVSS 4.0 methods ─────────────────────────────────────────────────────────

  // Index 2 = code, index 3 = selected for 4.0 arrays
  setselected40(arr: any[], code: string): any[] {
    for (let i = 0; i < arr.length; i++) {
      arr[i][3] = (arr[i][2] === code);
    }
    return arr;
  }

  changevector40(metric: string, value: string) {
    const regex = new RegExp('\\/' + metric + ':(\\w)', 'gi');
    const current = this.scorevector40.value as string;
    const replaced = current.replace('/' + metric + ':_', '/' + metric + ':' + value);
    const replaced2 = replaced.replace(regex, '/' + metric + ':' + value);
    this.scorevector40.setValue(replaced2);
  }

  refreshfromvector40(vector: string) {
    const regex = /\/AV:(\w)\/AC:(\w)\/AT:(\w)\/PR:(\w)\/UI:(\w)\/VC:(\w)\/VI:(\w)\/VA:(\w)\/SC:(\w)\/SI:(\w)\/SA:(\w)/;
    const m = regex.exec(vector);
    if (!m) return;

    this.AV4 = this.setselected40(this.AV4, m[1]);  this.AV4value = m[1];
    this.AC4 = this.setselected40(this.AC4, m[2]);  this.AC4value = m[2];
    this.AT4 = this.setselected40(this.AT4, m[3]);  this.AT4value = m[3];
    this.PR4 = this.setselected40(this.PR4, m[4]);  this.PR4value = m[4];
    this.UI4 = this.setselected40(this.UI4, m[5]);  this.UI4value = m[5];
    this.VC4 = this.setselected40(this.VC4, m[6]);  this.VC4value = m[6];
    this.VI4 = this.setselected40(this.VI4, m[7]);  this.VI4value = m[7];
    this.VA4 = this.setselected40(this.VA4, m[8]);  this.VA4value = m[8];
    this.SC4 = this.setselected40(this.SC4, m[9]);  this.SC4value = m[9];
    this.SI4 = this.setselected40(this.SI4, m[10]); this.SI4value = m[10];
    this.SA4 = this.setselected40(this.SA4, m[11]); this.SA4value = m[11];

    this.calcit40();
  }

  AV4onclick(item: any[]) { this.AV4value = item[2]; this.AV4 = this.setselected40(this.AV4, item[2]); this.selectedItem = item[0] + ': ' + item[1]; this.changevector40('AV', item[2]); this.calcit40(); }
  AC4onclick(item: any[]) { this.AC4value = item[2]; this.AC4 = this.setselected40(this.AC4, item[2]); this.selectedItem = item[0] + ': ' + item[1]; this.changevector40('AC', item[2]); this.calcit40(); }
  AT4onclick(item: any[]) { this.AT4value = item[2]; this.AT4 = this.setselected40(this.AT4, item[2]); this.selectedItem = item[0] + ': ' + item[1]; this.changevector40('AT', item[2]); this.calcit40(); }
  PR4onclick(item: any[]) { this.PR4value = item[2]; this.PR4 = this.setselected40(this.PR4, item[2]); this.selectedItem = item[0] + ': ' + item[1]; this.changevector40('PR', item[2]); this.calcit40(); }
  UI4onclick(item: any[]) { this.UI4value = item[2]; this.UI4 = this.setselected40(this.UI4, item[2]); this.selectedItem = item[0] + ': ' + item[1]; this.changevector40('UI', item[2]); this.calcit40(); }
  VC4onclick(item: any[]) { this.VC4value = item[2]; this.VC4 = this.setselected40(this.VC4, item[2]); this.selectedItem = item[0] + ': ' + item[1]; this.changevector40('VC', item[2]); this.calcit40(); }
  VI4onclick(item: any[]) { this.VI4value = item[2]; this.VI4 = this.setselected40(this.VI4, item[2]); this.selectedItem = item[0] + ': ' + item[1]; this.changevector40('VI', item[2]); this.calcit40(); }
  VA4onclick(item: any[]) { this.VA4value = item[2]; this.VA4 = this.setselected40(this.VA4, item[2]); this.selectedItem = item[0] + ': ' + item[1]; this.changevector40('VA', item[2]); this.calcit40(); }
  SC4onclick(item: any[]) { this.SC4value = item[2]; this.SC4 = this.setselected40(this.SC4, item[2]); this.selectedItem = item[0] + ': ' + item[1]; this.changevector40('SC', item[2]); this.calcit40(); }
  SI4onclick(item: any[]) { this.SI4value = item[2]; this.SI4 = this.setselected40(this.SI4, item[2]); this.selectedItem = item[0] + ': ' + item[1]; this.changevector40('SI', item[2]); this.calcit40(); }
  SA4onclick(item: any[]) { this.SA4value = item[2]; this.SA4 = this.setselected40(this.SA4, item[2]); this.selectedItem = item[0] + ': ' + item[1]; this.changevector40('SA', item[2]); this.calcit40(); }

  calcit40() {
    const severityRatings = [
      { name: 'Info',     bottom: 0.0, top: 0.0 },
      { name: 'Low',      bottom: 0.1, top: 3.9 },
      { name: 'Medium',   bottom: 4.0, top: 6.9 },
      { name: 'High',     bottom: 7.0, top: 8.9 },
      { name: 'Critical', bottom: 9.0, top: 10.0 },
    ];

    if (this.AV4value && this.AC4value && this.AT4value && this.PR4value && this.UI4value &&
        this.VC4value && this.VI4value && this.VA4value && this.SC4value && this.SI4value && this.SA4value) {

      this.basescore = calcCVSS40Score({
        AV: this.AV4value, AC: this.AC4value, AT: this.AT4value,
        PR: this.PR4value, UI: this.UI4value,
        VC: this.VC4value, VI: this.VI4value, VA: this.VA4value,
        SC: this.SC4value, SI: this.SI4value, SA: this.SA4value,
      });

      this.show = true;
      for (let _i = 0; _i < severityRatings.length; _i++) {
        if (severityRatings[_i].bottom <= this.basescore && severityRatings[_i].top >= this.basescore) {
          this.severity = severityRatings[_i].name;
        }
      }
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  save(cvss: number, severity: string, scorevector: string) {
    this.data.cvss = cvss;
    this.data.cvss_vector = scorevector;
    this.data.severity = severity;
    this.dialogRef.close(this.data);
  }

  get activeVector(): string {
    return this.cvssVersion === '4.0' ? this.scorevector40.value : this.scorevector.value;
  }
}
