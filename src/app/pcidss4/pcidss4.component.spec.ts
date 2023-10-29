import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pcidss4Component } from './pcidss4.component';

describe('Pcidss4Component', () => {
  let component: Pcidss4Component;
  let fixture: ComponentFixture<Pcidss4Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Pcidss4Component]
    });
    fixture = TestBed.createComponent(Pcidss4Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
