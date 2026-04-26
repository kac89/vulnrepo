# Security Policy

## Supported Versions

Security fixes are applied to the latest version only. There are no long-term support branches.

| Version | Supported |
|---|---|
| Latest (main/dev) | Yes |
| Older releases | No |

## Reporting a Vulnerability

If you discover a security vulnerability in VULNRΞPO, please **do not open a public GitHub issue**.

Contact us privately first so we can assess and prepare a fix before public disclosure:

**Email:** [security@vulnrepo.com](mailto:security@vulnrepo.com)

Please include:

- A clear description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- The browser, OS, and app version where the issue was observed
- Any suggested mitigations, if applicable

We aim to acknowledge reports within 48 hours and will work with you on a coordinated disclosure timeline.

## Security Architecture

VULNRΞPO is a fully client-side application. The key security properties are:

- All report data is encrypted in the browser before being stored or transmitted
- Encryption uses **PBKDF2-SHA-256** (600,000 iterations) for key derivation and **AES-256-GCM** for authenticated encryption
- No plaintext report data is sent to any server by default
- The optional backend API only ever stores and retrieves ciphertext; decryption always happens in the browser
- API credentials are stored encrypted in the browser's IndexedDB (the "API VAULT")

## Known Limitations

- Reports encrypted with a forgotten security key **cannot be recovered** — there is no server-side key escrow
- The application **does not work in private/incognito browsing mode** because most browsers block IndexedDB in that context
- The Ollama LLM integration communicates with a locally hosted model; no data is sent to external AI services by default
