import { TestBed } from '@angular/core/testing';

import { CurrentdateService } from './currentdate.service';

describe('CurrentdateService', () => {
  let service: CurrentdateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrentdateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
