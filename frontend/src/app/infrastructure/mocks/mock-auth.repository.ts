import { inject, Injectable } from '@angular/core';
import {
  AuthError,
  AuthErrorCode,
  AuthSession,
  LoginRequest,
  Player,
  RegisterRequest,
} from '../../core/auth/auth.models';
import { AuthRepository } from '../../core/auth/auth.repository';
import { AUTH_SESSION_STORE } from '../storage/auth-session.store';

interface LocalAccount {
  email: string;
  password: string;
  player: Player;
}

const DEMO_EMAIL = 'demo@bomberman.local';
const DEMO_PASSWORD = 'demo1234';

@Injectable()
export class MockAuthRepository implements AuthRepository {
  private readonly store = inject(AUTH_SESSION_STORE);
  private readonly accounts = new Map<string, LocalAccount>([
    [
      DEMO_EMAIL,
      {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        player: { id: 'demo-player', displayName: 'Pixelina', avatarId: 'violet' },
      },
    ],
  ]);

  async register(request: RegisterRequest): Promise<AuthSession> {
    await this.wait();
    const email = request.email.trim().toLowerCase();
    if (this.accounts.has(email)) this.fail('duplicate-email', 'Ese correo ya está registrado.');
    if (!request.displayName.trim() || !request.password.trim()) {
      this.fail('invalid-data', 'Completa todos los campos.');
    }
    const account: LocalAccount = {
      email,
      password: request.password,
      player: { id: this.id(), displayName: request.displayName.trim(), avatarId: 'azure' },
    };
    this.accounts.set(email, account);
    return this.sessionFor(account);
  }

  async login(request: LoginRequest): Promise<AuthSession> {
    await this.wait();
    const account = this.accounts.get(request.email.trim().toLowerCase());
    if (!account || account.password !== request.password) {
      this.fail('invalid-credentials', 'Correo o contraseña incorrectos.');
    }
    return this.sessionFor(account);
  }

  async restoreSession(): Promise<AuthSession | null> {
    await this.wait(80);
    return this.store.read();
  }

  async logout(): Promise<void> {
    this.store.clear();
  }

  private sessionFor(account: LocalAccount): AuthSession {
    const session: AuthSession = {
      accessToken: `demo-token-${this.id()}`,
      expiresAtUtc: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      player: account.player,
    };
    this.store.save(session);
    return session;
  }

  private fail(code: AuthErrorCode, message: string): never {
    throw new AuthError(code, message);
  }

  private wait(ms = 180): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private id(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  }
}
