import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogChangelogComponent } from './dialog-changelog.component';

describe('DialogChangelogComponent', () => {
  let component: DialogChangelogComponent;
  let fixture: ComponentFixture<DialogChangelogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogChangelogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogChangelogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
