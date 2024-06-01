import { Component, Inject, OnInit, ElementRef, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UntypedFormControl } from '@angular/forms';
import { marked } from 'marked'
import * as DOMPurify from 'dompurify';

@Component({
  selector: 'app-dialog-editor-fullscreen',
  standalone: false,
  //imports: [],
  templateUrl: './dialog-editor-fullscreen.component.html',
  styleUrl: './dialog-editor-fullscreen.component.scss'
})
export class DialogEditorFullscreenComponent implements OnInit {


  previewfield = new UntypedFormControl();
  showprev = false;
  selectedtextarea: any;
  selectedtextarea_start: any;
  selectedtextarea_end: any;

  @ViewChild('textareaEl', { static: false}) textareaElement: ElementRef<HTMLTextAreaElement>;

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

    // add Markdown rendering
    const renderer = new marked.Renderer();
    renderer.code = function (code, infostring, escaped) {
      return `<code>` + DOMPurify.sanitize(code) + `</code>`;
    };

    renderer.blockquote = function (quote) {
      return `<blockquote>` + DOMPurify.sanitize(quote) + `</blockquote>`;
    };

    renderer.link = function( href, title, text ) {

    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return text;
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
      return text;
    }

      return '<a target="_blank" class="active-link" rel="nofollow" href="'+ DOMPurify.sanitize(href) +'" title="' + DOMPurify.sanitize(title) + '">' + DOMPurify.sanitize(text) + '</a>';
    }

    renderer.table = function(header, body) {
      return "<div class='table-responsive'>"
      + "<table class='tablemd'>"
          + "<thead class='tablemd'>"
          + header
          + "</thead>"
          + "<tbody>"
          + body
          + "</tbody>"
      + "</table>"
  + "</div>";
    }


    this.previewfield.setValue(marked.parse(value, { renderer: renderer }));
  }

  onChange(event) {
    this.poc_preview_funct(event);
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
