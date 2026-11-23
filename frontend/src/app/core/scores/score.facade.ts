import { computed, inject, Injectable, signal } from '@angular/core';
import { GameScore, LeaderboardEntry, ScoreError } from './score.models';
import { SCORE_REPOSITORY } from './score.repository';

type ScoreStatus = 'idle' | 'loading' | 'ready' | 'error';

@Injectable({ providedIn: 'root' })
export class ScoreFacade {
  private readonly repository = inject(SCORE_REPOSITORY);
  private readonly leaderboardState = signal<LeaderboardEntry[]>([]);
  private readonly gameScoresState = signal<GameScore[]>([]);
  private readonly statusState = signal<ScoreStatus>('idle');
  private readonly errorState = signal<string | null>(null);

  readonly leaderboard = this.leaderboardState.asReadonly();
  readonly gameScores = this.gameScoresState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly isLoading = computed(() => this.statusState() === 'loading');

  async loadLeaderboard(): Promise<void> {
    await this.run(async () => {
      this.leaderboardState.set(await this.repository.leaderboard());
    });
  }

  async loadGameScores(gameId: string): Promise<void> {
    await this.run(async () => {
      this.gameScoresState.set(await this.repository.gameScores(gameId));
    });
  }

  clearGameScores(): void {
    this.gameScoresState.set([]);
    this.errorState.set(null);
    if (this.statusState() === 'error') this.statusState.set('idle');
  }

  private async run(operation: () => Promise<void>): Promise<boolean> {
    this.statusState.set('loading');
    this.errorState.set(null);
    try {
      await operation();
      this.statusState.set('ready');
      return true;
    } catch (error: unknown) {
      this.statusState.set('error');
      this.errorState.set(this.messageFor(error));
      return false;
    }
  }

  private messageFor(error: unknown): string {
    if (error instanceof ScoreError && error.code === 'not-found') {
      return 'Todavía no hay puntajes registrados.';
    }
    return 'El ranking no está disponible en este momento.';
  }
}
