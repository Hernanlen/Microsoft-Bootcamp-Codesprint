export interface GameScore {
  playerId: string;
  playerName: string;
  points: number;
  isWin: boolean;
  livesRemaining: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  points: number;
  wins: number;
  gamesPlayed: number;
}

export type ScoreErrorCode = 'not-found' | 'unavailable';

export class ScoreError extends Error {
  constructor(
    readonly code: ScoreErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ScoreError';
  }
}
