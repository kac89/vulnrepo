import { TestBed } from '@angular/core/testing';

import { SarifService } from './sarif.service';

describe('SarifService', () => {
  let service: SarifService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SarifService);
  });

  const sarif = (run: any) => JSON.stringify({ version: '2.1.0', runs: [run] });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── Import ────────────────────────────────────────────────────────────────

  describe('parse', () => {

    it('rejects non-SARIF input', () => {
      expect(() => service.parse('not json')).toThrowError(/valid JSON/);
      expect(() => service.parse('{"foo":1}')).toThrowError(/missing "runs"/);
      expect(() => service.parse('[]')).toThrowError(/Not a SARIF document/);
    });

    it('returns an empty list for a run with no results', () => {
      expect(service.parse(sarif({ tool: { driver: { name: 'X' } } }))).toEqual([]);
    });

    it('maps a minimal result', () => {
      const out = service.parse(sarif({
        tool: { driver: { name: 'ESLint' } },
        results: [{ ruleId: 'no-eval', level: 'error', message: { text: 'eval is evil' } }]
      }));

      expect(out.length).toBe(1);
      expect(out[0].title).toBe('no-eval: eval is evil');
      expect(out[0].desc).toBe('eval is evil');
      expect(out[0].severity).toBe('High');       // level: error
      expect(out[0].status).toBe(1);
      expect(out[0].files).toEqual([]);
      expect(out[0].bounty).toEqual([]);
      expect(out[0].tags).toContain(jasmine.objectContaining({ name: 'sarif' }));
      expect(out[0].tags).toContain(jasmine.objectContaining({ name: 'eslint' }));
    });

    it('prefers security-severity over level', () => {
      const out = service.parse(sarif({
        tool: {
          driver: {
            name: 'CodeQL',
            rules: [{ id: 'js/sqli', properties: { 'security-severity': '9.8' } }]
          }
        },
        // level says "note", the score says critical — the score wins
        results: [{ ruleId: 'js/sqli', ruleIndex: 0, level: 'note', message: { text: 'SQLi' } }]
      }));

      expect(out[0].severity).toBe('Critical');
      expect(out[0].cvss).toBe('9.8');
    });

    it('maps every severity band from the score', () => {
      expect(service.severityFromScore(9.0)).toBe('Critical');
      expect(service.severityFromScore(8.9)).toBe('High');
      expect(service.severityFromScore(7.0)).toBe('High');
      expect(service.severityFromScore(6.9)).toBe('Medium');
      expect(service.severityFromScore(4.0)).toBe('Medium');
      expect(service.severityFromScore(3.9)).toBe('Low');
      expect(service.severityFromScore(0.1)).toBe('Low');
      expect(service.severityFromScore(0)).toBe('Info');
    });

    it('falls back to the rule defaultConfiguration level', () => {
      const out = service.parse(sarif({
        tool: { driver: { name: 'T', rules: [{ id: 'r', defaultConfiguration: { level: 'note' } }] } },
        results: [{ ruleId: 'r', ruleIndex: 0, message: { text: 'm' } }]
      }));
      expect(out[0].severity).toBe('Low');
    });

    it('defaults to warning/Medium when no level is given anywhere', () => {
      const out = service.parse(sarif({
        tool: { driver: { name: 'T' } },
        results: [{ ruleId: 'r', message: { text: 'm' } }]
      }));
      expect(out[0].severity).toBe('Medium');
    });

    it('resolves rules by index, by id, and from tool extensions', () => {
      const run = {
        tool: {
          driver: { name: 'Driver', rules: [{ id: 'd0', shortDescription: { text: 'from driver' } }] },
          extensions: [{ name: 'Ext', rules: [{ id: 'e0', shortDescription: { text: 'from extension' } }] }]
        },
        results: [
          { ruleId: 'd0', ruleIndex: 0, message: { text: 'a' } },
          { ruleId: 'd0', message: { text: 'b' } },                       // id lookup, no index
          { rule: { id: 'e0', index: 0, toolComponent: { index: 0 } }, message: { text: 'c' } }
        ]
      };
      const out = service.parse(sarif(run));
      expect(out[0].title).toBe('d0: from driver');
      expect(out[1].title).toBe('d0: from driver');
      expect(out[2].title).toBe('e0: from extension');
    });

    it('builds a PoC from the location and snippet, fenced by file type', () => {
      const out = service.parse(sarif({
        tool: { driver: { name: 'T' } },
        results: [{
          ruleId: 'r',
          message: { text: 'm' },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: 'src/app/foo.ts' },
              region: { startLine: 12, startColumn: 5, endLine: 14, snippet: { text: 'const x = 1;' } }
            }
          }]
        }]
      }));

      expect(out[0].poc).toContain('`src/app/foo.ts:12:5-14`');
      expect(out[0].poc).toContain('```typescript');
      expect(out[0].poc).toContain('const x = 1;');
    });

    it('widens the fence so a snippet containing backticks cannot break out', () => {
      const out = service.parse(sarif({
        tool: { driver: { name: 'T' } },
        results: [{
          ruleId: 'r',
          message: { text: 'm' },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: 'a.txt' },
              region: { startLine: 1, snippet: { text: 'x ``` y' } }
            }
          }]
        }]
      }));
      expect(out[0].poc).toContain('````');
    });

    it('resolves artifactLocation by index', () => {
      const out = service.parse(sarif({
        tool: { driver: { name: 'T' } },
        artifacts: [{ location: { uri: 'lib/indexed.py' } }],
        results: [{
          ruleId: 'r',
          message: { text: 'm' },
          locations: [{ physicalLocation: { artifactLocation: { index: 0 }, region: { startLine: 3 } } }]
        }]
      }));
      expect(out[0].poc).toContain('lib/indexed.py:3');
    });

    it('resolves messageStrings templates with arguments', () => {
      const out = service.parse(sarif({
        tool: {
          driver: {
            name: 'T',
            rules: [{ id: 'r', messageStrings: { def: { text: "Tainted value from {0} reaches {1}." } } }]
          }
        },
        results: [{ ruleId: 'r', ruleIndex: 0, message: { id: 'def', arguments: ['req.body', 'exec()'] } }]
      }));
      expect(out[0].desc).toBe('Tainted value from req.body reaches exec().');
    });

    it('does not repeat identical message/fullDescription/help blocks', () => {
      const out = service.parse(sarif({
        tool: {
          driver: {
            name: 'T',
            rules: [{ id: 'r', fullDescription: { text: 'same' }, help: { text: 'same' } }]
          }
        },
        results: [{ ruleId: 'r', ruleIndex: 0, message: { text: 'same' } }]
      }));
      expect(out[0].desc).toBe('same');
    });

    it('skips results whose baselineState is absent', () => {
      const out = service.parse(sarif({
        tool: { driver: { name: 'T' } },
        results: [
          { ruleId: 'gone', message: { text: 'm' }, baselineState: 'absent' },
          { ruleId: 'here', message: { text: 'm' }, baselineState: 'unchanged' }
        ]
      }));
      expect(out.length).toBe(1);
      expect(out[0].title).toContain('here');
    });

    it("maps a suppressed result to Won't Fix", () => {
      const out = service.parse(sarif({
        tool: { driver: { name: 'T' } },
        results: [
          { ruleId: 'a', message: { text: 'm' }, suppressions: [{ kind: 'inSource', status: 'accepted' }] },
          { ruleId: 'b', message: { text: 'm' }, suppressions: [{ kind: 'inSource', status: 'rejected' }] }
        ]
      }));
      expect(out[0].status).toBe(4);
      expect(out[1].status).toBe(1);   // a rejected suppression is still open
    });

    it('extracts CVEs and normalizes CWE taxonomy tags', () => {
      const out = service.parse(sarif({
        tool: {
          driver: {
            name: 'Trivy',
            rules: [{ id: 'CVE-2021-44228', properties: { tags: ['security', 'external/cwe/cwe-079'] } }]
          }
        },
        results: [{ ruleId: 'CVE-2021-44228', ruleIndex: 0, message: { text: 'Log4Shell' } }]
      }));
      expect(out[0].cve).toBe('CVE-2021-44228');
      expect(out[0].tags).toContain(jasmine.objectContaining({ name: 'CWE-79' }));
      expect(out[0].tags).toContain(jasmine.objectContaining({ name: 'security' }));
    });

    it('flattens results across multiple runs', () => {
      const doc = JSON.stringify({
        version: '2.1.0',
        runs: [
          { tool: { driver: { name: 'A' } }, results: [{ ruleId: 'a', message: { text: 'm' } }] },
          { tool: { driver: { name: 'B' } }, results: [{ ruleId: 'b', message: { text: 'm' } }] }
        ]
      });
      const out = service.parse(doc);
      expect(out.length).toBe(2);
      expect(out[0].tags).toContain(jasmine.objectContaining({ name: 'a' }));
      expect(out[1].tags).toContain(jasmine.objectContaining({ name: 'b' }));
    });

    it('collects references from helpUri and rule properties', () => {
      const out = service.parse(sarif({
        tool: {
          driver: {
            name: 'T',
            rules: [{ id: 'r', helpUri: 'https://example.com/rule', properties: { references: ['https://owasp.org/'] } }]
          }
        },
        results: [{ ruleId: 'r', ruleIndex: 0, message: { text: 'm' } }]
      }));
      expect(out[0].ref).toBe('https://example.com/rule\nhttps://owasp.org/');
    });
  });

  // ── Export ────────────────────────────────────────────────────────────────

  describe('build', () => {

    const issue = (over: any = {}) => ({
      title: 'SQL Injection in login form',
      desc: 'User input reaches the query unsanitized.',
      poc: 'POST /login\nuser=admin%27--',
      severity: 'Critical',
      ref: 'See https://owasp.org/sqli for detail',
      status: 1,
      cvss: '9.1',
      cvss_vector: 'AV:N/AC:L',
      cve: 'CVE-2024-0001',
      tags: [{ name: 'web' }],
      files: [],
      bounty: [],
      date: 1700000000000,
      ...over
    });

    it('emits a valid SARIF 2.1.0 skeleton', () => {
      const doc = JSON.parse(service.build([issue()]));
      expect(doc.version).toBe('2.1.0');
      expect(doc.$schema).toContain('sarif-2.1.0');
      expect(doc.runs.length).toBe(1);
      expect(doc.runs[0].tool.driver.name).toBe('VULNRΞPO');
      expect(doc.runs[0].results.length).toBe(1);
      expect(doc.runs[0].tool.driver.rules.length).toBe(1);
    });

    it('links each result to its rule by id and index', () => {
      const doc = JSON.parse(service.build([issue(), issue({ title: 'XSS' })]));
      const { rules } = doc.runs[0].tool.driver;
      doc.runs[0].results.forEach((r: any, i: number) => {
        expect(r.ruleIndex).toBe(i);
        expect(r.ruleId).toBe(rules[i].id);
      });
    });

    it('maps severity to level and security-severity', () => {
      const doc = JSON.parse(service.build([
        issue({ severity: 'Critical', cvss: '' }),
        issue({ title: 'b', severity: 'Medium', cvss: '' }),
        issue({ title: 'c', severity: 'Info', cvss: '' })
      ]));
      const rules = doc.runs[0].tool.driver.rules;
      expect(doc.runs[0].results[0].level).toBe('error');
      expect(rules[0].properties['security-severity']).toBe('9.5');
      expect(doc.runs[0].results[1].level).toBe('warning');
      expect(doc.runs[0].results[2].level).toBe('none');
    });

    it('prefers the issue CVSS over the severity band for security-severity', () => {
      const doc = JSON.parse(service.build([issue({ severity: 'Critical', cvss: '9.1' })]));
      expect(doc.runs[0].tool.driver.rules[0].properties['security-severity']).toBe('9.1');
    });

    it('de-duplicates rule ids derived from identical titles', () => {
      const doc = JSON.parse(service.build([issue(), issue(), issue()]));
      const ids = doc.runs[0].tool.driver.rules.map((r: any) => r.id);
      expect(new Set(ids).size).toBe(3);
    });

    it('extracts the first URL from references as helpUri', () => {
      const doc = JSON.parse(service.build([issue()]));
      expect(doc.runs[0].tool.driver.rules[0].helpUri).toBe('https://owasp.org/sqli');
    });

    it("records Won't Fix as a SARIF suppression", () => {
      const doc = JSON.parse(service.build([issue({ status: 4 }), issue({ title: 'b', status: 1 })]));
      expect(doc.runs[0].results[0].suppressions.length).toBe(1);
      expect(doc.runs[0].results[1].suppressions).toBeUndefined();
    });

    it('keeps attachment checksums but not attachment bytes', () => {
      const doc = JSON.parse(service.build([issue({
        files: [{ title: 'shot.png', type: 'image/png', size: 42, sha256checksum: 'abc', data: 'data:image/png;base64,AAAA' }]
      })]));
      const meta = doc.runs[0].results[0].properties.vulnrepo.attachments;
      expect(meta).toEqual([{ title: 'shot.png', type: 'image/png', size: 42, sha256checksum: 'abc' }]);
      expect(service.build([issue({ files: [{ data: 'data:image/png;base64,SECRET' }] })])).not.toContain('SECRET');
    });

    it('tolerates an empty or junk issue list', () => {
      expect(JSON.parse(service.build([])).runs[0].results).toEqual([]);
      expect(JSON.parse(service.build([null, undefined, 'x'] as any)).runs[0].results).toEqual([]);
    });

    it('honours a custom tool name and version', () => {
      const doc = JSON.parse(service.build([issue()], { toolName: 'Acme', toolVersion: '1.2.3' }));
      expect(doc.runs[0].tool.driver.name).toBe('Acme');
      expect(doc.runs[0].tool.driver.version).toBe('1.2.3');
    });
  });

  // ── Round-trip ────────────────────────────────────────────────────────────

  describe('round-trip', () => {

    it('preserves the reportable fields through export → import', () => {
      const original = {
        title: 'Reflected XSS in search',
        desc: 'The `q` parameter is echoed unescaped.',
        poc: 'GET /search?q=<script>alert(1)</script>',
        severity: 'High',
        ref: 'https://owasp.org/xss',
        status: 2,
        cvss: '7.4',
        cvss_vector: 'AV:N/AC:L/PR:N',
        cve: 'CVE-2024-1234',
        tags: [{ name: 'web' }, { name: 'xss' }],
        files: [],
        bounty: [],
        date: 1700000000000
      };

      const [back] = service.parse(service.build([original]));

      expect(back.desc).toBe(original.desc);
      expect(back.poc).toBe(original.poc);
      expect(back.severity).toBe(original.severity);
      expect(back.status).toBe(original.status);
      expect(back.ref).toBe(original.ref);
      expect(back.cvss).toBe(original.cvss);
      expect(back.cvss_vector).toBe(original.cvss_vector);
      expect(back.cve).toBe(original.cve);
      expect(back.tags).toEqual([{ name: 'web' }, { name: 'xss' }]);
    });

    it("preserves Won't Fix through the suppression round-trip", () => {
      const [back] = service.parse(service.build([{
        title: 'Accepted risk', desc: 'd', poc: '', severity: 'Low',
        status: 4, ref: '', cvss: '', cvss_vector: '', cve: '', tags: [], files: [], bounty: [], date: 0
      }]));
      expect(back.status).toBe(4);
    });

    it('survives a round-trip when optional fields are missing entirely', () => {
      const [back] = service.parse(service.build([{ title: 'Bare finding' }]));
      expect(back.title).toContain('Bare finding');
      expect(back.status).toBe(1);
      expect(back.files).toEqual([]);
      // Lossless: the issue had no tags, so it comes back with none. The
      // `sarif` provenance tag is only stamped on third-party documents.
      expect(back.tags).toEqual([]);
    });
  });
});
