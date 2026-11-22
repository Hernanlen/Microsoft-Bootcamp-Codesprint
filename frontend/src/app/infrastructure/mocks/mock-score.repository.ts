import { inject, Injectable } from '@angular/core';
import { GameScore, LeaderboardEntry } from '../../core/scores/score.models';
import { ScoreRepository } from '../../core/scores/score.repository';
import { AUTH_SESSION_STORE } from '../storage/auth-session.store';

const BOT_NAMES: Record<string, string> = {
  'bot-pink': 'Rosa',
  'bot-cyan': 'Cyan',
  'bot-amber': 'Ámbar',
};

@Injectable()
export class MockScoreRepository implements ScoreRepository {
  private readonly store = inject(AUTH_SESSION_STORE);

  async gameScores(_gameId: string): Promise<GameScore[]> {
    await this.wait(120);
    const me = this.store.read()?.player;
    return [
      {
        playerId: me?.id ?? 'demo-player',
        playerName: me?.displayName ?? 'Pixelina',
        points: 1240,
        isWin: true,
        livesRemaining: 2,
      },
      { playerId: 'bot-pink', playerName: BOT_NAMES['bot-pink'], points: 880, isWin: false, livesRemaining: 1 },
      { playerId: 'bot-cyan', playerName: BOT_NAMES['bot-cyan'], points: 640, isWin: false, livesRemaining: 0 },
      { playerId: 'bot-amber', playerName: BOT_NAMES['bot-amber'], points: 410, isWin: false, livesRemaining: 0 },
    ];
  }

  async leaderboard(): Promise<LeaderboardEntry[]> {
    await this.wait(120);
    const me = this.store.read()?.player;
    const entries: Omit<LeaderboardEntry, 'rank'>[] = [
      { playerId: me?.id ?? 'demo-player', name: me?.displayName ?? 'Pixelina', points: 4820, wins: 6, gamesPlayed: 9 },
      { playerId: 'bot-pink', name: 'Rosa', points: 3960, wins: 4, gamesPlayed: 11 },
      { playerId: 'bot-cyan', name: 'Cyan', points: 3115, wins: 3, gamesPlayed: 8 },
      { playerId: 'bot-amber', name: 'Ámbar', points: 2740, wins: 2, gamesPlayed: 10 },
      { playerId: 'local-1', name: 'Kiral', points: 1980, wins: 1, gamesPlayed: 6 },
    ];
    return entries
      .sort((a, b) => b.points - a.points || b.wins - a.wins)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  private wait(ms = 100): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
