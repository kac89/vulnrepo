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


  chatStream(url,msg,model) {

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
    

    return new Observable<string>(observer => {
      fetch(url+'/api/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          "model": model, 
          "messages": [
              { "role": "system", "content": "You are a helpful assistant." },
              ...tarr,
              { "role": "user", "content": msg }
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


}
