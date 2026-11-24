import { Injectable } from '@angular/core';
import { ISSUE_STATUS_TABLE } from './utils.service';

export type ChangeKind = 'added' | 'removed' | 'changed';

/** One line of a text diff. `context` lines are shown to orient the changed ones. */
export interface DiffLine {
  kind: 'add' | 'del' | 'context';
  text: string;
}

export interface FieldChange {
  /** dotted path into the decrypted report, so a restore can write it back */
  path: string;
  label: string;
  before: string;
  after: string;
  /** multi-line prose gets a line-level diff; everything else is before/after */
  lines?: DiffLine[];
  /** set when the value is too large to diff line by line (logos, templates) */
  opaque?: boolean;
}

export interface IssueDiff {
  kind: ChangeKind;
  /** match key — normalised title, since report issues carry no stable id */
  key: string;
  title: string;
  severity: string;
  /** the issue as it was in the older version; null when it was added since */
  left: any | null;
  /** the issue as it is in the newer version; null when it was removed since */
  right: any | null;
  fields: FieldChange[];
}

export interface AssetDiff {
  kind: ChangeKind;
  id: string;
  name: string;
  target: string;
  left: any | null;
  right: any | null;
  fields: FieldChange[];
}

export interface ReportDiff {
  issues: IssueDiff[];
  assets: AssetDiff[];
  /** report-level fields: scope, summary, researcher, dates, template settings */
  fields: FieldChange[];
  summary: {
    issuesAdded: number;
    issuesRemoved: number;
    issuesChanged: number;
    assetsAdded: number;
    assetsRemoved: number;
    assetsChanged: number;
    fieldsChanged: number;
    changelogDelta: number;
    total: number;
  };
}

/** issue fields worth diffing, in the order they read best */
const ISSUE_FIELDS: { key: string, label: string, text?: boolean }[] = [
  { key: 'severity', label: 'Severity' },
  { key: 'status', label: 'Status' },
  { key: 'cvss', label: 'CVSS' },
  { key: 'cvss_vector', label: 'CVSS vector' },
  { key: 'cve', label: 'CVE' },
  { key: 'date', label: 'Date' },
  { key: 'desc', label: 'Description', text: true },
  { key: 'poc', label: 'Proof of concept', text: true },
  { key: 'ref', label: 'References', text: true },
  { key: 'tags', label: 'Tags' },
  { key: 'files', label: 'Attachments' },
  { key: 'bounty', label: 'Bounty' }
];

const ASSET_FIELDS: { key: string, label: string, text?: boolean }[] = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'target', label: 'Target' },
  { key: 'in_scope', label: 'In scope' },
  { key: 'notes', label: 'Notes', text: true }
];

/**
 * Above this many lines on either side the LCS table gets expensive enough to
 * stall the dialog, so the field is reported as changed without a line diff.
 * Report HTML templates are the realistic case.
 */
const MAX_DIFF_LINES = 600;

/** Values longer than this are never rendered inline (base64 logos, mostly). */
const MAX_INLINE_CHARS = 20000;

/**
 * Compares two decrypted report snapshots.
 *
 * Report history already stored full snapshots, but the only things you could
 * do with one were download it or replace the whole report with it — so
 * recovering a single deleted finding meant discarding every edit made since.
 * This produces a structured diff instead, which the history dialog renders and
 * then restores from piece by piece.
 *
 * Issues are matched on their normalised title because the issue objects have
 * no stable identifier (see `toIssue()` in dialog-addissue). Duplicate titles
 * are paired off in document order. Assets do carry a uuid and are matched on
 * it, falling back to name+target for assets created before that field existed.
 */
@Injectable({ providedIn: 'root' })
export class ReportDiffService {

  /**
   * @param left  the older snapshot
   * @param right the newer snapshot (often the live, unsaved report)
   */
  diff(left: any, right: any): ReportDiff {
    const issues = this.diffIssues(left?.report_vulns, right?.report_vulns);
    const assets = this.diffAssets(left?.report_assets, right?.report_assets);
    const fields = this.diffReportFields(left, right);

    const leftLog = Array.isArray(left?.report_changelog) ? left.report_changelog.length : 0;
    const rightLog = Array.isArray(right?.report_changelog) ? right.report_changelog.length : 0;

    const summary = {
      issuesAdded: issues.filter(i => i.kind === 'added').length,
      issuesRemoved: issues.filter(i => i.kind === 'removed').length,
      issuesChanged: issues.filter(i => i.kind === 'changed').length,
      assetsAdded: assets.filter(a => a.kind === 'added').length,
      assetsRemoved: assets.filter(a => a.kind === 'removed').length,
      assetsChanged: assets.filter(a => a.kind === 'changed').length,
      fieldsChanged: fields.length,
      changelogDelta: rightLog - leftLog,
      total: 0
    };
    summary.total = issues.length + assets.length + fields.length;

    return { issues, assets, fields, summary };
  }

  /** normalised match key for an issue title */
  issueKey(issue: any): string {
    return String(issue?.title ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  // ── issues ────────────────────────────────────────────────────────────────

  private diffIssues(leftArr: any[], rightArr: any[]): IssueDiff[] {
    const left = Array.isArray(leftArr) ? leftArr : [];
    const right = Array.isArray(rightArr) ? rightArr : [];

    // Queue per key so two issues sharing a title pair off in document order
    // instead of both matching the first one.
    const leftByKey = new Map<string, any[]>();
    for (const issue of left) {
      const key = this.issueKey(issue);
      if (!leftByKey.has(key)) leftByKey.set(key, []);
      leftByKey.get(key).push(issue);
    }

    const out: IssueDiff[] = [];

    for (const r of right) {
      const key = this.issueKey(r);
      const queue = leftByKey.get(key);
      const l = queue && queue.length ? queue.shift() : null;

      if (!l) {
        out.push({
          kind: 'added', key,
          title: String(r?.title ?? ''),
          severity: String(r?.severity ?? ''),
          left: null, right: r, fields: []
        });
        continue;
      }

      const fields = this.diffObjectFields(l, r, ISSUE_FIELDS, '');
      if (fields.length) {
        out.push({
          kind: 'changed', key,
          title: String(r?.title ?? ''),
          severity: String(r?.severity ?? ''),
          left: l, right: r, fields
        });
      }
    }

    // Anything left unconsumed existed in the older snapshot and is gone now.
    for (const [key, queue] of leftByKey) {
      for (const l of queue) {
        out.push({
          kind: 'removed', key,
          title: String(l?.title ?? ''),
          severity: String(l?.severity ?? ''),
          left: l, right: null, fields: []
        });
      }
    }

    const order = { removed: 0, changed: 1, added: 2 };
    return out.sort((a, b) => order[a.kind] - order[b.kind] || a.title.localeCompare(b.title));
  }

  // ── assets ────────────────────────────────────────────────────────────────

  private assetKey(asset: any): string {
    if (asset?.id) return 'id:' + asset.id;
    return 'nt:' + String(asset?.name ?? '').toLowerCase() + '|' + String(asset?.target ?? '').toLowerCase();
  }

  private diffAssets(leftArr: any[], rightArr: any[]): AssetDiff[] {
    const left = Array.isArray(leftArr) ? leftArr : [];
    const right = Array.isArray(rightArr) ? rightArr : [];

    const leftByKey = new Map<string, any[]>();
    for (const a of left) {
      const key = this.assetKey(a);
      if (!leftByKey.has(key)) leftByKey.set(key, []);
      leftByKey.get(key).push(a);
    }

    const out: AssetDiff[] = [];

    const describe = (a: any) => ({
      id: String(a?.id ?? ''),
      name: String(a?.name ?? ''),
      target: String(a?.target ?? '')
    });

    for (const r of right) {
      const key = this.assetKey(r);
      const queue = leftByKey.get(key);
      const l = queue && queue.length ? queue.shift() : null;

      if (!l) {
        out.push({ kind: 'added', ...describe(r), left: null, right: r, fields: [] });
        continue;
      }
      const fields = this.diffObjectFields(l, r, ASSET_FIELDS, '');
      if (fields.length) {
        out.push({ kind: 'changed', ...describe(r), left: l, right: r, fields });
      }
    }

    for (const queue of leftByKey.values()) {
      for (const l of queue) {
        out.push({ kind: 'removed', ...describe(l), left: l, right: null, fields: [] });
      }
    }

    const order = { removed: 0, changed: 1, added: 2 };
    return out.sort((a, b) => order[a.kind] - order[b.kind] || a.name.localeCompare(b.name));
  }

  // ── report-level fields ───────────────────────────────────────────────────

  private diffReportFields(left: any, right: any): FieldChange[] {
    const out: FieldChange[] = [];

    out.push(...this.diffObjectFields(left, right, [
      { key: 'report_scope', label: 'Scope', text: true },
      { key: 'report_summary', label: 'Executive summary', text: true }
    ], ''));

    out.push(...this.diffObjectFields(left?.report_metadata, right?.report_metadata, [
      { key: 'starttest', label: 'Test start' },
      { key: 'endtest', label: 'Test end' }
    ], 'report_metadata.'));

    // researcher is a one-element array in every report the app writes
    out.push(...this.diffObjectFields(left?.researcher?.[0], right?.researcher?.[0], [
      { key: 'reportername', label: 'Researcher name' },
      { key: 'reportersocial', label: 'Researcher social' },
      { key: 'reporterwww', label: 'Researcher site' },
      { key: 'reporteremail', label: 'Researcher e-mail' }
    ], 'researcher.0.'));

    out.push(...this.diffSettings(left?.report_settings, right?.report_settings));

    return out;
  }

  /**
   * report_settings grows new switches over time, so enumerate whatever both
   * sides actually have rather than hard-coding the list. The HTML template is
   * the one entry worth a line diff; the logo is base64 and only ever reported
   * as changed.
   */
  private diffSettings(left: any, right: any): FieldChange[] {
    if (!left && !right) return [];
    const out: FieldChange[] = [];
    const keys = new Set<string>([...Object.keys(left || {}), ...Object.keys(right || {})]);

    for (const key of keys) {
      // This loop is where an untrusted key becomes a path segment, so drop the
      // dangerous ones here too: applyPath() would refuse them anyway, but the
      // restore UI should not offer a row that silently does nothing.
      if (ReportDiffService.blockedKey(key)) continue;

      const l = left ? left[key] : undefined;
      const r = right ? right[key] : undefined;

      if (key === 'report_logo') {
        const lLogo = String(l?.logo ?? '');
        const rLogo = String(r?.logo ?? '');
        if (lLogo !== rLogo) {
          out.push({
            path: 'report_settings.report_logo.logo',
            label: 'Report logo',
            before: lLogo ? 'image (' + lLogo.length + ' bytes)' : '—',
            after: rLogo ? 'image (' + rLogo.length + ' bytes)' : '—',
            opaque: true
          });
        }
        for (const dim of ['width', 'height']) {
          if (this.scalar(l?.[dim]) !== this.scalar(r?.[dim])) {
            out.push({
              path: 'report_settings.report_logo.' + dim,
              label: 'Logo ' + dim,
              before: this.scalar(l?.[dim]),
              after: this.scalar(r?.[dim])
            });
          }
        }
        continue;
      }

      const label = this.humanise(key);
      const isText = key === 'report_html' || key === 'report_css';
      const change = this.fieldChange('report_settings.' + key, label, l, r, isText);
      if (change) out.push(change);
    }

    return out.sort((a, b) => a.label.localeCompare(b.label));
  }

  private humanise(key: string): string {
    const base = key.replace(/^report_/, '').replace(/_/g, ' ');
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  // ── field comparison ──────────────────────────────────────────────────────

  private diffObjectFields(
    left: any, right: any,
    spec: { key: string, label: string, text?: boolean }[],
    prefix: string
  ): FieldChange[] {
    if (!left && !right) return [];
    const out: FieldChange[] = [];
    for (const f of spec) {
      const change = this.fieldChange(prefix + f.key, f.label, left ? left[f.key] : undefined, right ? right[f.key] : undefined, f.text);
      if (change) out.push(change);
    }
    return out;
  }

  private fieldChange(path: string, label: string, l: any, r: any, text?: boolean): FieldChange | null {
    const before = this.render(l, path);
    const after = this.render(r, path);
    if (before === after) return null;

    const change: FieldChange = { path, label, before, after };

    if (before.length > MAX_INLINE_CHARS || after.length > MAX_INLINE_CHARS) {
      change.opaque = true;
      change.before = before.length ? before.length + ' characters' : '—';
      change.after = after.length ? after.length + ' characters' : '—';
      return change;
    }

    if (text || before.includes('\n') || after.includes('\n')) {
      const lines = this.lineDiff(before, after);
      if (lines) change.lines = lines;
    }

    return change;
  }

  /** Flattens a stored value to the string the diff compares and displays. */
  private render(value: any, path = ''): string {
    if (value === undefined || value === null || value === '') return '';

    const leaf = path.split('.').pop();

    // exact last segment, not endsWith: report_settings.report_remove_issuestatus
    // is a boolean switch and must not be read as an issue status code
    if (leaf === 'status') {
      const entry = ISSUE_STATUS_TABLE.find(s => s.value === Number(value));
      return entry ? entry.status : String(value);
    }

    // issue dates and the test window are epoch millis in storage
    if (leaf === 'date' || leaf === 'starttest' || leaf === 'endtest') {
      const ms = Number(value);
      if (Number.isFinite(ms) && ms > 0) {
        const d = new Date(ms);
        if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
      }
      return String(value);
    }

    if (Array.isArray(value)) {
      // Attachments carry their payload in `data` as a base64 URI; render the
      // name plus a checksum stub so a file swapped for a different one under
      // the same name still shows up as a change, without dumping the blob.
      if (leaf === 'files') {
        return value
          .map(f => String(f?.title ?? '') + (f?.sha256checksum ? ' (' + String(f.sha256checksum).substring(0, 8) + ')' : ''))
          .join(', ');
      }
      // tags: [{name}], bounty: [{name,url}]
      return value
        .map(v => (v && typeof v === 'object') ? String(v.name ?? v.title ?? JSON.stringify(v)) : String(v))
        .join(', ');
    }

    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'yes' : 'no';

    return String(value);
  }

  private scalar(value: any): string {
    return value === undefined || value === null ? '' : String(value);
  }

  // ── line diff (LCS) ───────────────────────────────────────────────────────

  /**
   * Line-level diff via a plain LCS table. Returns null when either side is too
   * long to be worth it — the caller then just shows before/after.
   */
  lineDiff(before: string, after: string): DiffLine[] | null {
    const a = before.length ? before.split('\n') : [];
    const b = after.length ? after.split('\n') : [];
    if (a.length > MAX_DIFF_LINES || b.length > MAX_DIFF_LINES) return null;

    const n = a.length, m = b.length;
    // lcs[i][j] = length of the longest common subsequence of a[i:] and b[j:]
    const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i][j] = a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }

    const out: DiffLine[] = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) {
        out.push({ kind: 'context', text: a[i] });
        i++; j++;
      } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
        out.push({ kind: 'del', text: a[i] });
        i++;
      } else {
        out.push({ kind: 'add', text: b[j] });
        j++;
      }
    }
    while (i < n) out.push({ kind: 'del', text: a[i++] });
    while (j < m) out.push({ kind: 'add', text: b[j++] });

    return out;
  }

  /**
   * Collapses runs of unchanged lines longer than `context` to a marker, so a
   * one-line edit in a long description does not render the whole description.
   */
  collapse(lines: DiffLine[], context = 2): DiffLine[] {
    const keep = new Array(lines.length).fill(false);
    lines.forEach((l, idx) => {
      if (l.kind === 'context') return;
      for (let k = Math.max(0, idx - context); k <= Math.min(lines.length - 1, idx + context); k++) {
        keep[k] = true;
      }
    });

    const out: DiffLine[] = [];
    let skipped = 0;
    lines.forEach((l, idx) => {
      if (keep[idx]) {
        if (skipped > 0) {
          out.push({ kind: 'context', text: '⋯ ' + skipped + ' unchanged line' + (skipped > 1 ? 's' : '') });
          skipped = 0;
        }
        out.push(l);
      } else {
        skipped++;
      }
    });
    if (skipped > 0) {
      out.push({ kind: 'context', text: '⋯ ' + skipped + ' unchanged line' + (skipped > 1 ? 's' : '') });
    }
    return out;
  }

  /**
   * Path segments that must never be walked or written.
   *
   * A path is not a constant in this service: `diffSettings()` builds one from
   * the keys it finds in `report_settings`, and that object is decrypted report
   * data — an imported file or a report pulled from a configured API server can
   * carry any key it likes, `__proto__` included (JSON.parse defines it as an
   * own property rather than invoking the setter, so Object.keys lists it).
   *
   * Walking '__proto__' lands `node` on Object.prototype, and the write that
   * follows is then global: every object in the app inherits the value. Writing
   * '__proto__' as the final segment is milder but still wrong — it re-points
   * the target's prototype chain instead of setting a field, so lookups of
   * report settings that were never set start resolving to attacker values.
   */
  private static blockedKey(part: string): boolean {
    // Three literal comparisons rather than a Set lookup: this is the barrier
    // that static analysis has to be able to see, and an abstracted membership
    // test is not one it can follow.
    return part === '__proto__' || part === 'prototype' || part === 'constructor';
  }

  /**
   * Defines an own, plain data property — never an assignment.
   *
   * `node[key] = value` goes through the prototype chain: an inherited setter
   * runs instead of a property being created, and for the key '__proto__' that
   * setter re-points the object's prototype. defineProperty has no such path —
   * it always creates an own property on `node` and nothing else — so the
   * dangerous operation is absent rather than merely guarded.
   *
   * The descriptor restores what plain assignment would have produced, so the
   * result still serialises through JSON.stringify and stays editable.
   */
  private static defineOwn(node: any, key: string, value: any): boolean {
    try {
      Object.defineProperty(node, key, {
        value, writable: true, enumerable: true, configurable: true
      });
      return true;
    } catch {
      // A frozen or non-configurable target: refuse rather than half-apply.
      return false;
    }
  }

  /** Writes `value` at a dotted path (`report_settings.report_theme`) into `target`. */
  applyPath(target: any, path: string, value: any): boolean {
    if (!target || !path) return false;
    const parts = path.split('.');

    // Every segment is checked before anything is written: refusing the whole
    // path is the only safe answer, since bailing out part-way would leave the
    // report half patched with the intermediate objects the loop creates.
    for (const part of parts) {
      if (part === '__proto__' || part === 'prototype' || part === 'constructor') return false;
    }

    let node = target;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part === '__proto__' || part === 'prototype' || part === 'constructor') return false;
      const nextIsIndex = /^\d+$/.test(parts[i + 1]);
      if (!Object.prototype.hasOwnProperty.call(node, part) ||
          node[part] === undefined || node[part] === null) {
        // Shadow rather than descend into an inherited object, so a polluted
        // prototype cannot be reached and mutated through this walk.
        if (!ReportDiffService.defineOwn(node, part, nextIsIndex ? [] : {})) return false;
      }
      node = node[part];
      if (typeof node !== 'object' || node === null) return false;
    }

    const last = parts[parts.length - 1];
    if (last === '__proto__' || last === 'prototype' || last === 'constructor') return false;
    return ReportDiffService.defineOwn(node, last, value);
  }

  /** Reads a dotted path out of a snapshot. */
  readPath(source: any, path: string): any {
    if (!source || !path) return undefined;
    const parts = path.split('.');
    // Same guard as applyPath, so a blocked path cannot read Object.prototype
    // out of one snapshot and hand it to applyPath as a "restored" value.
    for (const part of parts) {
      if (part === '__proto__' || part === 'prototype' || part === 'constructor') return undefined;
    }
    return parts.reduce((node, part) => (node === undefined || node === null) ? undefined : node[part], source);
  }
}
