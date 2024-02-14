import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogEncryptReportComponent } from './dialog-encrypt-report.component';

describe('DialogEncryptReportComponent', () => {
  let component: DialogEncryptReportComponent;
  let fixture: ComponentFixture<DialogEncryptReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogEncryptReportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogEncryptReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
