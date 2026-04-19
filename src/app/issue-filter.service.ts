import { Injectable } from '@angular/core';

export type FilterAst =
  | { op: 'or'; children: FilterAst[] }
  | { op: 'and'; children: FilterAst[] }
  | { op: 'not'; child: FilterAst; notStart: number }
  | { op: 'field'; key: string; value: string; raw: string; start: number; end: number }
  | { op: 'text'; term: string; raw: string; start: number; end: number };

export interface FilterPill {
  label: string;
  negated: boolean;
  connector?: 'OR' | 'AND';
  /** Start offset in the source query (inclusive). Includes a leading `-`/`!` when negated. */
  start: number;
  /** End offset in the source query (exclusive). */
  end: number;
}

export interface FilterResult {
  ast: FilterAst | null;
  error: string | null;
  empty: boolean;
}

interface Token {
  type: 'ATOM' | 'OR' | 'LP' | 'RP' | 'NOT';
  value?: string;
  start: number;
  end: number;
}

const FIELD_KEYS = new Set([
  'severity', 'cvss', 'status', 'tag', 'title', 'poc', 'desc', 'has'
]);

const STATUS_MAP: Record<string, number> = {
  '1': 1, 'open': 1, 'waiting': 1,
  '2': 2, 'in-progress': 2, 'inprogress': 2, 'in_progress': 2, 'wip': 2, 'progress': 2,
  '3': 3, 'fixed': 3,
  '4': 4, 'wontfix': 4, "won'tfix": 4, 'wont-fix': 4, 'notfix': 4,
};

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'];

@Injectable({ providedIn: 'root' })
export class IssueFilterService {

  parse(query: string): FilterResult {
    const q = (query ?? '').trim();
    if (!q) return { ast: null, error: null, empty: true };
    try {
      const tokens = this.tokenize(q);
      if (tokens.length === 0) return { ast: null, error: null, empty: true };
      const parser = new Parser(tokens);
      const ast = parser.parseOr();
      if (!parser.eof()) {
        return { ast: null, error: `Unexpected token near "${parser.peek()?.value ?? ''}"`, empty: false };
      }
      return { ast, error: null, empty: false };
    } catch (e: any) {
      return { ast: null, error: e?.message ?? 'Invalid filter', empty: false };
    }
  }

  filter<T = any>(vulns: T[], query: string): { result: T[]; error: string | null } {
    const parsed = this.parse(query);
    if (parsed.empty) return { result: vulns, error: null };
    if (parsed.error || !parsed.ast) return { result: vulns, error: parsed.error };
    return { result: vulns.filter(v => this.evaluate(parsed.ast!, v)), error: null };
  }

  /** Flatten AST into labeled tokens for pill rendering. */
  describe(ast: FilterAst | null): FilterPill[] {
    if (!ast) return [];
    const out: FilterPill[] = [];
    const walk = (node: FilterAst, negated: boolean, notStart: number | null, connector?: 'OR' | 'AND') => {
      if (node.op === 'not') {
        // Inherit outer notStart only when an outer NOT is already pending; otherwise use this NOT's position.
        const start = notStart ?? node.notStart;
        return walk(node.child, !negated, start, connector);
      }
      if (node.op === 'and') {
        node.children.forEach((c, i) => walk(c, negated, notStart, i === 0 ? connector : 'AND'));
        return;
      }
      if (node.op === 'or') {
        node.children.forEach((c, i) => walk(c, negated, notStart, i === 0 ? connector : 'OR'));
        return;
      }
      const label = node.op === 'field' ? `${node.key}:${node.value}` : `"${node.term}"`;
      out.push({
        label,
        negated,
        connector,
        start: negated && notStart !== null ? notStart : node.start,
        end: node.end,
      });
    };
    walk(ast, false, null);
    return out;
  }

  /** Remove a source range from the query and tidy up dangling operators. */
  removeRange(query: string, start: number, end: number): string {
    const q = query ?? '';
    if (start < 0 || end > q.length || start >= end) return q;
    return this.cleanupQuery(q.slice(0, start) + q.slice(end));
  }

  private cleanupQuery(q: string): string {
    let prev: string;
    let s = q;
    do {
      prev = s;
      s = s.replace(/[ \t]+/g, ' ').trim();
      s = s.replace(/\(\s*\)/g, '');
      s = s.replace(/\(\s*(OR|AND)\b/gi, '(');
      s = s.replace(/\b(OR|AND)\s*\)/gi, ')');
      s = s.replace(/^\s*(OR|AND)\b/i, '');
      s = s.replace(/\b(OR|AND)\s*$/i, '');
      s = s.replace(/\b(OR|AND)\s+(OR|AND)\b/gi, '$1');
      s = s.replace(/[-!]\s*(?=$|\))/g, '');
    } while (s !== prev);
    return s.trim();
  }

  /**
   * Add the token `key:value` if absent, remove it if already present (as a top-level atom).
   * Recognizes comma-lists (`key:a,b,c`): toggling removes the matching entry from the list,
   * or appends to an existing list rather than producing a duplicate token.
   * Used by chip shortcuts.
   */
  toggleFieldToken(query: string, key: string, value: string): string {
    const q = (query ?? '').trim();
    const prefix = `${key.toLowerCase()}:`;
    const valueLower = value.toLowerCase();
    const parts = q.length ? this.splitTopLevel(q) : [];

    const idx = parts.findIndex(p => p.toLowerCase().startsWith(prefix));
    if (idx >= 0) {
      const list = parts[idx].slice(prefix.length).split(',').map(s => s.trim()).filter(Boolean);
      const pos = list.findIndex(s => this.stripQuotes(s).toLowerCase() === valueLower);
      if (pos >= 0) {
        list.splice(pos, 1);
      } else {
        list.push(value);
      }
      if (list.length === 0) {
        parts.splice(idx, 1);
      } else {
        parts[idx] = `${key}:${list.join(',')}`;
      }
      return parts.join(' ').trim();
    }
    parts.push(`${key}:${value}`);
    return parts.join(' ').trim();
  }

  hasFieldToken(query: string, key: string, value: string): boolean {
    const prefix = `${key.toLowerCase()}:`;
    const valueLower = value.toLowerCase();
    return this.splitTopLevel(query ?? '').some(p => {
      if (!p.toLowerCase().startsWith(prefix)) return false;
      return p.slice(prefix.length)
        .split(',')
        .some(s => this.stripQuotes(s.trim()).toLowerCase() === valueLower);
    });
  }

  // ── Internals ────────────────────────────────────────────────

  private splitTopLevel(q: string): string[] {
    const out: string[] = [];
    let cur = '';
    let depth = 0;
    let inQuote = false;
    for (let i = 0; i < q.length; i++) {
      const c = q[i];
      if (inQuote) {
        cur += c;
        if (c === '"') inQuote = false;
        continue;
      }
      if (c === '"') { inQuote = true; cur += c; continue; }
      if (c === '(') { depth++; cur += c; continue; }
      if (c === ')') { depth--; cur += c; continue; }
      if (c === ' ' && depth === 0) {
        if (cur) { out.push(cur); cur = ''; }
        continue;
      }
      cur += c;
    }
    if (cur) out.push(cur);
    return out;
  }

  private tokenize(q: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const isBoundary = (prev: string | undefined) => prev === undefined || prev === ' ' || prev === '(';

    while (i < q.length) {
      const c = q[i];
      if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
      if (c === '(') { tokens.push({ type: 'LP', start: i, end: i + 1 }); i++; continue; }
      if (c === ')') { tokens.push({ type: 'RP', start: i, end: i + 1 }); i++; continue; }

      // NOT: leading `-` or `!` only when at a boundary and followed by non-whitespace
      if ((c === '-' || c === '!') && isBoundary(q[i - 1]) && i + 1 < q.length && q[i + 1] !== ' ') {
        tokens.push({ type: 'NOT', start: i, end: i + 1 });
        i++;
        continue;
      }

      // Atom: consume until whitespace or top-level paren, respecting quotes
      const atomStart = i;
      let atom = '';
      let inQuote = false;
      while (i < q.length) {
        const ch = q[i];
        if (inQuote) {
          atom += ch;
          if (ch === '"') inQuote = false;
          i++;
          continue;
        }
        if (ch === '"') { inQuote = true; atom += ch; i++; continue; }
        if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '(' || ch === ')') break;
        atom += ch;
        i++;
      }
      if (!atom) continue;

      const upper = atom.toUpperCase();
      const atomEnd = i;
      if (upper === 'OR' || upper === '||') { tokens.push({ type: 'OR', start: atomStart, end: atomEnd }); continue; }
      if (upper === 'AND' || upper === '&&') { continue; } // implicit AND; drop keyword
      tokens.push({ type: 'ATOM', value: atom, start: atomStart, end: atomEnd });
    }
    return tokens;
  }

  private evaluate(ast: FilterAst, v: any): boolean {
    switch (ast.op) {
      case 'and': return ast.children.every(c => this.evaluate(c, v));
      case 'or': return ast.children.some(c => this.evaluate(c, v));
      case 'not': return !this.evaluate(ast.child, v);
      case 'text': return this.matchText(v, ast.term);
      case 'field': return this.matchField(v, ast.key, ast.value);
    }
  }

  private matchText(v: any, term: string): boolean {
    const t = term.toLowerCase();
    return (v.title ?? '').toLowerCase().includes(t)
        || (v.poc   ?? '').toLowerCase().includes(t)
        || (v.desc  ?? '').toLowerCase().includes(t);
  }

  private matchField(v: any, key: string, rawValue: string): boolean {
    const k = key.toLowerCase();
    const value = this.stripQuotes(rawValue);

    if (k === 'severity') {
      return this.valueList(value).some(x => (v.severity ?? '').toLowerCase() === x.toLowerCase());
    }
    if (k === 'cvss') {
      const n = Number(v.cvss);
      if (Number.isNaN(n)) return false;
      return this.numericMatch(n, value);
    }
    if (k === 'status') {
      const codes = this.valueList(value).map(x => STATUS_MAP[x.toLowerCase()]).filter(x => x !== undefined);
      if (codes.length === 0) return false;
      return codes.includes(Number(v.status));
    }
    if (k === 'tag') {
      const wants = this.valueList(value).map(x => x.toLowerCase());
      const tags: any[] = v.tags ?? [];
      return wants.some(w => tags.some(t => (t?.name ?? '').toLowerCase().includes(w)));
    }
    if (k === 'title' || k === 'poc' || k === 'desc') {
      return (v[k] ?? '').toLowerCase().includes(value.toLowerCase());
    }
    if (k === 'has') {
      const w = value.toLowerCase();
      if (w === 'bounty')  return Array.isArray(v.bounty) ? v.bounty.length > 0 : !!v.bounty;
      if (w === 'tag' || w === 'tags') return Array.isArray(v.tags) && v.tags.length > 0;
      if (w === 'poc')     return !!(v.poc ?? '').trim();
      if (w === 'desc')    return !!(v.desc ?? '').trim();
      if (w === 'cvss')    return v.cvss !== undefined && v.cvss !== null && v.cvss !== '';
      return false;
    }
    return false;
  }

  private numericMatch(n: number, value: string): boolean {
    const m = value.match(/^(>=|<=|>|<)(-?\d+(?:\.\d+)?)$/);
    if (m) {
      const num = parseFloat(m[2]);
      switch (m[1]) {
        case '>=': return n >= num;
        case '<=': return n <= num;
        case '>':  return n >  num;
        case '<':  return n <  num;
      }
    }
    const range = value.match(/^(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/);
    if (range) {
      const lo = parseFloat(range[1]);
      const hi = parseFloat(range[2]);
      return n >= lo && n <= hi;
    }
    // list of exacts
    return this.valueList(value).some(x => {
      const num = parseFloat(x);
      return !Number.isNaN(num) && num === n;
    });
  }

  private valueList(value: string): string[] {
    const v = this.stripQuotes(value);
    if (v.includes(',')) return v.split(',').map(s => s.trim()).filter(Boolean);
    return [v];
  }

  private stripQuotes(s: string): string {
    if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
    return s;
  }
}

// ── Recursive descent parser ────────────────────────────────────
class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  eof(): boolean { return this.pos >= this.tokens.length; }
  peek(): Token | undefined { return this.tokens[this.pos]; }
  private consume(type: Token['type']): Token | null {
    const t = this.peek();
    if (t && t.type === type) { this.pos++; return t; }
    return null;
  }

  parseOr(): FilterAst {
    const first = this.parseAnd();
    const parts: FilterAst[] = [first];
    while (this.peek()?.type === 'OR') {
      this.pos++;
      parts.push(this.parseAnd());
    }
    return parts.length === 1 ? first : { op: 'or', children: parts };
  }

  parseAnd(): FilterAst {
    const first = this.parseUnary();
    const parts: FilterAst[] = [first];
    while (!this.eof()) {
      const t = this.peek()!;
      if (t.type === 'OR' || t.type === 'RP') break;
      parts.push(this.parseUnary());
    }
    return parts.length === 1 ? first : { op: 'and', children: parts };
  }

  parseUnary(): FilterAst {
    const notTok = this.consume('NOT');
    if (notTok) return { op: 'not', child: this.parseUnary(), notStart: notTok.start };
    return this.parsePrimary();
  }

  parsePrimary(): FilterAst {
    if (this.consume('LP')) {
      const inner = this.parseOr();
      if (!this.consume('RP')) throw new Error('Missing closing ")"');
      return inner;
    }
    const t = this.peek();
    if (!t || t.type !== 'ATOM') throw new Error('Expected a term');
    this.pos++;
    return this.atomToAst(t.value!, t.start, t.end);
  }

  private atomToAst(raw: string, start: number, end: number): FilterAst {
    const colonIdx = this.firstUnquotedColon(raw);
    if (colonIdx > 0) {
      const key = raw.slice(0, colonIdx).toLowerCase();
      const value = raw.slice(colonIdx + 1);
      if (FIELD_KEYS.has(key)) {
        return { op: 'field', key, value, raw, start, end };
      }
    }
    const term = raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2 ? raw.slice(1, -1) : raw;
    return { op: 'text', term, raw, start, end };
  }

  private firstUnquotedColon(s: string): number {
    let inQuote = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '"') inQuote = !inQuote;
      else if (c === ':' && !inQuote) return i;
    }
    return -1;
  }
}

export const ISSUE_FILTER_SEVERITIES = SEVERITIES;
