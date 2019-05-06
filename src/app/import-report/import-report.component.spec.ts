import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportReportComponent } from './import-report.component';

describe('ImportReportComponent', () => {
  let component: ImportReportComponent;
  let fixture: ComponentFixture<ImportReportComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImportReportComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
