import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';

import { HomeComponent } from './home.component';
import { FilesizePipe } from '../filesize.pipe';
import { IndexeddbService } from '../indexeddb.service';
import { KeyVaultService } from '../key-vault.service';

class IndexeddbServiceStub {
  reports: any[] = [];
  getReports() { return Promise.resolve(this.reports); }
}

class KeyVaultServiceStub {
  change$ = new Subject<string | null>();
  openReportIds() { return []; }
  has() { return false; }
}

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let db: IndexeddbServiceStub;

  beforeEach(waitForAsync(() => {
    db = new IndexeddbServiceStub();

    TestBed.configureTestingModule({
      declarations: [HomeComponent, FilesizePipe],
      imports: [RouterModule.forRoot([])],
      providers: [
        { provide: IndexeddbService, useValue: db },
        { provide: KeyVaultService, useClass: KeyVaultServiceStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts in FIRST_RUN with an empty vault', async () => {
    await fixture.whenStable();
    expect(component.state).toBe('FIRST_RUN');
    expect(component.reportCount).toBe(0);
  });

  it('switches to WORKSPACE and totals findings once reports exist', async () => {
    db.reports = [
      {
        report_id: 'a', report_name: 'Report A', report_createdate: 1,
        report_lastupdate: 10,
        report_stats: { total: 3, critical: 1, high: 1, medium: 1, low: 0, info: 0 }
      },
      {
        report_id: 'b', report_name: 'Report B', report_createdate: 2,
        report_lastupdate: 20,
        report_stats: { total: 2, critical: 0, high: 0, medium: 0, low: 1, info: 1 }
      }
    ];

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.state).toBe('WORKSPACE');
    expect(component.reportCount).toBe(2);
    expect(component.findingCount).toBe(5);
    // most recently updated first
    expect(component.recent[0].report_id).toBe('b');
  });
});
