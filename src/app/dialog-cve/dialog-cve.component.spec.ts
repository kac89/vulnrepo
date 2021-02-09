import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DialogCveComponent } from './dialog-cve.component';

describe('DialogCveComponent', () => {
  let component: DialogCveComponent;
  let fixture: ComponentFixture<DialogCveComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogCveComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogCveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
