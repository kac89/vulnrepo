import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogApiaddComponent } from './dialog-apiadd.component';

describe('DialogApiaddComponent', () => {
  let component: DialogApiaddComponent;
  let fixture: ComponentFixture<DialogApiaddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DialogApiaddComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogApiaddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
