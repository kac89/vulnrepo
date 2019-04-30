import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogEditComponent } from './dialog-edit.component';

describe('DialogEditComponent', () => {
  let component: DialogEditComponent;
  let fixture: ComponentFixture<DialogEditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogEditComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
