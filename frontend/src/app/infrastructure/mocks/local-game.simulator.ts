import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  BombState,
  Cell,
  Direction,
  ExplosionState,
  GameCommand,
  GamePhase,
  GameSnapshot,
  PlayerState,
  PowerUpKind,
  PowerUpState,
} from '../../core/game/game.models';

const WIDTH = 13;
const HEIGHT = 11;
const FUSE_MS = 2000;
const EXPLOSION_MS = 650;
const MATCH_MS = 3 * 60 * 1000;
const HUMAN_COOLDOWN_MS = 180;
const BOT_COOLDOWN_MS = 520;

interface Point {
  x: number;
  y: number;
}

@Injectable()
export class LocalGameSimulator {
  private readonly subject = new BehaviorSubject<GameSnapshot>(this.emptySnapshot());
  readonly snapshots$ = this.subject.asObservable();

  private timer: ReturnType<typeof setInterval> | null = null;
  private playerId = '';
  private gameId = '';
  private lastMoveAt = 0;
  private lastBotMoveAt = 0;
  private botBombAt = 0;

  start(playerId: string, gameId: string): void {
    this.stop();
    this.playerId = playerId;
    this.gameId = gameId;
    this.lastMoveAt = 0;
    this.lastBotMoveAt = 0;
    this.botBombAt = Date.now() + 1500;
    this.subject.next(this.initialSnapshot());
    this.timer = setInterval(() => this.tick(), 80);
  }

  send(command: GameCommand): void {
    const snapshot = this.current();
    if (snapshot.phase !== 'running') return;
    const player = snapshot.players.find((item) => item.playerId === this.playerId);
    if (!player?.isAlive) return;

    const now = Date.now();
    if (command.type === 'place-bomb') {
      this.placeBomb(snapshot, player, now);
      return;
    }
    if (now - this.lastMoveAt < HUMAN_COOLDOWN_MS) return;
    this.move(snapshot, player, command.direction, now);
    this.lastMoveAt = now;
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  private current(): GameSnapshot {
    return structuredClone(this.subject.value);
  }

  private emit(snapshot: GameSnapshot): void {
    snapshot.version += 1;
    this.subject.next(snapshot);
  }

  private tick(): void {
    const snapshot = this.current();
    if (snapshot.phase !== 'running') return;
    const now = Date.now();
    let changed = false;

    if (now >= Date.parse(snapshot.endsAtUtc ?? '')) {
      this.finishByTime(snapshot);
      this.emit(snapshot);
      this.stop();
      return;
    }

    const detonating = snapshot.bombs.filter((bomb) => Date.parse(bomb.explodesAtUtc) <= now);
    for (const bomb of detonating) {
      snapshot.bombs = snapshot.bombs.filter((item) => item.id !== bomb.id);
      this.explode(snapshot, bomb, now);
      changed = true;
    }

    const activeExplosions = snapshot.explosions.filter(
      (explosion) => Date.parse(explosion.endsAtUtc) > now,
    );
    if (activeExplosions.length !== snapshot.explosions.length) {
      snapshot.explosions = activeExplosions;
      changed = true;
    }

    for (const bomb of [...snapshot.bombs]) {
      if (
        snapshot.explosions.some((explosion) =>
          explosion.cells.some((cell) => cell.x === bomb.x && cell.y === bomb.y),
        )
      ) {
        bomb.explodesAtUtc = new Date(now).toISOString();
      }
    }

    if (now - this.lastBotMoveAt >= BOT_COOLDOWN_MS) {
      this.moveBots(snapshot, now);
      this.lastBotMoveAt = now;
      changed = true;
    }

    const alive = snapshot.players.filter((player) => player.isAlive);
    if (alive.length <= 1) {
      snapshot.phase = 'finished';
      snapshot.winnerPlayerId = alive[0]?.playerId;
      this.emit(snapshot);
      this.stop();
      return;
    }

    if (changed) this.emit(snapshot);
  }

  private move(
    snapshot: GameSnapshot,
    player: PlayerState,
    direction: Direction,
    _now: number,
  ): void {
    const delta: Point = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    }[direction];
    const target = { x: player.x + delta.x, y: player.y + delta.y };
    if (!this.isFree(snapshot, target)) return;

    player.x = target.x;
    player.y = target.y;

    const index = snapshot.powerUps.findIndex(
      (power) => power.x === target.x && power.y === target.y,
    );
    if (index >= 0) {
      const [power] = snapshot.powerUps.splice(index, 1);
      this.applyPowerUp(player, power.kind);
    }
    this.emit(snapshot);
  }

  private isFree(snapshot: GameSnapshot, point: Point): boolean {
    const cell = snapshot.cells.find((item) => item.x === point.x && item.y === point.y);
    if (!cell || cell.kind !== 'floor') return false;
    if (snapshot.bombs.some((bomb) => bomb.x === point.x && bomb.y === point.y)) return false;
    if (
      snapshot.players.some(
        (player) => player.isAlive && player.x === point.x && player.y === point.y,
      )
    )
      return false;
    return true;
  }

  private placeBomb(snapshot: GameSnapshot, player: PlayerState, now: number): void {
    const active = snapshot.bombs.filter(
      (bomb) => bomb.ownerPlayerId === player.playerId,
    ).length;
    if (active >= player.maxActiveBombs) return;
    if (snapshot.bombs.some((bomb) => bomb.x === player.x && bomb.y === player.y)) return;

    const bomb: BombState = {
      id: this.id(),
      ownerPlayerId: player.playerId,
      x: player.x,
      y: player.y,
      range: player.bombRange,
      placedAtUtc: new Date(now).toISOString(),
      explodesAtUtc: new Date(now + FUSE_MS).toISOString(),
    };
    snapshot.bombs.push(bomb);
    this.emit(snapshot);
  }

  private explode(snapshot: GameSnapshot, bomb: BombState, now: number): void {
    const cells: Point[] = [{ x: bomb.x, y: bomb.y }];
    for (const delta of [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]) {
      for (let step = 1; step <= bomb.range; step++) {
        const point = { x: bomb.x + delta.x * step, y: bomb.y + delta.y * step };
        const cell = snapshot.cells.find((item) => item.x === point.x && item.y === point.y);
        if (!cell || cell.kind === 'wall') break;
        cells.push(point);
        if (cell.kind === 'crate') {
          cell.kind = 'floor';
          if (Math.random() < 0.45) this.spawnPowerUp(snapshot, point);
          break;
        }
      }
    }

    const explosion: ExplosionState = {
      id: this.id(),
      cells,
      endsAtUtc: new Date(now + EXPLOSION_MS).toISOString(),
    };
    snapshot.explosions.push(explosion);

    snapshot.powerUps = snapshot.powerUps.filter(
      (power) => !cells.some((cell) => cell.x === power.x && cell.y === power.y),
    );

    for (const player of snapshot.players) {
      if (!player.isAlive || !cells.some((cell) => cell.x === player.x && cell.y === player.y))
        continue;
      player.lives -= 1;
      if (player.lives <= 0) {
        player.lives = 0;
        player.isAlive = false;
      } else {
        const spawn = this.spawnFor(player.playerId);
        player.x = spawn.x;
        player.y = spawn.y;
      }
    }
  }

  private spawnPowerUp(snapshot: GameSnapshot, point: Point): void {
    if (snapshot.powerUps.some((power) => power.x === point.x && power.y === point.y)) return;
    const kinds: PowerUpKind[] = ['extra-bomb', 'extra-range', 'extra-life'];
    const powerUp: PowerUpState = {
      id: this.id(),
      x: point.x,
      y: point.y,
      kind: kinds[Math.floor(Math.random() * kinds.length)] ?? 'extra-range',
    };
    snapshot.powerUps.push(powerUp);
  }

  private applyPowerUp(player: PlayerState, kind: PowerUpKind): void {
    if (kind === 'extra-bomb') player.maxActiveBombs = Math.min(5, player.maxActiveBombs + 1);
    if (kind === 'extra-range') player.bombRange = Math.min(6, player.bombRange + 1);
    if (kind === 'extra-life') player.lives = Math.min(6, player.lives + 1);
  }

  private moveBots(snapshot: GameSnapshot, now: number): void {
    for (const bot of snapshot.players) {
      if (bot.playerId === this.playerId || !bot.isAlive) continue;
      const directions: Direction[] = ['up', 'down', 'left', 'right'];
      const options = directions.filter((direction) => {
        const deltas: Record<Direction, Point> = {
          up: { x: 0, y: -1 },
          down: { x: 0, y: 1 },
          left: { x: -1, y: 0 },
          right: { x: 1, y: 0 },
        };
        const delta = deltas[direction];
        return this.isFree(snapshot, { x: bot.x + delta.x, y: bot.y + delta.y });
      });
      if (options.length === 0) continue;
      const direction = options[Math.floor(Math.random() * options.length)] ?? options[0];
      const power = snapshot.powerUps.find(
        (item) =>
          Math.abs(item.x - bot.x) + Math.abs(item.y - bot.y) <= 3 &&
          this.isFree(snapshot, { x: item.x, y: item.y }),
      );
      if (
        power &&
        Math.abs(power.x - bot.x) + Math.abs(power.y - bot.y) === 1 &&
        snapshot.powerUps.some((item) => item.id === power.id)
      ) {
        bot.x = power.x;
        bot.y = power.y;
        snapshot.powerUps = snapshot.powerUps.filter((item) => item.id !== power.id);
        this.applyPowerUp(bot, power.kind);
        continue;
      }
      const deltaMap: Record<Direction, Point> = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
      };
      const delta = deltaMap[direction];
      bot.x += delta.x;
      bot.y += delta.y;

      if (now > this.botBombAt && Math.random() < 0.22) {
        this.placeBomb(snapshot, bot, now);
        this.botBombAt = now + 1800;
      }
    }
  }

  private finishByTime(snapshot: GameSnapshot): void {
    const ranked = [...snapshot.players].sort((a, b) => b.lives - a.lives);
    const top = ranked[0];
    const tie = ranked.length > 1 && top && ranked[1] && ranked[1].lives === top.lives;
    snapshot.phase = 'finished';
    snapshot.winnerPlayerId = tie || !top?.isAlive ? undefined : top.playerId;
  }

  private initialSnapshot(): GameSnapshot {
    const cells: Cell[] = [];
    const safe = new Set(['1,1', '2,1', '1,2', '11,9', '10,9', '11,8', '1,9', '2,9', '1,8', '11,1', '10,1', '11,2']);
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const wall =
          x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1 || (x % 2 === 0 && y % 2 === 0);
        const crate = !wall && !safe.has(`${x},${y}`) && Math.random() < 0.45;
        cells.push({ x, y, kind: wall ? 'wall' : crate ? 'crate' : 'floor' });
      }
    }

    const player = (id: string, name: string, spawn: Point, color: number): PlayerState => ({
      playerId: id,
      x: spawn.x,
      y: spawn.y,
      lives: id === this.playerId ? 3 : 2,
      isAlive: true,
      bombRange: id === this.playerId ? 2 : 2,
      maxActiveBombs: id === this.playerId ? 1 : 1,
    });

    const snapshot: GameSnapshot = {
      gameId: this.gameId,
      roomId: 'demo-room-1',
      version: 1,
      phase: 'running',
      width: WIDTH,
      height: HEIGHT,
      cells,
      players: [
        player(this.playerId, 'Tú', { x: 1, y: 1 }, 0),
        player('bot-pink', 'Rosa', { x: 11, y: 9 }, 1),
        player('bot-cyan', 'Cyan', { x: 11, y: 1 }, 2),
        player('bot-amber', 'Ámbar', { x: 1, y: 9 }, 3),
      ],
      bombs: [],
      explosions: [],
      powerUps: [],
      endsAtUtc: new Date(Date.now() + MATCH_MS).toISOString(),
    };
    return snapshot;
  }

  private emptySnapshot(): GameSnapshot {
    return {
      gameId: 'empty',
      roomId: 'empty',
      version: 0,
      phase: 'waiting' as GamePhase,
      width: WIDTH,
      height: HEIGHT,
      cells: [],
      players: [],
      bombs: [],
      explosions: [],
      powerUps: [],
    };
  }

  private spawnFor(playerId: string): Point {
    if (playerId === this.playerId) return { x: 1, y: 1 };
    if (playerId === 'bot-pink') return { x: 11, y: 9 };
    if (playerId === 'bot-cyan') return { x: 11, y: 1 };
    return { x: 1, y: 9 };
  }

  private id(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  }
}
