import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { FaqComponent } from './faq.component';

describe('FaqComponent', () => {
  let component: FaqComponent;
  let fixture: ComponentFixture<FaqComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ FaqComponent ],
      imports: [
        NoopAnimationsModule,
        RouterModule.forRoot([]),
        MatIconModule,
        MatSnackBarModule,
        MatTooltipModule
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FaqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows every answer by default', () => {
    expect(component.visible.length).toBe(component.entries.length);
    expect(component.counts['all']).toBe(component.entries.length);
  });

  it('searches the answer body, not just a keyword list', () => {
    component.onSearch('sessionstorage');
    expect(component.visible.map(e => e.id)).toContain('Key-Storage-Security-Level');

    component.onSearch('session storage');
    expect(component.visible.length).toBeGreaterThan(0);
  });

  it('opens the answer when a search narrows to one hit', () => {
    component.onSearch('ollama');
    expect(component.visible.length).toBe(1);
    expect(component.isOpen('Private-LLM')).toBe(true);
  });

  it('drops empty groups from the sidebar so it cannot link to a hidden answer', () => {
    component.selectCategory('integrations');
    expect(component.groups.length).toBe(1);
    expect(component.groups[0].id).toBe('integrations');
    component.groups.forEach(group => {
      group.items.forEach(item => {
        expect(component.visible).toContain(item);
      });
    });
  });

  it('reports no results without throwing', () => {
    component.onSearch('zzzzz-not-a-word');
    expect(component.noResults).toBe(true);
    expect(component.groups.length).toBe(0);
  });
});
