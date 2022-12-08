import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogReportcssComponent } from './dialog-reportcss.component';

describe('DialogReportcssComponent', () => {
  let component: DialogReportcssComponent;
  let fixture: ComponentFixture<DialogReportcssComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DialogReportcssComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogReportcssComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
