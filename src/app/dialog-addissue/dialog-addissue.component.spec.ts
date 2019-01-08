import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogAddissueComponent } from './dialog-addissue.component';

describe('DialogAddissueComponent', () => {
  let component: DialogAddissueComponent;
  let fixture: ComponentFixture<DialogAddissueComponent>;

  beforeEach(async(() => {
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
