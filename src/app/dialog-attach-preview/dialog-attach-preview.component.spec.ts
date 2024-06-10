import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogAttachPreviewComponent } from './dialog-attach-preview.component';

describe('DialogAttachPreviewComponent', () => {
  let component: DialogAttachPreviewComponent;
  let fixture: ComponentFixture<DialogAttachPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogAttachPreviewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogAttachPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
