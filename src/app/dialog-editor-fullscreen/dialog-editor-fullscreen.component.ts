import { Component, Inject, OnInit, ElementRef, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UntypedFormControl } from '@angular/forms';

import DOMPurify from 'dompurify';
import { markedHighlight } from "marked-highlight";
import hljs from '../syntax-highlight';
import { Marked } from "marked";

export interface Table {
  type: 'table';
  raw: string;
  align: Array<'center' | 'left' | 'right' | null>;
  header: TableCell[];
  rows: TableCell[][];
}

/** One row of the formatting reference panel. */
export interface FormatHelpEntry {
  /** Markdown as the user would type it. */
  syntax: string;
  /** What it produces. */
  result: string;
}

export interface FormatHelpSection {
  title: string;
  entries: FormatHelpEntry[];
}

export interface TableRow {
  text: string;
}

export interface TableCell {
  text: string;
  header: boolean;
  align: 'center' | 'left' | 'right' | null;
}

@Component({
  selector: 'app-dialog-editor-fullscreen',
  standalone: false,
  //imports: [],
  templateUrl: './dialog-editor-fullscreen.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dialog-editor-fullscreen.component.scss'
})
export class DialogEditorFullscreenComponent implements OnInit {


  previewfield = new UntypedFormControl();
  showprev = false;
  showHelp = false;
  selectedtextarea: any;
  selectedtextarea_start: any;
  selectedtextarea_end: any;

  /**
   * Languages the fenced-code highlighter actually knows about. Read from the
   * curated hljs build (see src/app/syntax-highlight.ts) rather than hardcoded,
   * so the panel can't drift out of sync when languages are added or removed.
   */
  readonly highlightLanguages: string[] = hljs.listLanguages().sort();

  /**
   * Formatting reference shown in the help drawer. Kept here rather than in the
   * template so the markup stays readable; every entry reflects what this
   * editor's renderer really does (see poc_preview_funct below).
   */
  readonly formatHelp: FormatHelpSection[] = [
    {
      title: 'Text',
      entries: [
        { syntax: '**bold**',            result: 'Bold' },
        { syntax: '_italic_',            result: 'Italic' },
        { syntax: '~~strikethrough~~',   result: 'Struck through' },
        { syntax: '`inline code`',       result: 'Monospaced inline code' },
      ],
    },
    {
      title: 'Structure',
      entries: [
        { syntax: '# Heading 1',         result: 'Largest heading (# to ###### for levels 1-6)' },
        { syntax: '- item',              result: 'Bulleted list' },
        { syntax: '1. item',             result: 'Numbered list' },
        { syntax: '> quoted text',       result: 'Block quote' },
        { syntax: '---',                 result: 'Horizontal rule' },
      ],
    },
    {
      title: 'Blocks',
      entries: [
        {
          syntax: '```bash\nnmap -sV 10.0.0.1\n```',
          result: 'Fenced code block. Add a language after the opening ``` for syntax highlighting and line numbers.',
        },
        {
          syntax: 'IP | hostname | role\n--- | --- | ---\n10.0.0.1 | web01 | PROD',
          result: 'Table. The second row of dashes separates the header from the body.',
        },
      ],
    },
    {
      title: 'Links',
      entries: [
        { syntax: '[link text](https://example.com)', result: 'Link — always opens in a new tab.' },
        { syntax: 'https://example.com',              result: 'Bare URLs are turned into links automatically.' },
      ],
    },
  ];

  /**
   * Behaviours specific to this editor that a generic Markdown cheat sheet
   * would get wrong. Each of these was verified against the renderer below.
   */
  readonly editorNotes: string[] = [
    'A single Enter starts a new line — you do not need two.',
    'Blank lines between paragraphs are preserved in the report.',
    'Raw HTML works, but is sanitized — scripts, event handlers and unsafe attributes are removed.',
    'Images are disabled: an image tag renders as its URL. Attach screenshots to the issue instead.',
    'javascript:, vbscript: and data: links render as plain text, never as links.',
  ];

  @ViewChild('textareaEl', { static: false }) textareaElement: ElementRef<HTMLTextAreaElement>;
  @ViewChild('previewContentEl', { static: false }) previewContentEl: ElementRef<HTMLDivElement>;
  // @ts-ignore
  constructor(public dialogRef: MatDialogRef<DialogEditorFullscreenComponent>,@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {

    if(this.data) {
      this.poc_preview_funct(this.data);
    }
  
  }

  saniteizeme(code) {
      return DOMPurify.sanitize(code);
  }

  cancel(): void {
    this.dialogRef.close(this.data);
  }

  poc_preview_funct(value): void {

    const marked = new Marked(
      markedHighlight({
      emptyLangClass: 'hljs',
        langPrefix: 'hljs language-',
        highlight(code, lang, info) {
          const language = hljs.getLanguage(lang) ? lang : 'plaintext';
          return hljs.highlight(code, { language }).value;
        }
      })
    );

    const escapeHtml = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // marked-highlight has already run hljs over the code token and left the
    // result in token.text (with token.escaped = true). That string is HTML, so
    // it must not be escaped again — doing so renders the markup as visible
    // text ("<span class="hljs-meta">&lt;?php</span>").
    //
    // It also can't simply be split on "\n": hljs emits spans that straddle
    // line breaks (block comments, multi-line strings), which would leave every
    // table row with unbalanced tags. Close the open spans at the end of each
    // line and re-open them at the start of the next.
    const splitHighlightedLines = (html: string): string[] => {
      const lines: string[] = [];
      const open: string[] = [];
      let current = '';

      const tokenRe = /(<\/?[a-zA-Z][^>]*>)|([^<]+)/g;
      let match: RegExpExecArray | null;

      while ((match = tokenRe.exec(html)) !== null) {
        const [, tag, text] = match;

        if (tag !== undefined) {
          if (tag.startsWith('</')) {
            open.pop();
          } else if (!tag.endsWith('/>')) {
            open.push(tag);
          }
          current += tag;
          continue;
        }

        const parts = text.split('\n');
        parts.forEach((part, i) => {
          if (i > 0) {
            lines.push(current + '</span>'.repeat(open.length));
            current = open.join('');
          }
          current += part;
        });
      }

      lines.push(current + '</span>'.repeat(open.length));
      return lines;
    };

    const applyLineNumbers = (code: string, alreadyHighlighted: boolean) => {
        // hljs escapes the code it emits, so the highlighted branch is still
        // safe; the result is passed through DOMPurify either way.
        const lines = alreadyHighlighted
          ? splitHighlightedLines(code.trim())
          : code.trim().split('\n').map(escapeHtml);

        const rows = lines.map((line, idx) => {
          const lineNumber = idx + 1;

          let html = '<tr>';
    	    html += `<td class="line-number">${lineNumber}</td>`;
          html += `<td class="code-line">${line}</td>`;
      	    html += '</tr>';
      	    return html;
        });

        return `<table><tbody>${rows.join('')}</tbody></table>`;
      };


    // add Markdown rendering
    const renderer = new marked.Renderer();
    renderer.code = function (token) {
      const table = applyLineNumbers(token.text, !!token.escaped);
      return `<pre class="hljs"><code>` + DOMPurify.sanitize(table) + `</code></pre>`;
    };

    renderer.blockquote = function (token) {
      return `<blockquote><p>` + DOMPurify.sanitize(token.text) + `</p></blockquote>`;
    };

    renderer.image = function (token) {
      //return `<img src="` + DOMPurify.sanitize(token.href) + `" alt="` + DOMPurify.sanitize(token.text) + `" title="` + DOMPurify.sanitize(token.title) + `">`;
      //disable image parse
      return DOMPurify.sanitize(token.href);
    };

    renderer.link = function( token: any ) {

    try {
      var prot = decodeURIComponent(unescape(token.href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return token.text;
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
      return token.text;
    }

      return '<a target="_blank" class="active-link" rel="nofollow" href="'+ DOMPurify.sanitize(token.href) +'" title="' + DOMPurify.sanitize(token.title) + '">' + DOMPurify.sanitize(token.text) + '</a>';
    }

    renderer.table = function(token: any) {

      const header = token.header.map((res:any) => {
        return "<th class='titlepad'>"+DOMPurify.sanitize(res.text)+"</th>";
      }).join("");

      const body = token.rows.map((res:any) => {
        return "<tr>" + res.map((res2:any) => {
          return "<td class='tableb'>"+DOMPurify.sanitize(res2.text)+"</td>";
        }).join("") + "</tr>";
      }).join("");

        return "<div class='table-responsive'><table class='tablemd'><thead class='tablemd'><tr>" + header + "</tr></thead><tbody>" + body + "</tr></tbody></table></div>";      
    }

    // Preserve multiple blank lines: each extra \n beyond 2 becomes a &nbsp; paragraph
    const preprocessed = value.replace(/\n{3,}/g, (match: string) => {
      const extra = match.length - 2;
      return '\n\n' + Array(extra).fill('&nbsp;').join('\n') + '\n\n';
    });

    this.previewfield.setValue(marked.parse(preprocessed, { renderer: renderer, breaks: true }));
  }

  onChange(event) {
    this.poc_preview_funct(event);
  }

  private _syncingScroll = false;

  onEditorScroll(event: Event): void {
    if (this._syncingScroll) return;
    const editor = event.target as HTMLTextAreaElement;
    const preview = this.previewContentEl?.nativeElement;
    if (!preview) return;
    const scrollableHeight = editor.scrollHeight - editor.clientHeight;
    if (scrollableHeight <= 0) return;
    const ratio = editor.scrollTop / scrollableHeight;
    this._syncingScroll = true;
    preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight);
    this._syncingScroll = false;
  }

  onPreviewScroll(event: Event): void {
    if (this._syncingScroll) return;
    const preview = event.target as HTMLDivElement;
    const editor = this.textareaElement?.nativeElement;
    if (!editor) return;
    const scrollableHeight = preview.scrollHeight - preview.clientHeight;
    if (scrollableHeight <= 0) return;
    const ratio = preview.scrollTop / scrollableHeight;
    this._syncingScroll = true;
    editor.scrollTop = ratio * (editor.scrollHeight - editor.clientHeight);
    this._syncingScroll = false;
  }

  onclick(event) {
    const start = event.target.selectionStart;
    const end = event.target.selectionEnd;
    this.selectedtextarea_start = start;
    this.selectedtextarea_end = end;
 }

  select(event) {
    const start = event.target.selectionStart;
    const end = event.target.selectionEnd;

    this.selectedtextarea = event.target.value.substr(start, end - start);
    this.selectedtextarea_start = start;
    this.selectedtextarea_end = end;
    
 }

  parseBold(data) {
    if(this.selectedtextarea_start === this.selectedtextarea_end) {
      this.selectedtextarea = 'bold';
    }
    this.data = data.slice(0, this.selectedtextarea_start) + '**' + this.selectedtextarea + '**' + data.slice(this.selectedtextarea_end);

    const setcursor = this.selectedtextarea_end + 4;
    setTimeout(() => {
      this.textareaElement.nativeElement.focus();
      this.textareaElement.nativeElement.setSelectionRange(setcursor,setcursor);
    });

    this.poc_preview_funct(this.data);
  }

  parseItalic(data) {
    if(this.selectedtextarea_start === this.selectedtextarea_end) {
      this.selectedtextarea = 'emphasized text';
    }
    this.data = data.slice(0, this.selectedtextarea_start) + ' _' + this.selectedtextarea + '_ ' + data.slice(this.selectedtextarea_end);

    const setcursor = this.selectedtextarea_end + 4;
    setTimeout(() => {
      this.textareaElement.nativeElement.focus();
      this.textareaElement.nativeElement.setSelectionRange(setcursor,setcursor);
    });

    this.poc_preview_funct(this.data);
  }

  parseHeading(data) {
    if(this.selectedtextarea_start === this.selectedtextarea_end) {
      this.selectedtextarea = 'heading text';
    }
    this.data = data.slice(0, this.selectedtextarea_start) + '\n# ' + this.selectedtextarea + '' + data.slice(this.selectedtextarea_end);

    const setcursor = this.selectedtextarea_end + 4;
    setTimeout(() => {
      this.textareaElement.nativeElement.focus();
      this.textareaElement.nativeElement.setSelectionRange(setcursor,setcursor);
    });

    this.poc_preview_funct(this.data);
  }

  parseStrikethrough(data) {
    if(this.selectedtextarea_start === this.selectedtextarea_end) {
      this.selectedtextarea = 'strikethrough';
    }
    this.data = data.slice(0, this.selectedtextarea_start) + '~~' + this.selectedtextarea + '~~' + data.slice(this.selectedtextarea_end);

    const setcursor = this.selectedtextarea_end + 4;
    setTimeout(() => {
      this.textareaElement.nativeElement.focus();
      this.textareaElement.nativeElement.setSelectionRange(setcursor,setcursor);
    });

    this.poc_preview_funct(this.data);
  }

  parseLink(data) {
    if(this.selectedtextarea_start === this.selectedtextarea_end) {
      this.selectedtextarea = 'enter link description here';
    }
    this.data = data.slice(0, this.selectedtextarea_start) + '[' + this.selectedtextarea + '](https://vulnrepo.com/)' + data.slice(this.selectedtextarea_end);

    const setcursor = this.selectedtextarea_end + 24;
    setTimeout(() => {
      this.textareaElement.nativeElement.focus();
      this.textareaElement.nativeElement.setSelectionRange(setcursor,setcursor);
    });

    this.poc_preview_funct(this.data);
  }

  parseList(data) {
    if(this.selectedtextarea_start === this.selectedtextarea_end) {
      this.selectedtextarea = 'list text';
    }

    const lists = this.selectedtextarea.split('\n');
    if(lists.length > 1) {
      this.selectedtextarea = lists.join('\n- ');
    }

    this.data = data.slice(0, this.selectedtextarea_start) + '\n- ' + this.selectedtextarea + '\n' + data.slice(this.selectedtextarea_end);

    const setcursor = this.selectedtextarea_end + 6;
    setTimeout(() => {
      this.textareaElement.nativeElement.focus();
      this.textareaElement.nativeElement.setSelectionRange(setcursor,setcursor);
    });

    this.poc_preview_funct(this.data);
  }

  parseCode(data) {
    if(this.selectedtextarea_start === this.selectedtextarea_end) {
      this.selectedtextarea = 'code text';
    }
    this.data = data.slice(0, this.selectedtextarea_start) + '\n```\n' + this.selectedtextarea + '\n```\n' + data.slice(this.selectedtextarea_end);

    const setcursor = this.selectedtextarea_end + 14;
    setTimeout(() => {
      this.textareaElement.nativeElement.focus();
      this.textareaElement.nativeElement.setSelectionRange(setcursor,setcursor);
    });

    this.poc_preview_funct(this.data);
  }

  parseQuote(data) {
    if(this.selectedtextarea_start === this.selectedtextarea_end) {
      this.selectedtextarea = 'quote';
    }
    this.data = data.slice(0, this.selectedtextarea_start) + '\n> ' + this.selectedtextarea + '\n' + data.slice(this.selectedtextarea_end);

    const setcursor = this.selectedtextarea_end + 6;
    setTimeout(() => {
      this.textareaElement.nativeElement.focus();
      this.textareaElement.nativeElement.setSelectionRange(setcursor,setcursor);
    });

    this.poc_preview_funct(this.data);
  }

  parseTable(data) {

    this.selectedtextarea = `IP   | hostname | role | comments\n------|--------------|-------|---------------\n127.0.0.1 | localhost.localdomain | PROD | sql inj here`;

    this.data = data.slice(0, this.selectedtextarea_start) + '\n' + this.selectedtextarea + '\n' + data.slice(this.selectedtextarea_end);

    const setcursor = this.selectedtextarea_end + 4;
    setTimeout(() => {
      this.textareaElement.nativeElement.focus();
      this.textareaElement.nativeElement.setSelectionRange(setcursor,setcursor);
    });

    this.poc_preview_funct(this.data);
  }
}
