import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogReportHistoryComponent } from './dialog-report-history.component';

describe('DialogReportHistoryComponent', () => {
  let component: DialogReportHistoryComponent;
  let fixture: ComponentFixture<DialogReportHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogReportHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogReportHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
