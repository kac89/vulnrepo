import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogApierrorComponent } from './dialog-apierror.component';

describe('DialogApierrorComponent', () => {
  let component: DialogApierrorComponent;
  let fixture: ComponentFixture<DialogApierrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DialogApierrorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogApierrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
