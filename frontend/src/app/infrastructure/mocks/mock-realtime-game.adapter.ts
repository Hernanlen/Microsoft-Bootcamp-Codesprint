import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, ReplaySubject, Subject, Subscription } from 'rxjs';
import {
  GameCommand,
  GameCommandRejection,
  GameConnectionState,
  GameSnapshot,
} from '../../core/game/game.models';
import { GamePort } from '../../core/game/game.port';
import { AUTH_SESSION_STORE } from '../storage/auth-session.store';
import { LocalGameSimulator } from './local-game.simulator';

@Injectable()
export class MockRealtimeGameAdapter implements GamePort {
  private readonly store = inject(AUTH_SESSION_STORE);
  private readonly simulator = new LocalGameSimulator();
  private readonly snapshots = new ReplaySubject<GameSnapshot>(1);
  private readonly connectionState = new BehaviorSubject<GameConnectionState>('disconnected');
  private readonly rejections = new Subject<GameCommandRejection>();
  private subscription: Subscription | null = null;

  readonly snapshots$ = this.snapshots.asObservable();
  readonly connection$ = this.connectionState.asObservable();
  readonly rejections$ = this.rejections.asObservable();

  start(gameId: string): void {
    const player = this.store.read()?.player;
    if (!player) {
      this.connectionState.next('failed');
      return;
    }
    this.stop();
    this.connectionState.next('connecting');
    setTimeout(() => {
      this.subscription = this.simulator.snapshots$.subscribe((snapshot) =>
        this.snapshots.next(snapshot),
      );
      this.simulator.start(player.id, gameId || 'demo-game');
      this.connectionState.next('connected');
    }, 350);
  }

  send(command: GameCommand, _commandId: string): void {
    if (this.connectionState.value !== 'connected') return;
    this.simulator.send(command);
  }

  reconnect(): void {
    this.start('demo-game');
  }

  stop(): void {
    this.simulator.stop();
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.connectionState.next('disconnected');
  }
}
