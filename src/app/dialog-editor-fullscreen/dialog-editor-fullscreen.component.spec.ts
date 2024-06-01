import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogEditorFullscreenComponent } from './dialog-editor-fullscreen.component';

describe('DialogEditorFullscreenComponent', () => {
  let component: DialogEditorFullscreenComponent;
  let fixture: ComponentFixture<DialogEditorFullscreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogEditorFullscreenComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogEditorFullscreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
