import { TestBed } from '@angular/core/testing';

import { DeactivateGuardService } from './deactivate-guard.service';

describe('DeactivateGuardService', () => {
  let service: DeactivateGuardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeactivateGuardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
