import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogCustomcontentComponent } from './dialog-customcontent.component';

describe('DialogCustomcontentComponent', () => {
  let component: DialogCustomcontentComponent;
  let fixture: ComponentFixture<DialogCustomcontentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DialogCustomcontentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogCustomcontentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
