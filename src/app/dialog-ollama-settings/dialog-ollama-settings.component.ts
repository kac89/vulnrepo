import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dialog-ollama-settings.component.scss'
})
export class DialogOllamaSettingsComponent {

  aiselectedValue = "";
  temperature = 0.1;
  ai_tags:any = [];
  ollamaurl = "http://localhost:11434";
  apitype = "ollama";
  apikey = "";
  models:any;
  defaultprompt = new UntypedFormControl();
  // @ts-ignore
  constructor(public dialogRef: MatDialogRef<DialogOllamaSettingsComponent>, @Inject(MAT_DIALOG_DATA) public data: any,private ollamaService: OllamaServiceService,
  private indexeddbService: IndexeddbService, public sessionsub: SessionstorageserviceService) {

  }


  ngOnInit() {

    this.defaultprompt.setValue('You are a helpful cyber security assistant.');

    this.indexeddbService.getkeybyAiintegration().then(ret => {
      
      if(ret[0]) {
        this.models = ret[0];

        this.aiselectedValue = this.models.model;
        this.ollamaurl = this.models.ollama_url || 'http://localhost:11434';
        this.apitype = this.models.apitype || 'ollama';
        this.apikey = this.models.api_key || '';
        this.temperature = this.models.temperature;
        this.defaultprompt.setValue(this.models.defaultprompt);

        this.loadmodels();

      } else {
        //console.log('first time');

        this.firstime();

      }
     });

  }

  // Record shared by the settings and chat dialogs. apitype selects the backend
  // (ollama native API, or a LiteLLM / OpenAI-compatible gateway) and api_key is the
  // optional proxy key.
  private record() {
    return {
      "model": this.aiselectedValue,
      "ollama_url": this.ollamaurl,
      "apitype": this.apitype,
      "api_key": this.apikey,
      "temperature": this.temperature,
      "defaultprompt": this.defaultprompt.value
    };
  }

  loadmodels() {
    this.ollamaService.checkmodels(this.ollamaurl, this.apitype, this.apikey).then(resp => {
      if (resp && resp.models && resp.models.length > 0) {
        this.ai_tags = resp.models;
        if (!this.aiselectedValue) {
          this.aiselectedValue = this.ai_tags[0].model;
        }
      }
    });
  }

  // Re-discover models and persist when the backend, endpoint or key changes.
  reconnect() {
    this.aiselectedValue = "";
    this.ai_tags = [];
    this.ollamaService.checkmodels(this.ollamaurl, this.apitype, this.apikey).then(resp => {
      if (resp && resp.models && resp.models.length > 0) {
        this.ai_tags = resp.models;
        this.aiselectedValue = this.ai_tags[0].model;
      }
      this.indexeddbService.updateAiintegration(this.record(), 0).then(ret => { });
    });
  }

  savetemp() {
    this.indexeddbService.updateAiintegration(this.record(), 0).then(ret => { });
    this.sessionsub.setSessionStorageItem('VULNREPO-OLLAMA-CHAT-SET-TEMP', this.temperature);
  }


  selectcmodel(event){

    if(event.value) {
      this.aiselectedValue = event.value;
      this.indexeddbService.updateAiintegration(this.record(), 0).then(ret => { });
    }

  }

  savedef(){
    this.indexeddbService.updateAiintegration(this.record(), 0).then(ret => { });
  }

  firstime() {
    this.ollamaService.checkmodels(this.ollamaurl, this.apitype, this.apikey).then(resp => {
      if (resp && resp.models && resp.models.length > 0) {
       this.ai_tags = resp.models;
       this.aiselectedValue = this.ai_tags[0].model;
       this.indexeddbService.updateAiintegration(this.record(), 0).then(ret => { });
      }
    });
  }

}
