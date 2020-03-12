import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ClarityModule } from '@clr/angular';

import { LoginComponent } from './login/login.component';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@NgModule({
  imports:      [ CommonModule, HttpClientModule, FormsModule, ClarityModule ],
  declarations: [ LoginComponent ],
  providers:    [ AuthService, AuthGuard ],
  exports:      [ LoginComponent ]
})

export class AuthModule {
  constructor() { }
}
