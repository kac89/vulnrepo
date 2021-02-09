import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DialogCvssComponent } from './dialog-cvss.component';

describe('DialogCvssComponent', () => {
  let component: DialogCvssComponent;
  let fixture: ComponentFixture<DialogCvssComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogCvssComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogCvssComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
