import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DialogImportComponent } from './dialog-import.component';

describe('DialogImportComponent', () => {
  let component: DialogImportComponent;
  let fixture: ComponentFixture<DialogImportComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogImportComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
