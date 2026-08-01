/**
 * Curated highlight.js build.
 *
 * `import hljs from 'highlight.js'` pulls the full distribution — 384 language
 * grammars — into the bundle. Report snippets only ever need a handful, so this
 * module builds on `highlight.js/lib/core` and registers an explicit list.
 *
 * Import `hljs` from here, never from 'highlight.js' directly.
 * To support another language, add it to LANGUAGES below.
 */
import type { HLJSApi } from 'highlight.js';
import hljsCore from 'highlight.js/lib/core';

// highlight.js ships no ambient declaration for the 'lib/core' subpath, so the
// default import widens to the module namespace. The runtime value is the same
// HLJSApi the root entry point exposes.
const hljs = hljsCore as unknown as HLJSApi;

import apache from 'highlight.js/lib/languages/apache';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import diff from 'highlight.js/lib/languages/diff';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import http from 'highlight.js/lib/languages/http';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import nginx from 'highlight.js/lib/languages/nginx';
import perl from 'highlight.js/lib/languages/perl';
import php from 'highlight.js/lib/languages/php';
import plaintext from 'highlight.js/lib/languages/plaintext';
import powershell from 'highlight.js/lib/languages/powershell';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

// `xml` also covers HTML/XHTML/SVG; `ini` also covers TOML. Aliases declared by
// each grammar (e.g. sh -> bash, js -> javascript, yml -> yaml) keep working.
const LANGUAGES: Record<string, any> = {
  apache, bash, c, cpp, csharp, diff, dockerfile, go, http, ini, java,
  javascript, json, markdown, nginx, perl, php, plaintext, powershell,
  python, ruby, rust, shell, sql, typescript, xml, yaml,
};

for (const [name, language] of Object.entries(LANGUAGES)) {
  hljs.registerLanguage(name, language);
}

export default hljs;
