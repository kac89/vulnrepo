import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogAddreportprofileComponent } from './dialog-addreportprofile.component';

describe('DialogAddreportprofileComponent', () => {
  let component: DialogAddreportprofileComponent;
  let fixture: ComponentFixture<DialogAddreportprofileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DialogAddreportprofileComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogAddreportprofileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
