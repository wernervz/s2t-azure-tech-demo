import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  public credentials = {
    username: '',
    password: ''
  }

  public isFailureAlertClosed: boolean = true;

  constructor(private router: Router, private authSvc: AuthService) { }

  ngOnInit() {
  }

  validateCreds() {
    if (this.credentials.username && this.credentials.username.length > 1 &&
      this.credentials.password && this.credentials.password.length > 1) {
        return false
      } else {
        return true
      }
  }

  login() {
    this.authSvc.login(this.credentials).pipe(catchError(err => {
      this.isFailureAlertClosed = false
      return throwError(err.message)
    })).subscribe(token => {
      let success = this.router.navigate(['protected'])
    })
  }

  backToUnprotected() {
    let success = this.router.navigate(['unprotected'])
  }
}
