import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UntypedFormControl } from '@angular/forms';
import {OllamaServiceService} from '../ollama-service.service';
import { SessionstorageserviceService } from "../sessionstorageservice.service"
import { IndexeddbService } from '../indexeddb.service';

@Component({
  selector: 'app-dialog-ollama-settings',
  standalone: false,
  //imports: [],
  templateUrl: './dialog-ollama-settings.component.html',
  styleUrl: './dialog-ollama-settings.component.scss'
})
export class DialogOllamaSettingsComponent {

  aiselectedValue = "";
  temperature = 0.1;
  ai_tags:any = [];
  ollamaurl = "http://localhost:11434";
  models:any;
  defaultprompt = new UntypedFormControl();
  // @ts-ignore
  constructor(public dialogRef: MatDialogRef<DialogOllamaSettingsComponent>, @Inject(MAT_DIALOG_DATA) public data: any,private ollamaService: OllamaServiceService,
  private indexeddbService: IndexeddbService, public sessionsub: SessionstorageserviceService) {

  }


  ngOnInit() {

    this.defaultprompt.setValue('You are a helpful assistant.');

    this.indexeddbService.getkeybyAiintegration().then(ret => {
      
      if(ret[0]) {
        this.models = ret[0];

        this.aiselectedValue = this.models.model;
        this.ollamaurl = this.models.ollama_url;
        this.temperature = this.models.temperature;
        this.defaultprompt.setValue(this.models.defaultprompt);
        
      } else {
        //console.log('first time');

        this.firstime();

      }
     });

    if(this.models) {
      this.aiselectedValue = this.models.model;
      this.ollamaurl = this.models.ollama_url;
    }
  

    this.ollamaService.checktags(this.ollamaurl).then(resp => {
      if (resp) {
       this.ai_tags = resp.models;
       this.aiselectedValue = this.ai_tags[0].model;
      }
    });

  }

  savetemp() {
    this.indexeddbService.updateAiintegration({"model":this.aiselectedValue, "ollama_url":this.ollamaurl, "temperature": this.temperature, "defaultprompt": this.defaultprompt.value}, 0).then(ret => { });
    this.sessionsub.setSessionStorageItem('VULNREPO-OLLAMA-CHAT-SET-TEMP', this.temperature);
  }


  selectcmodel(event){

    if(event.value) {
      this.indexeddbService.updateAiintegration({"model":event.value, "ollama_url":this.ollamaurl, "temperature": this.temperature, "defaultprompt": this.defaultprompt.value}, 0).then(ret => { });
      this.aiselectedValue = event.value;
    }

  }

  savedef(){
    this.indexeddbService.updateAiintegration({"model":this.aiselectedValue, "ollama_url":this.ollamaurl, "temperature": this.temperature, "defaultprompt": this.defaultprompt.value}, 0).then(ret => { });
  }

  firstime() {
    this.ollamaService.checktags(this.ollamaurl).then(resp => {
      if (resp) {
       this.ai_tags = resp.models;
       this.aiselectedValue = this.ai_tags[0].model;
       this.indexeddbService.updateAiintegration({"model":this.aiselectedValue, "ollama_url":this.ollamaurl, "temperature": this.temperature, "defaultprompt": this.defaultprompt.value}, 0).then(ret => { });
      }
    });
  }

}
