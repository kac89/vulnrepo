import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TbhmComponent } from './tbhm.component';

describe('TbhmComponent', () => {
  let component: TbhmComponent;
  let fixture: ComponentFixture<TbhmComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TbhmComponent]
    });
    fixture = TestBed.createComponent(TbhmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
