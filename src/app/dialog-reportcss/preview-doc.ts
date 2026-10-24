/**
 * Skeleton document for the live preview pane.
 *
 * It mirrors the real exported report (src/assets/html_report_v3_template.html):
 * the same design tokens, the same `.light-mode` override on <body>, and -- the
 * part that actually matters -- the user's stylesheet in a <style> that comes
 * AFTER the base one. Report CSS is injected the same way at export time, so a
 * rule that loses a specificity tie here loses it in the real report too.
 *
 * Fonts are pulled from the app's own copy of the embedded faces, so the
 * preview renders in the typefaces the report ships with. It is a <link>
 * rather than inlined text because the file is ~800 KB: this way the browser
 * fetches it once and serves every later preview from cache.
 */
export const PREVIEW_FONT_CSS = '/assets/res/fonts/fonts-inline.css';

/** Token + component CSS, trimmed from the report template to what the mock uses. */
const BASE_CSS = `
:root {
  --bg:#09090c; --bg2:#111116; --bg3:#18181f; --bg4:#22222c; --bg5:#2a2a38;
  --border:rgba(255,255,255,0.07); --border2:rgba(255,255,255,0.13); --border3:rgba(255,255,255,0.22);
  --text:#eeeef2; --text2:#8888a0; --text3:#52526a;
  --accent:#00e87a; --accent2:#00b85f;
  --red:#ff2d55; --orange:#ff6820; --yellow:#f0c000; --green:#00e87a; --blue:#4a9eff;
  --mono:'JetBrains Mono','Cascadia Code','Fira Code','Consolas',monospace;
  --display:'Syne','DM Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --body:'DM Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --r:8px; --r2:12px; --r3:18px;
}
.light-mode {
  --bg:#f2f2f6; --bg2:#ffffff; --bg3:#ebebf2; --bg4:#e0e0ec; --bg5:#d2d2e2;
  --border:rgba(0,0,0,0.07); --border2:rgba(0,0,0,0.13); --border3:rgba(0,0,0,0.22);
  --text:#0d0d18; --text2:#4c4c68; --text3:#9090b0;
  --accent:#009950; --accent2:#007840;
  --red:#d91a3c; --orange:#c84400; --yellow:#8a6a00; --green:#009950; --blue:#1a60d0;
}
*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
body {
  font-family:var(--body); background:var(--bg); color:var(--text);
  font-size:13px; line-height:1.65; -webkit-font-smoothing:antialiased;
  transition:background .3s,color .3s;
}
a { color:var(--blue); text-decoration:none; }
h1,h2,h3 { font-family:var(--display); color:var(--text); margin:0; }

/* Cover */
.cover-page {
  position:relative; overflow:hidden; padding:34px 24px 30px;
  display:flex; flex-direction:column; align-items:center;
}
.cover-bg-grid {
  position:absolute; inset:0;
  background-image:
    linear-gradient(rgba(0,232,122,.035) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,232,122,.035) 1px,transparent 1px);
  background-size:44px 44px;
  mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%);
  -webkit-mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%);
}
.cover-glow {
  position:absolute; width:420px; height:420px; top:50%; left:50%;
  transform:translate(-50%,-50%); pointer-events:none;
  background:radial-gradient(circle,rgba(0,232,122,.07) 0%,transparent 70%);
}
.cover-badge {
  display:inline-flex; align-items:center; gap:7px; position:relative; z-index:1;
  font-family:var(--mono); font-size:8.5px; letter-spacing:.12em; text-transform:uppercase;
  background:rgba(255,45,85,.1); color:var(--red); border:1px solid rgba(255,45,85,.28);
  padding:4px 11px; border-radius:6px; margin-bottom:14px;
}
.pulse-dot { width:5px; height:5px; border-radius:50%; background:var(--red); }
.cover-title {
  font-family:var(--display); font-size:27px; font-weight:800; line-height:1.1;
  text-align:center; letter-spacing:-.025em; margin-bottom:8px;
  position:relative; z-index:1; color:var(--text);
}
.cover-title .report_name { color:var(--accent); }
.cover-sub {
  font-size:12px; color:var(--text2); text-align:center;
  margin-bottom:18px; position:relative; z-index:1;
}
.cover-meta-row {
  display:flex; gap:8px; flex-wrap:wrap; justify-content:center;
  margin-bottom:20px; position:relative; z-index:1;
}
.meta-chip {
  display:flex; align-items:center; gap:5px;
  background:var(--bg2); border:1px solid var(--border2); border-radius:7px;
  padding:5px 10px; font-family:var(--mono); font-size:9.5px; color:var(--text2);
}
.meta-chip-lbl { color:var(--text3); }
.cover-sev-strip {
  display:flex; border:1px solid var(--border2); border-radius:var(--r2);
  overflow:hidden; width:100%; max-width:430px; position:relative; z-index:1;
}
.sev-cell { flex:1; padding:11px 6px; text-align:center; border-right:1px solid var(--border); }
.sev-cell:last-child { border-right:none; }
.sev-num { font-family:var(--display); font-size:19px; font-weight:800; line-height:1; }
.sev-lbl {
  font-family:var(--mono); font-size:7.5px; text-transform:uppercase;
  letter-spacing:.1em; margin-top:4px;
}

/* Topbar */
.topbar {
  display:flex; align-items:center; justify-content:space-between;
  padding:8px 18px; background:var(--bg2); border-bottom:1px solid var(--border);
  border-top:1px solid var(--border);
}
.topbar-left { font-family:var(--mono); font-size:9px; color:var(--text3); letter-spacing:.08em; }
.topbar-accent { color:var(--accent); }
.tbtn {
  padding:4px 10px; border-radius:6px; border:1px solid var(--border2);
  background:transparent; color:var(--text2); font-family:var(--mono); font-size:9px;
}
.tbtn.active { background:var(--bg4); border-color:var(--border3); color:var(--text); }

/* Body shell */
.shell { max-width:760px; margin:0 auto; padding:18px 18px 26px; display:flex; flex-direction:column; gap:16px; }
.sec-div { display:flex; align-items:center; gap:10px; margin-bottom:11px; }
.sec-num { font-family:var(--mono); font-size:8.5px; color:var(--accent); letter-spacing:.1em; }
.sec-lbl { font-family:var(--display); font-size:14px; font-weight:700; color:var(--text); white-space:nowrap; }
.sec-line { flex:1; height:1px; background:var(--border); }

/* Issue cards */
.issue-card {
  background:var(--bg2); border:1px solid var(--border);
  border-radius:var(--r2); overflow:hidden; margin-bottom:9px;
}
.issue-header {
  display:flex; align-items:center; gap:10px; padding:11px 15px;
  border-bottom:1px solid var(--border);
}
.issue-title { font-size:12.5px; font-weight:500; flex:1; color:var(--text); }
.issue-meta { display:flex; align-items:center; gap:8px; }
.issue-date { font-family:var(--mono); font-size:9px; color:var(--text3); }
.sev-pill, .label {
  display:inline-block; font-family:var(--mono); font-size:9px; font-weight:600;
  padding:3px 8px; border-radius:5px; letter-spacing:.07em; text-transform:uppercase; line-height:1.4;
}
.sev-pill.sev-critical,.Critical,.critical { background:rgba(255,45,85,.12); color:var(--red)!important; border:1px solid rgba(255,45,85,.3); }
.sev-pill.sev-high,.High,.high { background:rgba(255,104,32,.12); color:var(--orange)!important; border:1px solid rgba(255,104,32,.3); }
.sev-pill.sev-medium,.Medium,.medium { background:rgba(240,192,0,.12); color:var(--yellow)!important; border:1px solid rgba(240,192,0,.3); }
.sev-pill.sev-low,.Low,.low { background:rgba(0,232,122,.1); color:var(--green)!important; border:1px solid rgba(0,232,122,.22); }
.sev-pill.sev-info,.Info,.info { background:rgba(74,158,255,.1); color:var(--blue)!important; border:1px solid rgba(74,158,255,.25); }
.status-badge {
  font-family:var(--mono); font-size:8px; padding:2px 6px; border-radius:4px;
  border:1px solid var(--border2); color:var(--text3);
  text-transform:uppercase; letter-spacing:.06em;
}
.s-open { color:var(--yellow); border-color:rgba(240,192,0,.3); background:rgba(240,192,0,.07); }
.s-fixed { color:var(--green); border-color:rgba(0,232,122,.22); background:rgba(0,232,122,.06); }
.issue-body { padding:14px 15px; }
.ib-grid {
  display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:12px;
  padding:10px 12px; background:var(--bg3); border-radius:var(--r);
}
.ib-lbl {
  font-family:var(--mono); font-size:8px; color:var(--text3);
  text-transform:uppercase; letter-spacing:.1em; margin-bottom:3px;
}
.ib-val { font-size:11.5px; color:var(--text2); font-family:var(--mono); }
.ib-section-lbl {
  font-family:var(--mono); font-size:8px; color:var(--text3); text-transform:uppercase;
  letter-spacing:.1em; margin-bottom:6px; margin-top:12px;
}
.ib-text { font-size:12px; color:var(--text2); line-height:1.7; margin-bottom:4px; }
.code-block {
  background:var(--bg3); border:1px solid var(--border); border-left:3px solid var(--border2);
  border-radius:var(--r); padding:10px 12px; font-family:var(--mono); font-size:11px;
  color:var(--text2); line-height:1.7; white-space:pre-wrap; margin-top:4px;
}
.tags-row { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
.tag {
  font-family:var(--mono); font-size:8.5px; color:var(--text3);
  background:var(--bg3); border:1px solid var(--border); border-radius:4px; padding:2px 7px;
}

/* Tables */
.tablemd { width:100%; border-collapse:collapse; font-size:12px; }
.tablemd th,.tablemd td { padding:7px 10px; border:1px solid var(--border); color:var(--text); background:var(--bg2); }
.tablemd thead th { background:var(--bg3); font-weight:600; font-size:11px; }

/* Card + footer */
.card { background:var(--bg2); border:1px solid var(--border); border-radius:var(--r2); padding:14px 16px; }
.summary-content {
  background:var(--bg2); border:1px solid var(--border); border-radius:var(--r2);
  padding:14px 16px; font-size:12.5px; color:var(--text2); line-height:1.75;
}
.report-footer {
  text-align:center; padding:16px 0 4px; font-family:var(--mono); font-size:9px;
  color:var(--text3); border-top:1px solid var(--border); margin-top:4px;
}
.report-footer a { color:var(--accent); }
`;

/** Mock report body -- exercises the selectors presets actually restyle. */
const MOCK_BODY = `
<div class="cover-page">
  <div class="cover-bg-grid"></div>
  <div class="cover-glow"></div>
  <div class="cover-badge"><span class="pulse-dot"></span>Confidential document</div>
  <div class="cover-title">Security Assessment<br><span class="report_name">ACME Corp</span></div>
  <div class="cover-sub">External network &amp; web application penetration test</div>
  <div class="cover-meta-row">
    <div class="meta-chip"><span class="meta-chip-lbl">ID</span> VR-2026-0042</div>
    <div class="meta-chip"><span class="meta-chip-lbl">VER</span> 1.3</div>
    <div class="meta-chip"><span class="meta-chip-lbl">DATE</span> 2026-10-24</div>
  </div>
  <div class="cover-sev-strip">
    <div class="sev-cell"><div class="sev-num" style="color:var(--red)">2</div><div class="sev-lbl" style="color:var(--red)">Critical</div></div>
    <div class="sev-cell"><div class="sev-num" style="color:var(--orange)">5</div><div class="sev-lbl" style="color:var(--orange)">High</div></div>
    <div class="sev-cell"><div class="sev-num" style="color:var(--yellow)">8</div><div class="sev-lbl" style="color:var(--yellow)">Medium</div></div>
    <div class="sev-cell"><div class="sev-num" style="color:var(--green)">4</div><div class="sev-lbl" style="color:var(--green)">Low</div></div>
    <div class="sev-cell"><div class="sev-num" style="color:var(--blue)">3</div><div class="sev-lbl" style="color:var(--blue)">Info</div></div>
  </div>
</div>

<div class="topbar">
  <div class="topbar-left">// <span class="topbar-accent">VULNREPO</span> &middot; VR-2026-0042</div>
  <div><button class="tbtn active">Dark</button> <button class="tbtn">Light</button></div>
</div>

<div class="shell">
  <div>
    <div class="sec-div"><span class="sec-num">01</span><span class="sec-lbl">Executive Summary</span><span class="sec-line"></span></div>
    <div class="summary-content">
      Testing identified <strong>22 findings</strong>, two of which are critical and allow
      unauthenticated access to customer records. Remediation of the critical items is
      recommended before the next release.
    </div>
  </div>

  <div>
    <div class="sec-div"><span class="sec-num">02</span><span class="sec-lbl">Findings</span><span class="sec-line"></span></div>

    <div class="issue-card">
      <div class="issue-header">
        <span class="issue-title">SQL injection in /api/v1/search</span>
        <div class="issue-meta">
          <span class="issue-date">2026-10-21</span>
          <span class="status-badge s-open">Open</span>
          <span class="sev-pill sev-critical">Critical</span>
        </div>
      </div>
      <div class="issue-body">
        <div class="ib-grid">
          <div><div class="ib-lbl">CVSS</div><div class="ib-val">9.8</div></div>
          <div><div class="ib-lbl">Vector</div><div class="ib-val">AV:N/AC:L</div></div>
          <div><div class="ib-lbl">CWE</div><div class="ib-val">CWE-89</div></div>
        </div>
        <div class="ib-section-lbl">Description</div>
        <div class="ib-text">
          The <code>q</code> parameter is concatenated directly into a SQL statement,
          allowing an attacker to read arbitrary tables.
        </div>
        <div class="ib-section-lbl">Proof of concept</div>
        <div class="code-block">GET /api/v1/search?q=1' UNION SELECT password FROM users--
Host: acme.example</div>
        <div class="tags-row"><span class="tag">injection</span><span class="tag">owasp-a03</span></div>
      </div>
    </div>

    <div class="issue-card">
      <div class="issue-header">
        <span class="issue-title">Missing HSTS header</span>
        <div class="issue-meta">
          <span class="issue-date">2026-10-22</span>
          <span class="status-badge s-fixed">Fixed</span>
          <span class="sev-pill sev-low">Low</span>
        </div>
      </div>
    </div>
  </div>

  <div>
    <div class="sec-div"><span class="sec-num">03</span><span class="sec-lbl">Scope</span><span class="sec-line"></span></div>
    <div class="card">
      <table class="tablemd">
        <thead><tr><th>Target</th><th>Type</th><th>Result</th></tr></thead>
        <tbody>
          <tr><td>acme.example</td><td>Web</td><td><span class="label Critical">Critical</span></td></tr>
          <tr><td>api.acme.example</td><td>API</td><td><span class="label Medium">Medium</span></td></tr>
          <tr><td>vpn.acme.example</td><td>Network</td><td><span class="label Info">Info</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="report-footer">Generated by <a href="#">VULNREPO</a> &middot; preview</div>
</div>
`;

/**
 * Full skeleton. The user stylesheet goes into the empty trailing <style>, which
 * the dialog patches in place -- rewriting the whole document on every keystroke
 * would re-parse the ~800 KB font sheet and make the preview flicker.
 */
export function buildPreviewDoc(): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="${PREVIEW_FONT_CSS}">
<style id="vr-base">${BASE_CSS}</style>
<style id="vr-user"></style>
</head>
<body id="vr-body">${MOCK_BODY}</body>
</html>`;
}
