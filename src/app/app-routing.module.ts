import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AboutComponent } from './about/about.component';
import { NotfoundComponent } from './notfound/notfound.component';
import { HomeComponent } from './home/home.component';
import { MyreportsComponent } from './myreports/myreports.component';
import { SettingsComponent } from './settings/settings.component';
import { NewreportComponent } from './newreport/newreport.component';
import { ReportComponent } from './report/report.component';
import { ImportReportComponent } from './import-report/import-report.component';
import { VulnListComponent } from './vuln-list/vuln-list.component';

const routes: Routes = [{
  path: 'home',
  pathMatch: 'full',
  component: HomeComponent
},
{
  path: 'about',
  pathMatch: 'full',
  component: AboutComponent
},
{
  path: 'my-reports',
  pathMatch: 'full',
  component: MyreportsComponent
},
{
  path: 'new-report',
  pathMatch: 'full',
  component: NewreportComponent
},
{
  path: 'report/:report_id',
  pathMatch: 'full',
  component: ReportComponent
},
{
  path: 'settings',
  pathMatch: 'full',
  component: SettingsComponent
},
{
  path: 'import-report',
  pathMatch: 'full',
  component: ImportReportComponent
},
{
  path: '',
  redirectTo: '/home',
  pathMatch: 'full'
},
{
  path: 'vuln-list',
  pathMatch: 'full',
  component: VulnListComponent
},
{
  path: '**',
  component: NotfoundComponent
}];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
