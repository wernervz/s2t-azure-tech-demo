import { Component, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-unprotected',
  templateUrl: './unprotected.component.html',
  styleUrls: ['./unprotected.component.scss']
})
export class UnprotectedComponent implements OnInit {

  env = environment;

  constructor() { }

  ngOnInit() {
  }

}
