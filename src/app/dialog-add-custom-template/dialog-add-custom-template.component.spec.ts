import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogAddCustomTemplateComponent } from './dialog-add-custom-template.component';

describe('DialogAddCustomTemplateComponent', () => {
  let component: DialogAddCustomTemplateComponent;
  let fixture: ComponentFixture<DialogAddCustomTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogAddCustomTemplateComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogAddCustomTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
