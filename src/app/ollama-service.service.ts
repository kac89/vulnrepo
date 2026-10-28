import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { SessionstorageserviceService } from "./sessionstorageservice.service"

@Injectable({
  providedIn: 'root'
})
export class OllamaServiceService {

  constructor(private http: HttpClient, private snackBar: MatSnackBar, private sessionsub: SessionstorageserviceService) { }

  checktags(url): Promise<any> {
    return this.http.get<any>(url+'/api/tags')
      .toPromise()
      .then(response => response)
      .catch(error => {
        console.log('ollama api error: ', error);
        this.snackBar.open('Can\'t connect to Ollama API', 'OK', {
          duration: 5000,
          panelClass: ['notify-snackbar-fail']
        });
      });
  }

  // LiteLLM (and any OpenAI-compatible gateway) lists its models at GET /v1/models.
  // The result is normalised to the {models:[{model,name}]} shape checktags returns,
  // so the settings and chat dialogs read model lists the same way for either backend.
  checkmodels_litellm(url, apikey): Promise<any> {
    const headers = apikey ? new HttpHeaders({ 'Authorization': 'Bearer ' + apikey }) : new HttpHeaders();
    return this.http.get<any>(url+'/v1/models', { headers })
      .toPromise()
      .then(response => {
        const list = (response && response.data) ? response.data : [];
        return { models: list.map(m => ({ model: m.id, name: m.id })) };
      })
      .catch(error => {
        console.log('litellm api error: ', error);
        this.snackBar.open('Can\'t connect to LiteLLM API', 'OK', {
          duration: 5000,
          panelClass: ['notify-snackbar-fail']
        });
      });
  }

  // Dispatch model discovery to the backend the user picked.
  checkmodels(url, apitype, apikey): Promise<any> {
    return apitype === 'litellm' ? this.checkmodels_litellm(url, apikey) : this.checktags(url);
  }


  chatStream(url,msg,model,imgs,files,defaultprompt,apitype='ollama',apikey='') {

    const localchat = this.sessionsub.getSessionStorageItem('VULNREPO-OLLAMA-CHAT-MSG-H');
    let tarr = [];
    if (localchat) {
      tarr = JSON.parse(localchat);
    }

    let temperature = 0.7;
    const temperaturet = this.sessionsub.getSessionStorageItem('VULNREPO-OLLAMA-CHAT-SET-TEMP');

    if (temperaturet) {
      temperature = Number(temperaturet);
    }

    let addfile = "";

    if(files.length > 0) {

      files.forEach(function (value, index) {

        addfile = addfile + `\n\n
        <ATTACHMENT_FILE>
        <FILE_INDEX>File `+(index+1)+`</FILE_INDEX>
        <FILE_NAME>`+value.filename+`</FILE_NAME>
        <FILE_TYPE>`+value.filetype+`</FILE_TYPE>
        <FILE_CONTENT>
        `+atob(value.file)+`
        </FILE_CONTENT>
        </ATTACHMENT_FILE>\n
        `;
        
    });
    }

    if (apitype === 'litellm') {
      return this.chatStream_litellm(url, msg+addfile, model, imgs, defaultprompt, tarr, temperature, apikey);
    }

    return new Observable<string>(observer => {
      fetch(url+'/api/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          "model": model, 
          "messages": [
              { "role": "system", "content": defaultprompt },
              ...tarr,
              { "role": "user", "content": msg+addfile, "images": imgs}
            ], 
            "stream": true,
            "options": { 
              "temperature": temperature
            }
          }),
        headers: {
          'Content-Type': 'application/json'
        },
      }).then(response => {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!response.ok) {
           observer.error();
        }

        function push() {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
              return;
            }

            const events = decoder.decode(value).split('\n');
            let content = '';
            for (let i = 0; i < events.length; i++) {
              const event = events[i];

              if (event) {
                const data = JSON.parse(event);
                content += data.message.content || '';
              }
            }
            observer.next(content);
            push();
          });
        }

        push();
      }).catch((err: Error) => {
        observer.error();
      });
    });
  }

  // Chat through a LiteLLM proxy (or any OpenAI-compatible gateway) at
  // POST /v1/chat/completions. LiteLLM routes the model prefix (openai/..., vertex_ai/...,
  // bedrock/..., anthropic/...) to the real provider and streams back Server-Sent Events,
  // each a `data: {choices:[{delta:{content}}]}` line ending with `data: [DONE]`. Images are
  // sent as OpenAI content parts. An optional Bearer key authenticates to the proxy.
  chatStream_litellm(url, msg, model, imgs, defaultprompt, history, temperature, apikey) {

    let usercontent: any = msg;
    if (imgs && imgs.length > 0) {
      usercontent = [{ "type": "text", "text": msg }];
      imgs.forEach(function (value) {
        usercontent.push({ "type": "image_url", "image_url": { "url": "data:image/png;base64," + value } });
      });
    }

    const body = {
      "model": model,
      "messages": [
        { "role": "system", "content": defaultprompt },
        ...history,
        { "role": "user", "content": usercontent }
      ],
      "stream": true,
      "temperature": temperature
    };

    const headers: any = { 'Content-Type': 'application/json' };
    if (apikey) {
      headers['Authorization'] = 'Bearer ' + apikey;
    }

    return new Observable<string>(observer => {
      fetch(url+'/v1/chat/completions', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: headers,
      }).then(response => {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!response.ok) {
           observer.error();
        }

        let buffer = '';

        function push() {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            // SSE events are separated by a blank line; keep any partial tail in the buffer.
            const events = buffer.split('\n');
            buffer = events.pop() || '';
            let content = '';
            for (let i = 0; i < events.length; i++) {
              const line = events[i].trim();
              if (!line || line.indexOf('data:') !== 0) {
                continue;
              }
              const payload = line.slice(5).trim();
              if (payload === '[DONE]') {
                continue;
              }
              try {
                const data = JSON.parse(payload);
                content += (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) || '';
              } catch (e) {
                // a split JSON chunk: it will be completed on the next read
              }
            }
            if (content) {
              observer.next(content);
            }
            push();
          });
        }

        push();
      }).catch((err: Error) => {
        observer.error();
      });
    });
  }


}
