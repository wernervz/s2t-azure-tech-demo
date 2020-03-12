import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-sentiment',
  templateUrl: './sentiment.component.html',
  styleUrls: ['./sentiment.component.scss']
})
export class SentimentComponent implements OnInit {

  @Input() set sentiment(sentiment) {
    this._sentiment = sentiment;
    this.face = 'neutral';
    let highest = -1;

    for (const s in sentiment) {
      if (sentiment[s] > highest) {
        highest = sentiment[s];
        switch (s) {
          case 'Positive': this.face = 'happy'; this.color = 'success'; break;
          case 'Negative': this.face = 'sad'; this.color = 'error'; break;
          default: this.face = 'neutral'; this.color = 'primary';
        }
      }
    }
  }

  _sentiment;
  face = 'neutral';
  color = 'primary';

  constructor() { }

  ngOnInit(): void {
  }

}
