import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogMergeIssuesComponent } from './dialog-merge-issues.component';

describe('DialogMergeIssuesComponent', () => {
  let component: DialogMergeIssuesComponent;
  let fixture: ComponentFixture<DialogMergeIssuesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogMergeIssuesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogMergeIssuesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
