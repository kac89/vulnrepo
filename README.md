# VULNRΞPO

VULNRΞPO - Vulnerability Report Generator & Repository - Check online: https://vulnrepo.com/

[![Guide](https://img.youtube.com/vi/D6vmd4WhWFk/0.jpg)](https://www.youtube.com/watch?v=D6vmd4WhWFk)

Environment:
Angular CLI: 9.1.8
Angular: 10

## Features

 - Security
    - Project use browser for encrypt/decrypt (AES) and store data in locally. Full confidentiality of data, end-to-end encryption, by default nothing is sent out. No backend system, only front-end technology, pure JS client.
 - Use custom issues templates!
    - The use of templates greatly speeds up the work for pentester or security auditor. Import CVE or CWE data also possible.
 - Import issues from security scanners
    - Supported import from: Nessus, Burp, OpenVAS. After importing, easily manage and edit vulnerabilities.
 - TXT & HTML & PDF
    - You can download report in TXT, HTML formats!. If you need PDF just 'print as PDF' html report.
 - Attachments
    - You can easly attach any file you want to. Screenshot, movie or scanner output in txt. Automatically doing checksum sha256 of attached file.
 - Changelog
    - All important changes in report will be logged in to changelog and update to the next version of the report.
 - Export Issues
    - You can export issues to popular bugtrackers like Atlassian JIRA or use secure way to share only issues.
 - Share report
    - You can share your report using AES encryption by default.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Lgtm

[![Total alerts](https://img.shields.io/lgtm/alerts/g/kac89/vulnrepo.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/kac89/vulnrepo/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/kac89/vulnrepo.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/kac89/vulnrepo/context:javascript)