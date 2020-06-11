import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogCvssComponent } from './dialog-cvss.component';

describe('DialogCvssComponent', () => {
  let component: DialogCvssComponent;
  let fixture: ComponentFixture<DialogCvssComponent>;

  beforeEach(async(() => {
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
