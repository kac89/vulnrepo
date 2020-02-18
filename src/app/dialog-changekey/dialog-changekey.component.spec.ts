import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogChangekeyComponent } from './dialog-changekey.component';

describe('DialogChangekeyComponent', () => {
  let component: DialogChangekeyComponent;
  let fixture: ComponentFixture<DialogChangekeyComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogChangekeyComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogChangekeyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
