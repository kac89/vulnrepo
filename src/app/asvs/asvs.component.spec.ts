import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsvsComponent } from './asvs.component';

describe('AsvsComponent', () => {
  let component: AsvsComponent;
  let fixture: ComponentFixture<AsvsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AsvsComponent]
    });
    fixture = TestBed.createComponent(AsvsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
