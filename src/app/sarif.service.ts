import { Injectable } from '@angular/core';
import { CurrentdateService } from './currentdate.service';

/**
 * SARIF 2.1.0 (OASIS) import / export.
 *
 * Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 *
 * SARIF is the only format VULNRΞPO both reads and writes, so the severity
 * mapping lives here once and both directions share it — otherwise an
 * export/import round-trip would silently drift severities.
 */

const SARIF_SCHEMA = 'https://json.schemastore.org/sarif-2.1.0.json';
const SARIF_VERSION = '2.1.0';

/** SARIF `level` values, in the order the spec defines them. */
type SarifLevel = 'error' | 'warning' | 'note' | 'none';

export interface SarifBuildOptions {
  toolName?: string;
  toolVersion?: string;
}

@Injectable({ providedIn: 'root' })
export class SarifService {

  constructor(private currentdateService: CurrentdateService) { }

  // ── Import: SARIF → VULNRΞPO issues ────────────────────────────────────────

  parse(json: string): any[] {
    let doc: any;
    try {
      doc = JSON.parse(json);
    } catch {
      throw new Error('File is not valid JSON.');
    }
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      throw new Error('Not a SARIF document.');
    }
    if (!Array.isArray(doc.runs)) {
      throw new Error('Not a SARIF document: missing "runs" array.');
    }

    const out: any[] = [];
    for (const run of doc.runs) {
      if (!run || typeof run !== 'object') continue;
      out.push(...this.parseRun(run));
    }
    return out;
  }

  private parseRun(run: any): any[] {
    const results: any[] = Array.isArray(run.results) ? run.results : [];
    if (results.length === 0) return [];

    const driver = run.tool?.driver ?? {};
    const extensions: any[] = Array.isArray(run.tool?.extensions) ? run.tool.extensions : [];
    const artifacts: any[] = Array.isArray(run.artifacts) ? run.artifacts : [];
    const toolName: string = this.str(driver.name) || 'SARIF';

    // Rule lookup tables, built once per run — a linear find() per result turns
    // a CodeQL export with thousands of results into an O(n*m) scan.
    const ruleIndexes = new Map<number, any[]>();
    const ruleIds = new Map<string, Map<string, any>>();
    const componentKey = (idx: number | null) => (idx === null ? 'driver' : 'ext:' + idx);

    const registerComponent = (component: any, idx: number | null) => {
      const rules: any[] = Array.isArray(component?.rules) ? component.rules : [];
      if (idx === null) ruleIndexes.set(-1, rules);
      else ruleIndexes.set(idx, rules);
      const byId = new Map<string, any>();
      for (const rule of rules) {
        const id = this.str(rule?.id);
        if (id && !byId.has(id)) byId.set(id, rule);
      }
      ruleIds.set(componentKey(idx), byId);
    };

    registerComponent(driver, null);
    extensions.forEach((ext, i) => registerComponent(ext, i));

    const out: any[] = [];
    for (const result of results) {
      if (!result || typeof result !== 'object') continue;

      // `absent` means the finding no longer reproduces against this baseline —
      // importing it would create a finding that is already known to be gone.
      if (result.baselineState === 'absent') continue;

      const ref = result.rule;
      const compIdx = typeof ref?.toolComponent?.index === 'number' ? ref.toolComponent.index : null;
      const rules = ruleIndexes.get(compIdx === null ? -1 : compIdx) ?? [];
      const idx = typeof ref?.index === 'number' ? ref.index
        : typeof result.ruleIndex === 'number' ? result.ruleIndex
          : -1;

      const ruleId = this.str(ref?.id) || this.str(result.ruleId);
      let rule: any = idx >= 0 ? rules[idx] : null;
      if (!rule && ruleId) rule = ruleIds.get(componentKey(compIdx))?.get(ruleId) ?? null;

      out.push(this.resultToIssue(result, rule, ruleId, toolName, artifacts));
    }
    return out;
  }

  private resultToIssue(result: any, rule: any, ruleId: string, toolName: string, artifacts: any[]): any {
    // A file we exported ourselves carries the original fields, so a
    // round-trip through SARIF does not degrade to a guess.
    const rt = result.properties?.vulnrepo;

    const message = this.messageText(result.message, rule);
    const shortDesc = this.mfText(rule?.shortDescription);
    const title = this.buildTitle(ruleId, shortDesc, message);

    const desc = rt?.desc !== undefined ? this.str(rt.desc) : this.buildDesc(message, rule, shortDesc);
    const poc = rt?.poc !== undefined ? this.str(rt.poc) : this.buildPoc(result, artifacts);

    const score = this.securitySeverity(result, rule);
    const severity = this.str(rt?.severity) || this.severityFor(result, rule, score);

    const cvss = rt?.cvss !== undefined ? this.str(rt.cvss) : (score !== null ? String(score) : '');
    const cve = rt?.cve !== undefined ? this.str(rt.cve) : this.extractCves(ruleId, message, rule).join(', ');

    return {
      title,
      poc,
      files: [],
      desc,
      severity,
      ref: rt?.ref !== undefined ? this.str(rt.ref) : this.buildRefs(rule),
      status: this.statusFor(result, rt),
      cvss,
      cvss_vector: this.str(rt?.cvss_vector),
      cve,
      tags: this.buildTags(rt, toolName, rule),
      bounty: [],
      date: this.currentdateService.getcurrentDate()
    };
  }

  private buildTitle(ruleId: string, shortDesc: string, message: string): string {
    const firstLine = message.split('\n').map(l => l.trim()).find(l => l.length > 0) ?? '';
    const label = shortDesc || firstLine;
    const title = ruleId && label ? `${ruleId}: ${label}` : (label || ruleId || 'SARIF result');
    return this.truncate(title, 200);
  }

  private buildDesc(message: string, rule: any, shortDesc: string): string {
    const full = this.mfText(rule?.fullDescription);
    const help = this.mfText(rule?.help);
    const blocks: string[] = [];
    // fullDescription/help routinely repeat the message verbatim; emitting all
    // three unfiltered produces a description that says the same thing 3 times.
    for (const block of [message, full, help]) {
      const trimmed = block.trim();
      if (!trimmed) continue;
      if (trimmed === shortDesc.trim()) continue;
      if (blocks.some(b => b === trimmed)) continue;
      blocks.push(trimmed);
    }
    return blocks.join('\n\n');
  }

  private buildPoc(result: any, artifacts: any[]): string {
    const locations: any[] = Array.isArray(result.locations) ? result.locations : [];
    const blocks: string[] = [];

    for (const loc of locations) {
      const block = this.locationBlock(loc, artifacts);
      if (block) blocks.push(block);
    }

    const related: any[] = Array.isArray(result.relatedLocations) ? result.relatedLocations : [];
    const relatedLines = related
      .map(loc => this.locationLabel(loc, artifacts))
      .filter(l => l.length > 0);
    if (relatedLines.length) {
      blocks.push('Related locations:\n' + relatedLines.map(l => '* `' + l + '`').join('\n'));
    }

    const flows: any[] = Array.isArray(result.codeFlows) ? result.codeFlows : [];
    if (flows.length) {
      const steps = this.codeFlowSteps(flows[0], artifacts);
      if (steps.length) {
        blocks.push('Code flow:\n' + steps.map((s, i) => `${i + 1}. \`${s}\``).join('\n'));
      }
    }

    return blocks.join('\n\n');
  }

  private locationBlock(loc: any, artifacts: any[]): string {
    const label = this.locationLabel(loc, artifacts);
    if (!label) return '';
    const snippet = this.str(loc?.physicalLocation?.region?.snippet?.text);
    if (!snippet) return '`' + label + '`';
    const lang = this.fenceLanguage(this.artifactUri(loc?.physicalLocation?.artifactLocation, artifacts));
    // A snippet containing ``` would break out of the fence and corrupt the
    // rest of the rendered issue, so widen the fence past anything inside it.
    const fence = '`'.repeat(Math.max(3, this.longestBacktickRun(snippet) + 1));
    return '`' + label + '`\n\n' + fence + lang + '\n' + snippet.replace(/\s+$/, '') + '\n' + fence;
  }

  private locationLabel(loc: any, artifacts: any[]): string {
    const physical = loc?.physicalLocation;
    const uri = this.artifactUri(physical?.artifactLocation, artifacts);
    const region = physical?.region;
    const parts: string[] = [];
    if (uri) parts.push(uri);
    if (region && typeof region.startLine === 'number') {
      let pos = String(region.startLine);
      if (typeof region.startColumn === 'number') pos += ':' + region.startColumn;
      if (typeof region.endLine === 'number' && region.endLine !== region.startLine) {
        pos += '-' + region.endLine;
      }
      parts.push(pos);
    }
    const label = parts.join(':');
    if (label) return label;
    // Logical locations are the only positional data some analyzers emit.
    const logical = Array.isArray(loc?.logicalLocations) ? loc.logicalLocations : [];
    return this.str(logical[0]?.fullyQualifiedName) || this.str(logical[0]?.name);
  }

  private codeFlowSteps(flow: any, artifacts: any[]): string[] {
    const threadFlows: any[] = Array.isArray(flow?.threadFlows) ? flow.threadFlows : [];
    const locations: any[] = Array.isArray(threadFlows[0]?.locations) ? threadFlows[0].locations : [];
    return locations
      .map(step => this.locationLabel(step?.location, artifacts))
      .filter(l => l.length > 0)
      .slice(0, 50);
  }

  private artifactUri(artifactLocation: any, artifacts: any[]): string {
    const direct = this.str(artifactLocation?.uri);
    if (direct) return direct;
    const idx = artifactLocation?.index;
    if (typeof idx === 'number' && artifacts[idx]) {
      return this.str(artifacts[idx]?.location?.uri);
    }
    return '';
  }

  private buildRefs(rule: any): string {
    const refs: string[] = [];
    const helpUri = this.str(rule?.helpUri);
    if (helpUri) refs.push(helpUri);
    const extra = rule?.properties?.references;
    if (Array.isArray(extra)) {
      extra.forEach(r => { const s = this.str(r); if (s && !refs.includes(s)) refs.push(s); });
    } else {
      const s = this.str(extra);
      if (s && !refs.includes(s)) refs.push(s);
    }
    return refs.join('\n');
  }

  private buildTags(rt: any, toolName: string, rule: any): any[] {
    const names: string[] = [];
    const push = (raw: string) => {
      const name = raw.trim();
      if (name && !names.some(n => n.toLowerCase() === name.toLowerCase())) names.push(name);
    };

    if (Array.isArray(rt?.tags)) {
      // Our own export — restore the tag set verbatim rather than stamping a
      // provenance tag, so export → import is lossless.
      rt.tags.forEach((t: any) => push(this.str(t?.name ?? t)));
    } else {
      // Foreign tool — tag the source, matching what every other importer does.
      push('sarif');
      push(toolName.toLowerCase());
      const tags = rule?.properties?.tags;
      if (Array.isArray(tags)) tags.forEach((t: any) => push(this.normalizeTag(this.str(t))));
    }
    return names.map(name => ({ name }));
  }

  /** CodeQL emits taxonomy tags as paths — `external/cwe/cwe-079` reads better as `CWE-79`. */
  private normalizeTag(tag: string): string {
    const cwe = tag.match(/(?:^|\/)cwe[-/](\d+)$/i);
    if (cwe) return 'CWE-' + String(Number(cwe[1]));
    const last = tag.split('/').pop() ?? tag;
    return last;
  }

  private statusFor(result: any, rt: any): number {
    if (typeof rt?.status === 'number' && rt.status >= 1 && rt.status <= 4) return rt.status;
    // A suppressed result is one the team already decided not to act on.
    const suppressions = result?.suppressions;
    if (Array.isArray(suppressions) && suppressions.some((s: any) => s?.status !== 'rejected')) {
      return 4;
    }
    return 1;
  }

  // ── Severity ───────────────────────────────────────────────────────────────

  /** GitHub code-scanning convention: a CVSS-like 0–10 score on the rule. */
  private securitySeverity(result: any, rule: any): number | null {
    const raw = result?.properties?.['security-severity'] ?? rule?.properties?.['security-severity'];
    if (raw === undefined || raw === null || raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 10) return null;
    return n;
  }

  private severityFor(result: any, rule: any, score: number | null): string {
    if (score !== null) return this.severityFromScore(score);
    return this.severityFromLevel(this.levelFor(result, rule));
  }

  private levelFor(result: any, rule: any): SarifLevel {
    const explicit = this.str(result?.level);
    if (this.isLevel(explicit)) return explicit;
    const fallback = this.str(rule?.defaultConfiguration?.level);
    if (this.isLevel(fallback)) return fallback;
    return 'warning'; // spec default
  }

  private isLevel(v: string): v is SarifLevel {
    return v === 'error' || v === 'warning' || v === 'note' || v === 'none';
  }

  severityFromScore(score: number): string {
    if (score >= 9.0) return 'Critical';
    if (score >= 7.0) return 'High';
    if (score >= 4.0) return 'Medium';
    if (score > 0.0) return 'Low';
    return 'Info';
  }

  severityFromLevel(level: SarifLevel): string {
    if (level === 'error') return 'High';
    if (level === 'warning') return 'Medium';
    if (level === 'note') return 'Low';
    return 'Info';
  }

  private levelFromSeverity(severity: string): SarifLevel {
    switch ((severity || '').toLowerCase()) {
      case 'critical':
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'note';
      case 'info': return 'none';
      default: return 'warning';
    }
  }

  /** Representative score for a severity band, used only when the issue has no CVSS. */
  private scoreFromSeverity(severity: string): number | null {
    switch ((severity || '').toLowerCase()) {
      case 'critical': return 9.5;
      case 'high': return 8.0;
      case 'medium': return 5.5;
      case 'low': return 2.0;
      case 'info': return 0.0;
      default: return null;
    }
  }

  // ── Export: VULNRΞPO issues → SARIF ────────────────────────────────────────

  build(issues: any[], opts: SarifBuildOptions = {}): string {
    const list: any[] = Array.isArray(issues) ? issues : [];
    const toolName = opts.toolName || 'VULNRΞPO';

    const rules: any[] = [];
    const results: any[] = [];
    const usedIds = new Map<string, number>();

    for (const issue of list) {
      if (!issue || typeof issue !== 'object') continue;

      const severity = this.str(issue.severity);
      const level = this.levelFromSeverity(severity);
      const score = this.cvssScore(issue.cvss) ?? this.scoreFromSeverity(severity);
      const title = this.str(issue.title) || 'Untitled finding';
      const desc = this.str(issue.desc);
      const poc = this.str(issue.poc);

      const ruleId = this.uniqueRuleId(title, usedIds);
      const ruleProps: any = { tags: this.tagNames(issue) };
      if (score !== null) ruleProps['security-severity'] = String(score);

      const rule: any = {
        id: ruleId,
        name: this.pascalCase(title),
        shortDescription: { text: this.truncate(title, 200) },
        defaultConfiguration: { level },
        properties: ruleProps
      };
      if (desc) rule.fullDescription = { text: desc };
      const helpUri = this.firstUrl(this.str(issue.ref));
      if (helpUri) rule.helpUri = helpUri;

      const messageText = [desc, poc ? 'Proof of concept:\n' + poc : '']
        .filter(b => b.trim().length > 0)
        .join('\n\n') || title;

      const result: any = {
        ruleId,
        ruleIndex: rules.length,
        level,
        message: { text: messageText },
        properties: {
          // Everything needed to reconstruct the issue on re-import. SARIF has
          // no home for most of these, so they ride in `properties`.
          vulnrepo: {
            severity,
            status: typeof issue.status === 'number' ? issue.status : 1,
            desc,
            poc,
            ref: this.str(issue.ref),
            cvss: this.str(issue.cvss),
            cvss_vector: this.str(issue.cvss_vector),
            cve: this.str(issue.cve),
            tags: this.tagNames(issue).map(name => ({ name })),
            // Attachment bytes stay out of SARIF; the checksums still prove
            // which evidence belonged to this finding.
            attachments: this.attachmentMeta(issue)
          }
        }
      };

      // "Won't Fix" is exactly what a SARIF suppression records.
      if (issue.status === 4) {
        result.suppressions = [{ kind: 'external', status: 'accepted', justification: "Marked \"Won't Fix\" in VULNRΞPO" }];
      }

      rules.push(rule);
      results.push(result);
    }

    const driver: any = {
      name: toolName,
      informationUri: 'https://vulnrepo.com/',
      rules
    };
    if (opts.toolVersion) driver.version = opts.toolVersion;

    const doc = {
      $schema: SARIF_SCHEMA,
      version: SARIF_VERSION,
      runs: [{ tool: { driver }, results }]
    };

    return JSON.stringify(doc, null, 2);
  }

  private attachmentMeta(issue: any): any[] {
    const files: any[] = Array.isArray(issue.files) ? issue.files : [];
    return files.map(f => ({
      title: this.str(f?.title),
      type: this.str(f?.type),
      size: f?.size ?? 0,
      sha256checksum: this.str(f?.sha256checksum)
    }));
  }

  private tagNames(issue: any): string[] {
    const tags: any[] = Array.isArray(issue.tags) ? issue.tags : [];
    const out: string[] = [];
    for (const t of tags) {
      const name = this.str(t?.name ?? t).trim();
      if (name && !out.includes(name)) out.push(name);
    }
    return out;
  }

  private cvssScore(raw: any): number | null {
    if (raw === undefined || raw === null || raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 10) return null;
    return n;
  }

  private uniqueRuleId(title: string, used: Map<string, number>): string {
    const base = this.slugify(title);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  }

  private slugify(s: string): string {
    const slug = (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '');
    return slug || 'finding';
  }

  private pascalCase(s: string): string {
    const parts = (s || '').split(/[^A-Za-z0-9]+/).filter(Boolean).slice(0, 8);
    if (!parts.length) return 'Finding';
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  }

  private firstUrl(text: string): string {
    const m = (text || '').match(/https?:\/\/[^\s<>"']+/);
    return m ? m[0] : '';
  }

  // ── Shared helpers ─────────────────────────────────────────────────────────

  /** Resolve a SARIF multiformatMessageString, preferring markdown (the app renders it). */
  private mfText(mf: any): string {
    if (!mf) return '';
    if (typeof mf === 'string') return mf;
    return this.str(mf.markdown) || this.str(mf.text);
  }

  /**
   * Resolve a result message. SARIF allows `{ id, arguments }` referencing
   * `rule.messageStrings`, with `{0}`-style placeholders.
   */
  private messageText(message: any, rule: any): string {
    const direct = this.mfText(message);
    if (direct) return direct;

    const id = this.str(message?.id);
    if (!id) return '';
    const template = this.mfText(rule?.messageStrings?.[id]);
    if (!template) return '';

    const args: any[] = Array.isArray(message?.arguments) ? message.arguments : [];
    return template.replace(/\{(\d+)\}/g, (match, i) => {
      const arg = args[Number(i)];
      return arg === undefined ? match : this.str(arg);
    });
  }

  private extractCves(ruleId: string, message: string, rule: any): string[] {
    const haystack = [
      ruleId,
      message,
      this.str(rule?.id),
      this.str(rule?.name),
      Array.isArray(rule?.properties?.tags) ? rule.properties.tags.join(' ') : ''
    ].join(' ');
    const found = haystack.match(/CVE-\d{4}-\d{4,}/gi) ?? [];
    const out: string[] = [];
    for (const cve of found) {
      const upper = cve.toUpperCase();
      if (!out.includes(upper)) out.push(upper);
    }
    return out;
  }

  private longestBacktickRun(s: string): number {
    let longest = 0;
    const runs = s.match(/`+/g);
    if (runs) for (const run of runs) longest = Math.max(longest, run.length);
    return longest;
  }

  private fenceLanguage(uri: string): string {
    const ext = (uri.split('.').pop() ?? '').toLowerCase();
    const map: Record<string, string> = {
      js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
      ts: 'typescript', tsx: 'typescript', py: 'python', rb: 'ruby', go: 'go',
      java: 'java', kt: 'kotlin', cs: 'csharp', php: 'php', rs: 'rust',
      c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp', swift: 'swift',
      sh: 'bash', bash: 'bash', ps1: 'powershell', sql: 'sql',
      html: 'html', xml: 'xml', css: 'css', scss: 'scss',
      json: 'json', yml: 'yaml', yaml: 'yaml', tf: 'hcl'
    };
    return map[ext] ?? '';
  }

  private str(v: any): string {
    if (v === undefined || v === null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return '';
  }

  private truncate(s: string, n: number): string {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
}
