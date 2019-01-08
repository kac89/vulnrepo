import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MyreportsComponent } from './myreports.component';

describe('MyreportsComponent', () => {
  let component: MyreportsComponent;
  let fixture: ComponentFixture<MyreportsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MyreportsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MyreportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
