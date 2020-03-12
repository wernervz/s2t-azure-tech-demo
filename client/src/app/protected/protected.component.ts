import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-protected',
  templateUrl: './protected.component.html',
  styleUrls: ['./protected.component.scss']
})
export class ProtectedComponent implements OnInit {

  env = environment;

  constructor(private router: Router, private authSvc: AuthService) { }

  ngOnInit() {
  }

  logout() {
    this.authSvc.logout().subscribe(success => {
      this.router.navigate(['login']);
    })
  }
}
