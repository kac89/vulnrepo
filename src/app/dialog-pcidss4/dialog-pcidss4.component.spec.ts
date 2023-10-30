import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogPcidss4Component } from './dialog-pcidss4.component';

describe('DialogPcidss4Component', () => {
  let component: DialogPcidss4Component;
  let fixture: ComponentFixture<DialogPcidss4Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogPcidss4Component]
    });
    fixture = TestBed.createComponent(DialogPcidss4Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
