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
import {DialogOllamaSettingsComponent} from '../dialog-ollama-settings/dialog-ollama-settings.component';

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
  aiconnected = false;
  ollamaurl = "http://localhost:11434";
  temperature = 0.7;
  attachedIMG = [];
  attachedIMG_b64 = [];
  attachedFILES = [];
  defaultprompt = "You are a helpful assistant.";

  constructor(public dialogRef: MatDialogRef<DialogOllamaComponent>, @Inject(MAT_DIALOG_DATA) public data: any,
              private currentdateService: CurrentdateService, private ollamaService: OllamaServiceService,
              private indexeddbService: IndexeddbService, private sessionsub: SessionstorageserviceService,
              public router: Router,public dialog: MatDialog) {

  }


  ngOnInit() {

    this.indexeddbService.getkeybyAiintegration().then(ret => {
      
      if(ret[0]) {
        this.models = ret[0];

        this.aiselectedValue = this.models.model;
        this.ollamaurl = this.models.ollama_url;
        this.temperature = this.models.temperature;
        this.defaultprompt = this.models.defaultprompt;
        
      } else {

        this.router.navigate(['/settings']);
        this.dialogRef.close();
      }
     });

     this.ollamaService.checktags(this.ollamaurl).then(resp => {

      if (resp) {
       this.ai_tags = resp.models;
       this.aiconnected = true;
      } else {
        this.router.navigate(['/settings']);
        this.dialogRef.close();
      }
    });

    const localchat = this.sessionsub.getSessionStorageItem('VULNREPO-OLLAMA-CHAT');

    if (localchat) {
      this.chatmsg = JSON.parse(localchat);
    }
    

  }

  sendmsg() {

    const inputmsg = this.questioninput.value;
    const attarr = this.attachedIMG;
    const attarr_b64 = this.attachedIMG_b64;
    const attfiles = this.attachedFILES;

    this.questioninput.setValue('');
    this.attachedIMG = [];
    this.attachedIMG_b64 = [];
    this.attachedFILES = [];

    

    if(inputmsg !== null && inputmsg !== '') {

      this.chatmsg.push({"question": inputmsg, "response": "", "date": String(this.currentdateService.getcurrentDate()), "model": this.aiselectedValue, "images": attarr, "files": attfiles});

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
  console.log(this.defaultprompt);
      //this.updatemsg('user', inputmsg);
      this.ollamaService.chatStream(this.ollamaurl, inputmsg, this.aiselectedValue, attarr_b64, attfiles, this.defaultprompt).subscribe({
        next: (text) => {
          this.chatmsg[this.chatmsg.length-1].response += text;
          temps += text;
  
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


onImageLoad(fileLoadedEvent) {}

onImageSelect(input: HTMLInputElement) {
  const files = input.files;

  Object.keys(files).forEach(key => {

    const fileToRead = files[key];
    const fileReader = new FileReader();
    fileReader.onload = this.onImageLoad;

    fileReader.onload = (e) => {

      const res: string = fileReader.result as string;

      this.attachedIMG.push('data:image/png;base64,' + btoa(res) );
      this.attachedIMG_b64.push(btoa(res) );

    };

    fileReader.readAsBinaryString(fileToRead);

  });


}

removeAttach(){
  this.attachedIMG = [];
  this.attachedIMG_b64 = [];
}

onFileLoad(fileLoadedEvent) {}

onFileSelect(input: HTMLInputElement) {
  const files = input.files;

  Object.keys(files).forEach(key => {

    const fileToRead = files[key];
    const fileReader = new FileReader();
    fileReader.onload = this.onImageLoad;

    fileReader.onload = (e) => {

      const res: string = fileReader.result as string;

      this.attachedFILES.push({"filename": files[key].name, "filetype": files[key].type, "file": btoa(res)} );

    };

    fileReader.readAsBinaryString(fileToRead);

  });


}

removeAttachfile(){
  this.attachedFILES = [];
}

opensettings() {
  const dialogRef = this.dialog.open(DialogOllamaSettingsComponent, {
    width: '600px',
    disableClose: false,
    data: []
  });

  dialogRef.afterClosed().subscribe(result => {
    console.log('The AI-Settings dialog was closed');
  });

}

}
