import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogSpinnerComponent } from './dialog-spinner.component';

describe('DialogSpinnerComponent', () => {
  let component: DialogSpinnerComponent;
  let fixture: ComponentFixture<DialogSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogSpinnerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
