import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogOllamaSettingsComponent } from './dialog-ollama-settings.component';

describe('DialogOllamaSettingsComponent', () => {
  let component: DialogOllamaSettingsComponent;
  let fixture: ComponentFixture<DialogOllamaSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogOllamaSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogOllamaSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
