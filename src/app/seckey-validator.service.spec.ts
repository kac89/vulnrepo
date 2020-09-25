import { TestBed } from '@angular/core/testing';

import { SeckeyValidatorService } from './seckey-validator.service';

describe('SeckeyValidatorService', () => {
  let service: SeckeyValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeckeyValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
