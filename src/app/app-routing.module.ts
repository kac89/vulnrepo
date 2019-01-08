import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AboutComponent } from './about/about.component';
import { NotfoundComponent } from './notfound/notfound.component';
import { HomeComponent } from './home/home.component';
import { MyreportsComponent } from './myreports/myreports.component';
import { SettingsComponent } from './settings/settings.component';
import { NewreportComponent } from './newreport/newreport.component';
import { ReportComponent } from './report/report.component';

const routes: Routes = [{
  path: 'home',
  component: HomeComponent
},
{
  path: 'about',
  component: AboutComponent
},
{
  path: 'my-reports',
  component: MyreportsComponent
},
{
  path: 'new-report',
  component: NewreportComponent
},
{
  path: 'report/:report_id',
  component: ReportComponent
},
{
  path: 'settings',
  component: SettingsComponent
},
{
  path: '',
  redirectTo: '/home',
  pathMatch: 'full'
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
