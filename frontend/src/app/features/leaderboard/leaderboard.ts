import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScoreFacade } from '../../core/scores/score.facade';

@Component({
  selector: 'app-leaderboard',
  imports: [RouterLink],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss',
})
export class Leaderboard implements OnInit {
  readonly scores = inject(ScoreFacade);

  ngOnInit(): void {
    void this.scores.loadLeaderboard();
  }
}
