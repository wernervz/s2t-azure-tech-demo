import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-utterance',
  templateUrl: './utterance.component.html',
  styleUrls: ['./utterance.component.scss']
})
export class UtteranceComponent implements OnInit {

  @Input() segment;

  constructor() { }

  ngOnInit(): void {
  }

}
