<div align="center"><img src="/src/assets/logo/vulnrepo_logo.png" width="300"></div>

# VULNRΞPO - Vulnerability Report Generator & Repository

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![Angular](https://img.shields.io/badge/Angular-22-red.svg)](https://angular.io/)
[![Live App](https://img.shields.io/badge/live-vulnrepo.com-brightgreen)](https://vulnrepo.com/)
[![Docker](https://img.shields.io/badge/docker-kac89%2Fvulnrepo-blue)](https://hub.docker.com/r/kac89/vulnrepo)

A client-side, privacy-first vulnerability report manager for security professionals. All data is encrypted and stored locally in your browser — nothing is sent to any server by default.

**Live app:** https://vulnrepo.com/ | **Dev branch:** https://dev.vulnrepo.com/

**Video walkthrough / Tutorial:**

[![Guide](https://img.youtube.com/vi/cW_kVPtUJbU/0.jpg)](https://www.youtube.com/watch?v=cW_kVPtUJbU)

---

## Table of Contents

- [Features](#features)
- [Security Model](#security-model)
- [Supported Import Sources](#supported-import-sources)
- [Report Export Formats](#report-export-formats)
- [Report History & Version Diff](#report-history--version-diff)
- [Offline & Install](#offline--install)
- [Methodology Tools](#methodology-tools)
- [AI / LLM Integration](#ai--llm-integration)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Development Server](#development-server)
  - [Production Build](#production-build)
  - [Docker](#docker)
- [Project Structure](#project-structure)
- [API Integration](#api-integration)
- [Browser Support](#browser-support)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Client-side encryption** — reports are encrypted in the browser before storage; no backend required
- **Issue templates** — create and reuse custom vulnerability templates; import from CVE, CWE, MITRE ATT&CK, and PCI DSS
- **Scanner imports** — import findings directly from popular security tools (see [Supported Import Sources](#supported-import-sources))
- **Multiple export formats** — TXT, HTML, DOCX; generate PDF via browser print
- **Encrypted HTML export** — share an AES-encrypted, self-contained HTML report
- **File attachments** — attach screenshots, tool output, or any file; SHA-256 checksum is computed automatically
- **Changelog** — all significant report changes are versioned and logged automatically
- **Issue export** — export issues to SARIF 2.1.0, Atlassian Jira, or as a portable encrypted file
- **Report sharing** — share a full encrypted report with collaborators
- **Report profiles** — save reusable report configurations (logo, researcher info, theme, CSS)
- **Template customization** — edit the HTML report template and CSS directly in the app
- **Methodology tools** — built-in checklists for OWASP ASVS 4, PCI DSS 4, and The Bug Hunter's Methodology (TBHM)
- **CVE search** — query the NIST NVD database and pull CVE details into your report
- **Report history** — automatic versioned snapshots of every save, with a version diff and selective restore (see [Report History & Version Diff](#report-history--version-diff))
- **Issue merge** — merge duplicate or related issues
- **Advanced filter** — filter and search issues by severity, status, tags, CVE, CVSS, and more
- **Bug bounty list** — reference list of bug bounty programs
- **AI / LLM integration** — connect a local Ollama model for AI-assisted report writing (see [AI / LLM Integration](#ai--llm-integration))
- **Optional backend** — store encrypted reports on your own server via the REST API (see [API Integration](#api-integration))
- **Offline / installable** — the app shell is precached, so VULNRΞPO runs with no network at all and can be installed as a desktop or mobile app (see [Offline & Install](#offline--install))

---

## Security Model

VULNRΞPO uses **browser-native cryptography exclusively**:

| Property | Value |
|---|---|
| Key derivation | PBKDF2-SHA-256, 600,000 iterations |
| Encryption | AES-256-GCM (authenticated encryption) |
| Salt | 16 bytes, random per encryption |
| IV | 12 bytes, random per encryption |
| Encrypted data storage | Browser IndexedDB (local machine only by default) |
| Decryption key storage | In-memory only — never written to sessionStorage, localStorage, or any persistent medium |
| Network | No data leaves the browser unless you configure the optional API backend |

### Key lifetime and auto-lock

Decryption passwords are held in a short-lived in-memory vault (`KeyVaultService`) that is cleared automatically when any of the following occur:

- **Tab hidden** — the browser tab loses focus or is switched away from (`visibilitychange` event)
- **Tab closed / page reload** — `pagehide` and `beforeunload` events
- **Inactivity** — 15 minutes of no keyboard, mouse, or touch input

After the vault is cleared, re-opening a report prompts for the password again. No key material is ever written to `sessionStorage`, `localStorage`, cookies, or any other persistent browser storage.

Reports encrypted with older versions of the app (legacy CryptoJS AES format) are automatically detected and decrypted for backward compatibility.

> **Important:** There is no server-side key recovery. If you lose your security key, the report data cannot be recovered.

---

## Supported Import Sources

| Tool | Format |
|---|---|
| VULNRΞPO Encrypted | `.VULNR` |
| VULNRΞPO Decrypted Issues | `.JSON` |
| Burp Suite | `.XML` |
| Bugcrowd | `.CSV` |
| Nmap | `.XML` |
| OpenVAS 9 | `.XML` |
| Tenable Nessus | `.NESSUS`, `.CSV` |
| Trivy | `.JSON` |
| Atlassian Jira | `.XML` |
| NPM Audit | `.JSON` |
| Semgrep | `.JSON` |
| PHP Composer Audit | `.JSON` |
| WIZ Issues | `.CSV` |
| OWASP ZAP | `.JSON` |
| BlackDuck Code Sight | `.JSON` |
| SARIF 2.1.0 (CodeQL, Semgrep, Trivy, ESLint, Bandit, Checkov, …) | `.SARIF`, `.JSON` |

---

## Report Export Formats

| Format | Notes |
|---|---|
| HTML | Fully self-contained; customizable template and CSS |
| Encrypted HTML | AES-encrypted, self-contained HTML; share safely via email or file transfer |
| DOCX | Microsoft Word compatible |
| TXT | Plain text |
| PDF | Use browser Print to PDF (Ctrl+P) on the HTML export; or use the [LaTeX generator](https://github.com/kac89/vulnrepo-json-to-latex-pdf) for full customization |

---

## Report History & Version Diff

Every save writes an encrypted snapshot to local history. Open **History** from the report header (next to the version badge) to work with them.

**Compare two versions.** Pick a snapshot as side **A** (the older side) and press **Compare**. Leave **B** unset to compare against the report currently on screen, unsaved edits included — the usual "what changed since the draft I sent the client?" question. Picking a second snapshot as **B** compares two points in the past. If you pick them the wrong way round, the sides are swapped for you so additions always read as additions.

The diff covers:

| Section | What is compared |
|---|---|
| Issues | added / removed / changed, with per-field detail: severity, status, CVSS, CVE, date, description, PoC, references, tags, attachments, bounty |
| Assets | added / removed / changed, matched on asset id (name + target for older reports) |
| Report fields | scope, executive summary, test window, researcher details, and every report-template setting |

Prose fields (description, PoC, scope, summary, HTML template) get a line-by-line diff with long unchanged runs collapsed. Attachments are summarised as name plus a checksum stub, so a file replaced under the same name still shows as a change without the base64 payload being rendered. Issues are matched on their normalised title, since report issues carry no stable identifier; two findings sharing a title are paired off in document order.

**Restore selectively.** Tick any row that exists on the older side — a deleted finding, a changed field, a removed asset — and press **Restore selected**, or use the per-row button. The pieces are written back into the open report as *unsaved changes*, logged to the changelog, and nothing is persisted until you save. **Discard** undoes the whole thing.

**Whole-report rollback** is still available under a row's **⋯ → Roll whole report back**, but it is now behind an explicit confirmation: it deletes the report and re-creates it from the snapshot, so every edit made since is lost with no undo. Prefer the selective restore above.

> Snapshots are decrypted with the report's current security key. A snapshot taken before a key change cannot be read, and the dialog says so rather than reporting an empty diff.

---

## Offline & Install

VULNRΞPO has always *run* without a network — reports live in IndexedDB and all crypto is browser-native — but it used to need connectivity to *load*. A service worker now precaches the app shell, so the app opens with no network at all: air-gapped labs, client jumpboxes with no egress, a plane, a basement.

- **Install it.** Where the browser supports it, **⋯ → Install app** installs VULNRΞPO as a standalone desktop or mobile app with its own window and launcher icon. The manifest also exposes shortcuts to *New report*, *My reports* and *Import report*.
- **Offline indicator.** When the network drops, an `Offline` chip appears in the toolbar. Nothing in the app stops working; only the optional API backend, NVD CVE search and Ollama need connectivity.
- **Controlled updates.** A new build is downloaded in the background and then *announced*, never applied on its own — an unattended reload would discard unsaved report edits. Press **Update ready** in the toolbar (or **⋯ → Update & reload**) when you are ready; it refuses while a report has unsaved changes. **About** shows the build hash and a manual *check for updates*.

**What is and is not cached.** `ngsw-config.json` declares three asset groups and deliberately **no `dataGroups`**:

| Group | Mode | Contents |
|---|---|---|
| `app` | prefetch | app shell — `index.html`, JS bundles, stylesheet, icons, manifest |
| `reference-data` | prefetch | everything the app fetches at runtime: the CWE / MITRE ATT&CK / OWASP / PCI DSS reference JSON, the HTML report template, `bootstrap.min.css`, the report CSS gallery and the inline web fonts |
| `assets` | lazy | images, logos and vendor icons — cached on first use |

`reference-data` is prefetched because without it the checklists, the issue-template library and **HTML/DOCX export** would all fail offline, which would make "offline" a false promise. It sets `ignoreSearch`, since the report template is requested with a cache-busting query string.

Report ciphertext stays in IndexedDB exactly as before. API responses, NVD CVE lookups and Ollama traffic are never written to the cache. A side benefit for a browser-based crypto tool: the code that decrypts your reports is pinned to one verified build instead of being re-fetched on every load.

The service worker is enabled in production builds only — `ng serve` registers nothing, so development is unaffected.

> **Hosting note:** serve `ngsw-worker.js` and `ngsw.json` with `Cache-Control: no-cache`, otherwise clients detect new builds only after the CDN's TTL expires. A secure origin (HTTPS, or `localhost`) is required; the app still works over plain HTTP, just without offline support.

---

## Methodology Tools

The following interactive checklists are available from the sidebar:

- **OWASP ASVS 4** — Application Security Verification Standard
- **PCI DSS 4** — Payment Card Industry Data Security Standard
- **TBHM** — The Bug Hunter's Methodology

Use them during an assessment to ensure nothing is missed before finalizing the report.

---

## AI / LLM Integration

VULNRΞPO integrates with [Ollama](https://ollama.com) to provide AI-assisted report writing using a locally hosted model. No data is sent to any cloud service.

**Setup:**

1. Install Ollama from [ollama.com](https://ollama.com).
2. Pull and run a model:
   ```bash
   ollama run llama3.2:latest
   ```
3. Allow the VULNRΞPO origin to access Ollama. If using the hosted app, set the environment variable before starting Ollama:
   ```bash
   OLLAMA_ORIGINS=https://vulnrepo.com ollama serve
   ```
4. In VULNRΞPO, open **AI Settings** (robot icon in the report toolbar), enter your Ollama URL (`http://localhost:11434` by default), select a model, and save.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [Angular CLI](https://angular.io/cli) 22:
  ```bash
  npm install -g @angular/cli
  ```

### Development Server

```bash
# Install dependencies
npm install

# Start the dev server
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The application reloads automatically when source files change.

### Production Build

```bash
ng build -c production
```

Build artifacts are written to `dist/vulnrepo-app/`. Deploy the contents of that directory to any static web host or CDN.

### Docker

The official Docker image is available on Docker Hub:

```bash
docker pull kac89/vulnrepo
docker run -p 8080:80 kac89/vulnrepo
```

See the image page for full documentation: https://hub.docker.com/r/kac89/vulnrepo

---

## Project Structure

```
vulnrepo-master/
├── src/
│   ├── app/
│   │   ├── report/                   # Core report editor component
│   │   ├── myreports/                # Report list / dashboard
│   │   ├── newreport/                # Create report wizard
│   │   ├── import-report/            # Import encrypted report file
│   │   ├── templates-list/           # Issue template manager
│   │   ├── settings/                 # App settings (profiles, API vault)
│   │   ├── asvs/                     # OWASP ASVS 4 checklist
│   │   ├── pcidss4/                  # PCI DSS 4 checklist
│   │   ├── tbhm/                     # Bug Hunter's Methodology checklist
│   │   ├── cve-search/               # NVD CVE lookup
│   │   ├── bb-list/                  # Bug bounty program list
│   │   ├── faq/                      # In-app FAQ page
│   │   ├── crypto-utils.service.ts   # PBKDF2 + AES-GCM encryption service
│   │   ├── indexeddb.service.ts      # Local storage (IndexedDB) service
│   │   ├── api.service.ts            # Optional backend API service
│   │   ├── ollama-service.service.ts # Ollama LLM integration service
│   │   ├── report-diff.service.ts    # Version diff engine (history compare / restore)
│   │   ├── pwa.service.ts            # Offline-ready, install and update state
│   │   └── dialog-*/                 # Modal dialogs (add issue, import, export, …)
│   ├── assets/                       # Static assets, vendor logos
│   ├── site.webmanifest              # PWA manifest (install, icons, shortcuts)
│   └── environments/                 # Environment configurations
├── tests/e2e/                        # Playwright end-to-end specs
├── dist/                             # Production build output
├── ngsw-config.json                  # Service worker precache config (app shell only)
├── API-INTEGRATION.md                # Backend API reference
├── SECURITY.md                       # Vulnerability reporting policy
├── angular.json
└── package.json
```

---

## API Integration

VULNRΞPO can optionally store encrypted reports on your own backend server. The API is a simple HTTP interface with a custom header-based authentication scheme.

See **[API-INTEGRATION.md](./API-INTEGRATION.md)** for the full API reference.

An example server implementation is available at: https://github.com/kac89/vulnrepo-server

---

## Browser Support

VULNRΞPO requires a modern browser with IndexedDB and Web Crypto API support. It does **not** work in private/incognito browsing mode (IndexedDB is blocked by most browsers in that mode).

Offline support and installation additionally need service worker support on a secure origin; where that is unavailable the app behaves exactly as before, minus offline loading. Installation prompts are Chromium-only — Firefox and desktop Safari can still use the app offline once the shell is cached, but will not offer to install it.

Tested and supported:

- Google Chrome (latest)
- Mozilla Firefox (latest)
- Microsoft Edge (Chromium, latest)
- Safari on iOS (latest)
- Chrome on Android (latest)

---

## Contributing

1. Fork the repository and create a feature branch from `dev`.
2. Make your changes and ensure the app builds without errors (`ng build`).
3. Submit a pull request against the `dev` branch.

To report a security vulnerability, see [SECURITY.md](./SECURITY.md).

---

## License

VULNRΞPO is released under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0).
