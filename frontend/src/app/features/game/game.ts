import {
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Direction } from '../../core/game/game.models';
import { GameFacade } from '../../core/game/game.facade';
import { GameInputController } from '../../core/game/game-input.controller';
import { RoomFacade } from '../../core/rooms/room.facade';
import { ScoreFacade } from '../../core/scores/score.facade';
import { CanvasRenderer } from './canvas-renderer';

@Component({
  selector: 'app-game',
  imports: [RouterLink],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class Game implements OnInit, OnDestroy {
  private readonly movementRepeatMs = 220;
  private board: ElementRef<HTMLCanvasElement> | null = null;
  private readonly pressedDirections = new Map<string, Direction>();
  private activeMovementKey: string | null = null;
  private movementTimer: ReturnType<typeof setInterval> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private readonly timeLeftState = signal<number | null>(null);

  @ViewChild('board')
  private set boardElement(board: ElementRef<HTMLCanvasElement> | undefined) {
    this.board = board ?? null;
    this.renderSnapshot();
  }
  readonly game = inject(GameFacade);
  readonly scores = inject(ScoreFacade);
  private readonly roomFacade = inject(RoomFacade);
  private readonly input = inject(GameInputController);
  private readonly renderer = inject(CanvasRenderer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly timeLeft = this.timeLeftState.asReadonly();
  readonly timeLow = signal(false);

  constructor() {
    effect(() => {
      const snapshot = this.game.snapshot();
      if (snapshot) {
        this.renderSnapshot();
        this.syncCountdown(snapshot.endsAtUtc);
      }
    });
    effect(() => {
      const snapshot = this.game.snapshot();
      if (snapshot?.phase === 'finished') {
        void this.scores.loadGameScores(snapshot.gameId);
      }
    });
  }

  ngOnInit(): void {
    const gameId = this.route.snapshot.queryParamMap.get('gameId') ?? '';
    this.scores.clearGameScores();
    this.game.start(gameId);
  }
  ngOnDestroy(): void {
    this.stopMovement();
    this.stopCountdown();
    this.renderer.reset();
    this.game.stop();
  }

  @HostListener('window:keydown', ['$event'])
  handleKey(event: KeyboardEvent): void {
    const command = this.input.fromKey(event);
    if (!command) return;
    event.preventDefault();
    if (command.type === 'place-bomb') {
      if (!event.repeat) this.game.send(command);
      return;
    }

    const keyId = event.code || event.key.toLowerCase();
    if (event.repeat || this.pressedDirections.has(keyId)) return;
    this.pressedDirections.set(keyId, command.direction);
    this.activeMovementKey = keyId;

    if (this.movementTimer === null) {
      this.game.send(command);
      this.movementTimer = setInterval(() => this.repeatMovement(), this.movementRepeatMs);
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent): void {
    const keyId = event.code || event.key.toLowerCase();
    if (!this.pressedDirections.delete(keyId)) return;
    if (this.activeMovementKey === keyId) {
      this.activeMovementKey = [...this.pressedDirections.keys()].at(-1) ?? null;
    }
    if (this.pressedDirections.size === 0) this.stopMovement();
  }

  @HostListener('window:blur')
  handleWindowBlur(): void {
    this.stopMovement();
  }

  move(direction: Direction): void {
    this.game.send({ type: 'move', direction });
  }

  placeBomb(): void {
    this.game.send({ type: 'place-bomb' });
  }

  async returnToMenu(): Promise<void> {
    await this.router.navigate(['/menu']);
  }

  async returnToRoom(): Promise<void> {
    const roomId = this.game.snapshot()?.roomId;
    const returned = await this.roomFacade.returnToWaiting(roomId);
    if (returned && roomId) {
      await this.router.navigate(['/salas', roomId]);
      return;
    }
    await this.router.navigate(['/salas']);
  }

  formatTime(seconds: number | null): string {
    if (seconds === null) return '--:--';
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  }

  private syncCountdown(endsAtUtc: string | undefined): void {
    if (!endsAtUtc) {
      this.stopCountdown();
      this.timeLeftState.set(null);
      this.timeLow.set(false);
      return;
    }

    const endTime = Date.parse(endsAtUtc);
    if (Number.isNaN(endTime)) {
      this.stopCountdown();
      this.timeLeftState.set(null);
      return;
    }

    const tick = (): void => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000);
      const safeRemaining = Math.max(0, remaining);
      this.timeLeftState.set(safeRemaining);
      this.timeLow.set(safeRemaining <= 30 && safeRemaining > 0);
      if (safeRemaining <= 0) this.stopCountdown();
    };

    tick();
    if (this.countdownTimer === null) {
      this.countdownTimer = setInterval(tick, 1000);
    }
  }

  private stopCountdown(): void {
    if (this.countdownTimer !== null) clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  }

  private renderSnapshot(): void {
    const snapshot = this.game.snapshot();
    const canvas = this.board?.nativeElement;
    if (snapshot && canvas) this.renderer.render(canvas, snapshot);
  }

  private repeatMovement(): void {
    const direction = this.activeMovementKey
      ? this.pressedDirections.get(this.activeMovementKey)
      : undefined;
    if (!direction || !this.game.controlsEnabled()) {
      this.stopMovement();
      return;
    }
    this.game.send({ type: 'move', direction });
  }

  private stopMovement(): void {
    if (this.movementTimer !== null) clearInterval(this.movementTimer);
    this.movementTimer = null;
    this.activeMovementKey = null;
    this.pressedDirections.clear();
  }
}
