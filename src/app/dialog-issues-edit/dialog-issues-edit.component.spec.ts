import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogIssuesEditComponent } from './dialog-issues-edit.component';

describe('DialogIssuesEditComponent', () => {
  let component: DialogIssuesEditComponent;
  let fixture: ComponentFixture<DialogIssuesEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogIssuesEditComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogIssuesEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
