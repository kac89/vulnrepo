import { TestBed } from '@angular/core/testing';

import { ReportDiffService } from './report-diff.service';

describe('ReportDiffService', () => {
  let svc: ReportDiffService;

  const issue = (over: any = {}) => ({
    title: 'SQL Injection in /login',
    poc: '',
    files: [],
    desc: 'The login form is injectable.',
    severity: 'Critical',
    status: 1,
    ref: '',
    cvss: '9.8',
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    cve: '',
    tags: [],
    bounty: [],
    date: 1700000000000,
    ...over
  });

  const report = (over: any = {}) => ({
    report_vulns: [],
    report_scope: '',
    report_assets: [],
    report_summary: '',
    report_changelog: [],
    report_version: 0,
    report_metadata: { starttest: 0, endtest: '' },
    researcher: [{ reportername: '', reportersocial: '', reporterwww: '', reporteremail: '' }],
    report_settings: {},
    ...over
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ReportDiffService] });
    svc = TestBed.inject(ReportDiffService);
  });

  it('reports nothing for two identical snapshots', () => {
    const d = svc.diff(report({ report_vulns: [issue()] }), report({ report_vulns: [issue()] }));
    expect(d.summary.total).toBe(0);
    expect(d.issues).toEqual([]);
    expect(d.fields).toEqual([]);
  });

  // ── issues ────────────────────────────────────────────────────────────────

  it('classifies an issue present only on the right as added', () => {
    const d = svc.diff(report(), report({ report_vulns: [issue()] }));
    expect(d.issues.length).toBe(1);
    expect(d.issues[0].kind).toBe('added');
    expect(d.issues[0].left).toBeNull();
    expect(d.summary.issuesAdded).toBe(1);
  });

  it('classifies an issue present only on the left as removed and keeps its body for restore', () => {
    const gone = issue({ title: 'XSS in /search', desc: 'reflected' });
    const d = svc.diff(report({ report_vulns: [gone] }), report());

    expect(d.issues.length).toBe(1);
    expect(d.issues[0].kind).toBe('removed');
    expect(d.issues[0].left.desc).toBe('reflected');
    expect(d.summary.issuesRemoved).toBe(1);
  });

  it('lists only the fields that actually changed', () => {
    const before = issue();
    const after = issue({ severity: 'High', cvss: '8.1' });
    const d = svc.diff(report({ report_vulns: [before] }), report({ report_vulns: [after] }));

    expect(d.issues[0].kind).toBe('changed');
    expect(d.issues[0].fields.map(f => f.path).sort()).toEqual(['cvss', 'severity']);
    const sev = d.issues[0].fields.find(f => f.path === 'severity');
    expect(sev.before).toBe('Critical');
    expect(sev.after).toBe('High');
  });

  it('matches issues on a normalised title, so whitespace alone is not a change', () => {
    const d = svc.diff(
      report({ report_vulns: [issue({ title: 'SQL   Injection in /login' })] }),
      report({ report_vulns: [issue({ title: ' sql injection in /login ' })] })
    );
    expect(d.summary.total).toBe(0);
  });

  // Two findings can legitimately share a title (same class of bug, two hosts).
  // Matching must pair them off rather than collapsing both onto the first.
  it('pairs duplicate titles in document order', () => {
    const left = [issue({ poc: 'host-a' }), issue({ poc: 'host-b' })];
    const right = [issue({ poc: 'host-a' }), issue({ poc: 'host-b-fixed' })];
    const d = svc.diff(report({ report_vulns: left }), report({ report_vulns: right }));

    expect(d.issues.length).toBe(1);
    expect(d.issues[0].kind).toBe('changed');
    expect(d.issues[0].fields[0].before).toBe('host-b');
  });

  it('renders status codes as their labels', () => {
    const d = svc.diff(
      report({ report_vulns: [issue({ status: 1 })] }),
      report({ report_vulns: [issue({ status: 3 })] })
    );
    const f = d.issues[0].fields.find(x => x.path === 'status');
    expect(f.before).toBe('Open (Waiting for review)');
    expect(f.after).toBe('Fixed');
  });

  it('renders tags by name rather than as JSON', () => {
    const d = svc.diff(
      report({ report_vulns: [issue({ tags: [{ name: 'web' }] })] }),
      report({ report_vulns: [issue({ tags: [{ name: 'web' }, { name: 'auth' }] })] })
    );
    const f = d.issues[0].fields.find(x => x.path === 'tags');
    expect(f.before).toBe('web');
    expect(f.after).toBe('web, auth');
  });

  // Attachments keep their payload in `data` as a base64 URI. Diffing that
  // inline would dump megabytes into the dialog, and comparing names alone
  // would miss a file swapped for a different one under the same name.
  it('summarises attachments by name and checksum stub', () => {
    const a = { title: 'poc.png', data: 'data:image/png;base64,AAAA', sha256checksum: 'deadbeefcafe' };
    const b = { title: 'poc.png', data: 'data:image/png;base64,BBBB', sha256checksum: '0123456789ab' };
    const d = svc.diff(
      report({ report_vulns: [issue({ files: [a] })] }),
      report({ report_vulns: [issue({ files: [b] })] })
    );
    const f = d.issues[0].fields.find(x => x.path === 'files');
    expect(f.before).toBe('poc.png (deadbeef)');
    expect(f.after).toBe('poc.png (01234567)');
    expect(f.before).not.toContain('base64');
  });

  it('renders epoch dates as calendar days', () => {
    const d = svc.diff(
      report({ report_vulns: [issue({ date: Date.UTC(2026, 0, 2) })] }),
      report({ report_vulns: [issue({ date: Date.UTC(2026, 0, 9) })] })
    );
    const f = d.issues[0].fields.find(x => x.path === 'date');
    expect(f.before).toBe('2026-01-02');
    expect(f.after).toBe('2026-01-09');
  });

  // ── assets ────────────────────────────────────────────────────────────────

  it('matches assets on their uuid, so a rename is a change not a swap', () => {
    const d = svc.diff(
      report({ report_assets: [{ id: 'u1', name: 'web', type: 'web', target: 'a.test', in_scope: true, notes: '' }] }),
      report({ report_assets: [{ id: 'u1', name: 'web prod', type: 'web', target: 'a.test', in_scope: true, notes: '' }] })
    );
    expect(d.assets.length).toBe(1);
    expect(d.assets[0].kind).toBe('changed');
    expect(d.assets[0].fields[0].path).toBe('name');
  });

  it('falls back to name+target for assets with no id', () => {
    const d = svc.diff(
      report({ report_assets: [{ name: 'web', target: 'a.test', in_scope: true }] }),
      report({ report_assets: [{ name: 'web', target: 'a.test', in_scope: false }] })
    );
    expect(d.assets[0].kind).toBe('changed');
    expect(d.assets[0].fields[0].before).toBe('yes');
    expect(d.assets[0].fields[0].after).toBe('no');
  });

  // ── report fields ─────────────────────────────────────────────────────────

  it('diffs report scope with a line diff', () => {
    const d = svc.diff(
      report({ report_scope: 'a.test\nb.test' }),
      report({ report_scope: 'a.test\nc.test' })
    );
    const f = d.fields.find(x => x.path === 'report_scope');
    expect(f).toBeTruthy();
    expect(f.lines.filter(l => l.kind === 'del').map(l => l.text)).toEqual(['b.test']);
    expect(f.lines.filter(l => l.kind === 'add').map(l => l.text)).toEqual(['c.test']);
  });

  it('diffs researcher details through the one-element array', () => {
    const d = svc.diff(
      report(),
      report({ researcher: [{ reportername: 'K', reportersocial: '', reporterwww: '', reporteremail: '' }] })
    );
    const f = d.fields.find(x => x.path === 'researcher.0.reportername');
    expect(f.after).toBe('K');
  });

  it('enumerates report_settings rather than hard-coding the switch list', () => {
    const d = svc.diff(
      report({ report_settings: { report_theme: 'white', some_future_switch: false } }),
      report({ report_settings: { report_theme: 'dark', some_future_switch: true } })
    );
    const paths = d.fields.map(f => f.path);
    expect(paths).toContain('report_settings.report_theme');
    expect(paths).toContain('report_settings.some_future_switch');
  });

  // report_remove_issuestatus ends in "status" but is a boolean switch, not an
  // issue status code — it must not be run through the status label table.
  it('does not read the remove-issuestatus switch as a status code', () => {
    const d = svc.diff(
      report({ report_settings: { report_remove_issuestatus: false } }),
      report({ report_settings: { report_remove_issuestatus: true } })
    );
    const f = d.fields.find(x => x.path === 'report_settings.report_remove_issuestatus');
    expect(f.before).toBe('no');
    expect(f.after).toBe('yes');
  });

  it('reports the logo as opaque instead of dumping base64', () => {
    const big = 'data:image/png;base64,' + 'A'.repeat(30000);
    const d = svc.diff(
      report({ report_settings: { report_logo: { logo: '', width: 600, height: 500 } } }),
      report({ report_settings: { report_logo: { logo: big, width: 600, height: 500 } } })
    );
    const f = d.fields.find(x => x.path === 'report_settings.report_logo.logo');
    expect(f.opaque).toBeTrue();
    expect(f.after).not.toContain('AAAA');
  });

  it('counts changelog growth without diffing the log itself', () => {
    const d = svc.diff(
      report({ report_changelog: [{ date: 1, desc: 'a' }] }),
      report({ report_changelog: [{ date: 1, desc: 'a' }, { date: 2, desc: 'b' }] })
    );
    expect(d.summary.changelogDelta).toBe(1);
    expect(d.fields.some(f => f.path.includes('changelog'))).toBeFalse();
  });

  it('survives a snapshot missing whole sections', () => {
    const d = svc.diff({}, report({ report_vulns: [issue()] }));
    expect(d.issues.length).toBe(1);
    expect(d.issues[0].kind).toBe('added');
  });

  // ── line diff ─────────────────────────────────────────────────────────────

  describe('lineDiff', () => {
    it('keeps unchanged lines as context', () => {
      const lines = svc.lineDiff('one\ntwo\nthree', 'one\n2\nthree');
      expect(lines.map(l => l.kind + ':' + l.text)).toEqual([
        'context:one', 'del:two', 'add:2', 'context:three'
      ]);
    });

    it('gives up on texts too long to be worth an LCS table', () => {
      const long = Array.from({ length: 700 }, (_, i) => 'line ' + i).join('\n');
      expect(svc.lineDiff(long, long + '\nmore')).toBeNull();
    });
  });

  describe('collapse', () => {
    it('folds long unchanged runs into a marker', () => {
      const lines = svc.lineDiff(
        ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].join('\n'),
        ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'Z'].join('\n')
      );
      const out = svc.collapse(lines, 2);
      expect(out.length).toBeLessThan(lines.length);
      expect(out.some(l => l.text.startsWith('⋯'))).toBeTrue();
      // the changed lines themselves always survive
      expect(out.some(l => l.kind === 'del' && l.text === 'j')).toBeTrue();
      expect(out.some(l => l.kind === 'add' && l.text === 'Z')).toBeTrue();
    });
  });

  // ── path helpers (used by selective restore) ───────────────────────────────

  describe('applyPath / readPath', () => {
    it('writes a nested value', () => {
      const target: any = { report_settings: { report_theme: 'dark' } };
      expect(svc.applyPath(target, 'report_settings.report_theme', 'white')).toBeTrue();
      expect(target.report_settings.report_theme).toBe('white');
    });

    it('creates intermediate objects and arrays as needed', () => {
      const target: any = {};
      svc.applyPath(target, 'researcher.0.reportername', 'K');
      expect(Array.isArray(target.researcher)).toBeTrue();
      expect(target.researcher[0].reportername).toBe('K');
    });

    it('reads a nested value and tolerates a missing branch', () => {
      const src = { report_metadata: { starttest: 42 } };
      expect(svc.readPath(src, 'report_metadata.starttest')).toBe(42);
      expect(svc.readPath(src, 'nope.deeper')).toBeUndefined();
    });

    // report_settings paths are built from the keys of decrypted report data,
    // which an imported file controls — so a path segment can be '__proto__'.
    describe('prototype pollution', () => {
      afterEach(() => {
        delete (Object.prototype as any).polluted;
        delete (Object.prototype as any).report_theme;
      });

      it('refuses a write that would walk through __proto__', () => {
        const target: any = { report_settings: {} };
        expect(svc.applyPath(target, 'report_settings.__proto__.polluted', 'x')).toBeFalse();
        expect(({} as any).polluted).toBeUndefined();
        expect((Object.prototype as any).polluted).toBeUndefined();
      });

      it('refuses __proto__ as the final segment, so the target keeps its own chain', () => {
        const target: any = { report_settings: { report_theme: 'dark' } };
        expect(svc.applyPath(target, 'report_settings.__proto__', { report_theme: 'evil' })).toBeFalse();
        expect(Object.getPrototypeOf(target.report_settings)).toBe(Object.prototype);
        expect(target.report_settings.report_theme).toBe('dark');
      });

      it('refuses constructor and prototype segments', () => {
        const target: any = { report_settings: {} };
        expect(svc.applyPath(target, 'constructor.prototype.polluted', 'x')).toBeFalse();
        expect(svc.applyPath(target, 'report_settings.constructor.prototype.polluted', 'x')).toBeFalse();
        expect(svc.applyPath(target, 'report_settings.prototype', 'x')).toBeFalse();
        expect(({} as any).polluted).toBeUndefined();
      });

      it('does not read a blocked path back out of a snapshot', () => {
        const src = JSON.parse('{"report_settings":{"__proto__":{"report_theme":"evil"}}}');
        expect(svc.readPath(src, 'report_settings.__proto__')).toBeUndefined();
        expect(svc.readPath(src, 'report_settings.__proto__.report_theme')).toBeUndefined();
      });

      it('never offers a blocked key as a restorable field', () => {
        // JSON.parse defines __proto__ as an own property, so Object.keys lists it
        const settings = JSON.parse('{"report_theme":"white","__proto__":{"x":1}}');
        expect(Object.keys(settings)).toContain('__proto__');

        const d = svc.diff(report({ report_settings: settings }),
                           report({ report_settings: { report_theme: 'dark' } }));
        expect(d.fields.some(f => f.path.split('.').includes('__proto__'))).toBeFalse();
        // the legitimate sibling key is still diffed
        expect(d.fields.some(f => f.path === 'report_settings.report_theme')).toBeTrue();
      });

      it('writes an own property rather than mutating an inherited one', () => {
        const shared = { report_theme: 'inherited' };
        const target: any = { report_settings: Object.create({ report_logo: shared }) };
        expect(svc.applyPath(target, 'report_settings.report_logo.width', 42)).toBeTrue();
        expect(shared).toEqual({ report_theme: 'inherited' });
        expect(target.report_settings.report_logo.width).toBe(42);
      });
    });

    it('round-trips every path the diff produces', () => {
      const left = report({
        report_scope: 'old scope',
        report_metadata: { starttest: 111, endtest: 222 },
        report_settings: { report_theme: 'white' },
        researcher: [{ reportername: 'Old', reportersocial: '', reporterwww: '', reporteremail: '' }]
      });
      const right = report({
        report_scope: 'new scope',
        report_metadata: { starttest: 333, endtest: 444 },
        report_settings: { report_theme: 'dark' },
        researcher: [{ reportername: 'New', reportersocial: '', reporterwww: '', reporteremail: '' }]
      });

      const d = svc.diff(left, right);
      expect(d.fields.length).toBeGreaterThan(0);

      // this is exactly what selective restore does: read the old value out of
      // the left snapshot by path, then write it into the live report
      const live = JSON.parse(JSON.stringify(right));
      for (const f of d.fields) {
        expect(svc.applyPath(live, f.path, svc.readPath(left, f.path))).toBeTrue();
      }
      expect(svc.diff(left, live).fields).toEqual([]);
    });
  });

  describe('issueKey', () => {
    it('normalises case and whitespace', () => {
      expect(svc.issueKey({ title: '  Open   Redirect ' })).toBe('open redirect');
    });

    it('does not throw on a missing title', () => {
      expect(svc.issueKey({})).toBe('');
      expect(svc.issueKey(null)).toBe('');
    });
  });

});
