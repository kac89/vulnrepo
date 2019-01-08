import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogPassComponent } from './dialog-pass.component';

describe('DialogPassComponent', () => {
  let component: DialogPassComponent;
  let fixture: ComponentFixture<DialogPassComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogPassComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogPassComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
