import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UntypedFormControl } from '@angular/forms';
import { CurrentdateService } from '../currentdate.service';
import {OllamaServiceService} from '../ollama-service.service';
import { markedHighlight } from "marked-highlight";
import hljs from 'highlight.js';
import { Marked } from "marked";
import DOMPurify from 'dompurify';
import { IndexeddbService } from '../indexeddb.service';
import { SessionstorageserviceService } from "../sessionstorageservice.service"
import { Router } from '@angular/router';

@Component({
  selector: 'app-dialog-ollama',
  standalone: false,
  //imports: [],
  templateUrl: './dialog-ollama.component.html',
  styleUrls: ['./dialog-ollama.component.scss']
})
export class DialogOllamaComponent implements OnInit {

  chatmsg = [];
  
  questioninput = new UntypedFormControl();
  aiselectedValue: string;
  ai_tags = [];
  models:any;
  ollamaurl = "http://localhost:11434";

  constructor(public dialogRef: MatDialogRef<DialogOllamaComponent>, @Inject(MAT_DIALOG_DATA) public data: any,
              private currentdateService: CurrentdateService, private ollamaService: OllamaServiceService,
              private indexeddbService: IndexeddbService, private sessionsub: SessionstorageserviceService,
              public router: Router,) {

  }


  ngOnInit() {

    this.indexeddbService.getkeybyAiintegration().then(ret => {
      
      if(ret[0]) {
        this.models = ret[0];

        this.aiselectedValue = this.models.model;
        this.ollamaurl = this.models.ollama_url;
        
      } else {

        this.router.navigate(['/settings']);
        this.dialogRef.close();
      }
     });

     this.ollamaService.checktags(this.ollamaurl).then(resp => {
      if (resp) {
       this.ai_tags = resp.models;
      }
    });

    const localchat = this.sessionsub.getSessionStorageItem('VULNREPO-OLLAMA-CHAT');

    if (localchat) {
      this.chatmsg = JSON.parse(localchat);
    }
    

  }

  sendmsg() {

    if(this.questioninput.value !== null && this.questioninput.value !== '') {

      this.chatmsg.push({"question": this.questioninput.value, "response": "", "date": String(this.currentdateService.getcurrentDate()), "model": this.aiselectedValue});

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
      const renderer = new marked.Renderer();
  


      renderer.code = function (token) {
        return `<pre class="hljs"><code>` + DOMPurify.sanitize(token.text) + `</code></pre>`;
        };
  
        renderer.blockquote = function (token) {
              return `<blockquote><p>` + DOMPurify.sanitize(token.text) + `</p></blockquote>`;
          };
  
      let temps = "";
  
      this.updatemsg('user', this.questioninput.value);
      this.ollamaService.chatStream(this.ollamaurl, this.questioninput.value, this.aiselectedValue).subscribe({
        next: (text) => {
          this.chatmsg[this.chatmsg.length-1].response += text;
          temps += text;
          this.questioninput.setValue('');
  
          if(text.includes(".\n")||text.includes(". \n")){
            this.chatmsg[this.chatmsg.length-1].response = marked.parse(this.chatmsg[this.chatmsg.length-1].response, { renderer: renderer });
          }
  
          //scroll bottom
          const element = document.getElementById('chat');
          element.scrollTop = element.scrollHeight;
          
        },
        complete: () => {
          console.log('AI end chat');

          if(temps.includes('<think>')) {
            temps = temps.replaceAll(/<think>/g, "<details class='think'><summary>Think details</summary>").replaceAll(/<\/think>/gi, "</details><br>");
          }

          this.chatmsg[this.chatmsg.length-1].response = marked.parse(temps, { renderer: renderer })
  
          this.sessionsub.setSessionStorageItem('VULNREPO-OLLAMA-CHAT', JSON.stringify(this.chatmsg));
  
          this.updatemsg('assistant', temps);
  
        },
        error: () => {
    
        }
      });

    } else {
      this.questioninput.setErrors({ 'notempty': true });
    }


  }


  updatemsg(role, msg){
    const localchat = this.sessionsub.getSessionStorageItem('VULNREPO-OLLAMA-CHAT-MSG-H');
    let tarr = [];
    if (localchat) {
      tarr = JSON.parse(localchat);
    }

    tarr.push({"role": role, "content": msg});

    this.sessionsub.setSessionStorageItem('VULNREPO-OLLAMA-CHAT-MSG-H', JSON.stringify(tarr));
  }

  closedialog(): void {
    this.dialogRef.close();
  }

  saniteizeme(code) {
    return DOMPurify.sanitize(code);
}

clearmsg() {
  this.chatmsg = [];
  this.sessionsub.removeSessionStorageItem('VULNREPO-OLLAMA-CHAT');
  this.sessionsub.removeSessionStorageItem('VULNREPO-OLLAMA-CHAT-MSG-H');
}

selectcmodel(event){

  if(event.value) {
    this.indexeddbService.updateAiintegration({"model":event.value, "ollama_url":this.ollamaurl}, 0).then(ret => { });

    this.aiselectedValue = event.value;


  }

}

}
