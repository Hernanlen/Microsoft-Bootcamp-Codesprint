import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GameScore, LeaderboardEntry, ScoreError } from '../../core/scores/score.models';
import { ScoreRepository } from '../../core/scores/score.repository';
import { AUTH_SESSION_STORE } from '../storage/auth-session.store';

interface BackendGameScore {
  gameId: string;
  playerId: number;
  playerName: string;
  points: number;
  isWin: boolean;
  livesRemaining: number;
  secondsRemaining: number;
}

interface BackendLeaderboardEntry {
  rank: number;
  playerId: number;
  name: string;
  points: number;
  wins: number;
  gamesPlayed: number;
}

@Injectable()
export class HttpScoreRepository implements ScoreRepository {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AUTH_SESSION_STORE);
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');

  async gameScores(gameId: string): Promise<GameScore[]> {
    try {
      const scores = await firstValueFrom(
        this.http.get<BackendGameScore[]>(`${this.apiUrl}/api/games/${gameId}/scores`, {
          headers: this.authorization(),
        }),
      );
      return scores.map((score) => ({
        playerId: score.playerId.toString(),
        playerName: score.playerName,
        points: score.points,
        isWin: score.isWin,
        livesRemaining: score.livesRemaining,
      }));
    } catch (error: unknown) {
      throw this.toScoreError(error);
    }
  }

  async leaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const entries = await firstValueFrom(
        this.http.get<BackendLeaderboardEntry[]>(`${this.apiUrl}/api/leaderboard`, {
          headers: this.authorization(),
        }),
      );
      return entries.map((entry) => ({
        rank: entry.rank,
        playerId: entry.playerId.toString(),
        name: entry.name,
        points: entry.points,
        wins: entry.wins,
        gamesPlayed: entry.gamesPlayed,
      }));
    } catch (error: unknown) {
      throw this.toScoreError(error);
    }
  }

  private authorization(): Record<string, string> {
    const session = this.store.read();
    if (!session) throw new ScoreError('unavailable', 'No authenticated session');
    return { Authorization: `Bearer ${session.accessToken}` };
  }

  private toScoreError(error: unknown): ScoreError {
    if (error instanceof ScoreError) return error;
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return new ScoreError('not-found', 'Scores not found');
    }
    return new ScoreError('unavailable', 'Score service unavailable');
  }
}
