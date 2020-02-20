import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogRemoveitemsComponent } from './dialog-removeitems.component';

describe('DialogRemoveitemsComponent', () => {
  let component: DialogRemoveitemsComponent;
  let fixture: ComponentFixture<DialogRemoveitemsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogRemoveitemsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogRemoveitemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
