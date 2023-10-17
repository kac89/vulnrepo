import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogAsvs4Component } from './dialog-asvs4.component';

describe('DialogAsvs4Component', () => {
  let component: DialogAsvs4Component;
  let fixture: ComponentFixture<DialogAsvs4Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogAsvs4Component]
    });
    fixture = TestBed.createComponent(DialogAsvs4Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
