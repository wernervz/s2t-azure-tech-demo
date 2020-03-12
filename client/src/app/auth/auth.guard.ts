import { Injectable, Inject } from '@angular/core';
import { Router, Route, CanActivate, CanLoad, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate, CanLoad {

  constructor(private router: Router, private authService: AuthService) { }

  // Use this function when you want to allow a route to be access only when the user is authenticated
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | boolean {
    return this.authService.isAuthenticated()
  }

  // Use this function when a module should be loaded via lazy loading only when a user is authenticated
  canLoad(route: Route): Observable<boolean> | boolean {
    let isAuthenticated = this.authService.isAuthenticated()

    if (!isAuthenticated) {
      this.router.navigate(['unprotected', 'login']);
      return false;
    }
    return true;
  }
}
