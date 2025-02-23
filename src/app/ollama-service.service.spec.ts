import { TestBed } from '@angular/core/testing';

import { OllamaServiceService } from './ollama-service.service';

describe('OllamaServiceService', () => {
  let service: OllamaServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OllamaServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
