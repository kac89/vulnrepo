import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DialogRemoveitemsComponent } from './dialog-removeitems.component';

describe('DialogRemoveitemsComponent', () => {
  let component: DialogRemoveitemsComponent;
  let fixture: ComponentFixture<DialogRemoveitemsComponent>;

  beforeEach(waitForAsync(() => {
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
