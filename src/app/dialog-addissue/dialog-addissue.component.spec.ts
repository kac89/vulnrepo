import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DialogAddissueComponent } from './dialog-addissue.component';

describe('DialogAddissueComponent', () => {
  let component: DialogAddissueComponent;
  let fixture: ComponentFixture<DialogAddissueComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogAddissueComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogAddissueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
