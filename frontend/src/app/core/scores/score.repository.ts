import { InjectionToken } from '@angular/core';
import { GameScore, LeaderboardEntry } from './score.models';

export interface ScoreRepository {
  gameScores(gameId: string): Promise<GameScore[]>;
  leaderboard(): Promise<LeaderboardEntry[]>;
}

export const SCORE_REPOSITORY = new InjectionToken<ScoreRepository>('SCORE_REPOSITORY');
