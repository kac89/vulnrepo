import { TestBed } from '@angular/core/testing';

import { SessionstorageserviceService } from './sessionstorageservice.service';

describe('SessionstorageserviceService', () => {
  let service: SessionstorageserviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionstorageserviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
