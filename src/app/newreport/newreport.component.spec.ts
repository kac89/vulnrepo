import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NewreportComponent } from './newreport.component';

describe('NewreportComponent', () => {
  let component: NewreportComponent;
  let fixture: ComponentFixture<NewreportComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ NewreportComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NewreportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
