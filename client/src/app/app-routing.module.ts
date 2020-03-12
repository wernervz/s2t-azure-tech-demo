import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { UnprotectedComponent } from './unprotected/unprotected.component';
import { LoginComponent } from './auth/login/login.component';
import { ProtectedComponent } from './protected/protected.component';
import { AuthGuard } from './auth/auth.guard';


const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'protected' },
  { path: 'unprotected', component: UnprotectedComponent },
  { path: 'login', component: LoginComponent },
  { path: 'protected', component: ProtectedComponent, canActivate: [ AuthGuard ]},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
