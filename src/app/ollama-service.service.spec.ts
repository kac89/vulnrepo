import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { OllamaServiceService } from './ollama-service.service';

describe('OllamaServiceService', () => {
  let service: OllamaServiceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MatSnackBarModule],
    });
    service = TestBed.inject(OllamaServiceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('normalises /v1/models into the {models:[{model,name}]} shape', (done) => {
    service.checkmodels('http://localhost:4000', 'litellm', 'sk-proxy').then(resp => {
      expect(resp.models).toEqual([
        { model: 'openai/gpt-4o-mini', name: 'openai/gpt-4o-mini' },
        { model: 'vertex_ai/gemini-2.5-flash', name: 'vertex_ai/gemini-2.5-flash' },
      ]);
      done();
    });
    const req = httpMock.expectOne('http://localhost:4000/v1/models');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer sk-proxy');
    req.flush({ data: [{ id: 'openai/gpt-4o-mini' }, { id: 'vertex_ai/gemini-2.5-flash' }] });
  });

  it('routes model discovery to /api/tags for the ollama backend', () => {
    service.checkmodels('http://localhost:11434', 'ollama', '');
    const req = httpMock.expectOne('http://localhost:11434/api/tags');
    expect(req.request.method).toBe('GET');
    req.flush({ models: [{ model: 'llama3', name: 'llama3' }] });
  });

  it('streams a LiteLLM chat completion, assembling delta content', (done) => {
    const enc = new TextEncoder();
    const chunks = [
      enc.encode('data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n'),
      enc.encode('data: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: [DONE]\n\n'),
    ];
    let i = 0;
    const reader = {
      read: () => Promise.resolve(i < chunks.length ? { done: false, value: chunks[i++] } : { done: true, value: undefined }),
    };
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo({ ok: true, body: { getReader: () => reader } } as any);

    let out = '';
    service.chatStream('http://localhost:4000', 'hi', 'openai/gpt-4o-mini', [], [], 'be helpful', 'litellm', 'sk-proxy')
      .subscribe({
        next: (text: string) => { out += text; },
        complete: () => {
          expect(out).toBe('Hello');
          const [url, init] = fetchSpy.calls.mostRecent().args as any;
          expect(url).toBe('http://localhost:4000/v1/chat/completions');
          expect(init.headers['Authorization']).toBe('Bearer sk-proxy');
          const body = JSON.parse(init.body);
          expect(body.model).toBe('openai/gpt-4o-mini');
          expect(body.stream).toBe(true);
          expect(body.messages[0]).toEqual({ role: 'system', content: 'be helpful' });
          done();
        },
      });
  });
});
