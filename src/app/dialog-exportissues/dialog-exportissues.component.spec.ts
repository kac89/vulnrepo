import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogExportissuesComponent } from './dialog-exportissues.component';

describe('DialogExportissuesComponent', () => {
  let component: DialogExportissuesComponent;
  let fixture: ComponentFixture<DialogExportissuesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogExportissuesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogExportissuesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
