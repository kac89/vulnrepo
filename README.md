<div align="center"><img src="/src/assets/logo/vulnrepo_logo.png" width="300"></div>

# VULNRΞPO - Vulnerability Report Generator & Repository

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![Angular](https://img.shields.io/badge/Angular-21-red.svg)](https://angular.io/)
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
- **Issue export** — export issues to Atlassian Jira or as a portable encrypted file
- **Report sharing** — share a full encrypted report with collaborators
- **Report profiles** — save reusable report configurations (logo, researcher info, theme, CSS)
- **Template customization** — edit the HTML report template and CSS directly in the app
- **Methodology tools** — built-in checklists for OWASP ASVS 4, PCI DSS 4, and The Bug Hunter's Methodology (TBHM)
- **CVE search** — query the NIST NVD database and pull CVE details into your report
- **Report history** — automatic versioned snapshots of every save
- **Issue merge** — merge duplicate or related issues
- **Advanced filter** — filter and search issues by severity, status, tags, CVE, CVSS, and more
- **Bug bounty list** — reference list of bug bounty programs
- **AI / LLM integration** — connect a local Ollama model for AI-assisted report writing (see [AI / LLM Integration](#ai--llm-integration))
- **Optional backend** — store encrypted reports on your own server via the REST API (see [API Integration](#api-integration))

---

## Security Model

VULNRΞPO uses **browser-native cryptography exclusively**:

| Property | Value |
|---|---|
| Key derivation | PBKDF2-SHA-256, 600,000 iterations |
| Encryption | AES-256-GCM (authenticated encryption) |
| Salt | 16 bytes, random per encryption |
| IV | 12 bytes, random per encryption |
| Storage | Browser IndexedDB (local machine only by default) |
| Network | No data leaves the browser unless you configure the optional API backend |

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
- [Angular CLI](https://angular.io/cli) 21:
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
│   │   └── dialog-*/                 # Modal dialogs (add issue, import, export, …)
│   ├── assets/                       # Static assets, vendor logos
│   └── environments/                 # Environment configurations
├── dist/                             # Production build output
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
