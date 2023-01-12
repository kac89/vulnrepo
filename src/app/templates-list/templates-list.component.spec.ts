import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VulnListComponent } from './templates-list.component';

describe('VulnListComponent', () => {
  let component: VulnListComponent;
  let fixture: ComponentFixture<VulnListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ VulnListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VulnListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
