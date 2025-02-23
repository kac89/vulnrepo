import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogOllamaComponent } from './dialog-ollama.component';

describe('DialogOllamaComponent', () => {
  let component: DialogOllamaComponent;
  let fixture: ComponentFixture<DialogOllamaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogOllamaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogOllamaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
