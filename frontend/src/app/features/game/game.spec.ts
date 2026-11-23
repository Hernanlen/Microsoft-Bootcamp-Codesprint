import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { GameFacade } from '../../core/game/game.facade';
import { GameSnapshot } from '../../core/game/game.models';
import { GameInputController } from '../../core/game/game-input.controller';
import { RoomFacade } from '../../core/rooms/room.facade';
import { ScoreFacade } from '../../core/scores/score.facade';
import { CanvasRenderer } from './canvas-renderer';
import { Game } from './game';

describe('Game carga del Canvas', () => {
  let fixture: ComponentFixture<Game>;
  const snapshot = signal<GameSnapshot | null>(null);
  const connection = signal<'connecting' | 'connected'>('connecting');
  const player = signal({ playerId: '1', x: 0, y: 0, lives: 3, isAlive: true });
  const controlsEnabled = signal(false);
  const game = {
    snapshot,
    connection,
    rejection: signal(null),
    controlsEnabled,
    player,
    activeOpponents: signal(0),
    finished: signal(false),
    resultMessage: signal('La partida finalizó'),
    start: vi.fn(),
    stop: vi.fn(),
    send: vi.fn(),
    reconnect: vi.fn(),
  };
  const renderer = { render: vi.fn(), reset: vi.fn() };
  const input = { fromKey: vi.fn() };
  const scores = {
    gameScores: signal([]),
    isLoading: signal(false),
    error: signal(null),
    status: signal('idle'),
    leaderboard: signal([]),
    loadLeaderboard: vi.fn(),
    loadGameScores: vi.fn(),
    clearGameScores: vi.fn(),
  };
  const roomFacade = { returnToWaiting: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    snapshot.set(null);
    connection.set('connecting');
    controlsEnabled.set(false);
    await TestBed.configureTestingModule({
      imports: [Game],
      providers: [
        provideRouter([]),
        { provide: GameFacade, useValue: game },
        { provide: GameInputController, useValue: input },
        { provide: CanvasRenderer, useValue: renderer },
        { provide: ScoreFacade, useValue: scores },
        { provide: RoomFacade, useValue: roomFacade },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => 'game-1' } } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Game);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('muestra carga antes del snapshot y renderiza cuando el Canvas ya existe', async () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Preparando partida');
    expect(renderer.render).not.toHaveBeenCalled();

    const state: GameSnapshot = {
      gameId: 'game-1',
      roomId: '1',
      version: 1,
      phase: 'running',
      width: 2,
      height: 2,
      cells: [
        { x: 0, y: 0, kind: 'floor' },
        { x: 1, y: 0, kind: 'floor' },
        { x: 0, y: 1, kind: 'floor' },
        { x: 1, y: 1, kind: 'floor' },
      ],
      players: [
        { playerId: '1', x: 0, y: 0, lives: 3, isAlive: true, bombRange: 2, maxActiveBombs: 1 },
      ],
      bombs: [],
      explosions: [],
      powerUps: [],
    };
    snapshot.set(state);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(renderer.render).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), state);
  });

  it('repite el movimiento con una pausa corta mientras la tecla sigue presionada', () => {
    vi.useFakeTimers();
    controlsEnabled.set(true);
    input.fromKey.mockReturnValue({ type: 'move', direction: 'right' });
    const component = fixture.componentInstance;
    const keyDown = new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight' });

    component.handleKey(keyDown);
    expect(game.send).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(219);
    expect(game.send).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(game.send).toHaveBeenCalledTimes(2);

    component.handleKeyUp(new KeyboardEvent('keyup', { key: 'ArrowRight', code: 'ArrowRight' }));
    vi.advanceTimersByTime(440);
    expect(game.send).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
