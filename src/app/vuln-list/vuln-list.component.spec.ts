import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VulnListComponent } from './vuln-list.component';

describe('VulnListComponent', () => {
  let component: VulnListComponent;
  let fixture: ComponentFixture<VulnListComponent>;

  beforeEach(async(() => {
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
