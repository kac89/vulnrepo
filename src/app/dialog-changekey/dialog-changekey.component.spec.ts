import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DialogChangekeyComponent } from './dialog-changekey.component';

describe('DialogChangekeyComponent', () => {
  let component: DialogChangekeyComponent;
  let fixture: ComponentFixture<DialogChangekeyComponent>;

  beforeEach(waitForAsync(() => {
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
