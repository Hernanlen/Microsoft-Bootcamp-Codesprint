import { inject, Injectable } from '@angular/core';
import { CreateRoomRequest, Room, RoomError } from '../../core/rooms/room.models';
import { RoomRepository } from '../../core/rooms/room.repository';
import { AUTH_SESSION_STORE } from '../storage/auth-session.store';

@Injectable()
export class MockRoomRepository implements RoomRepository {
  private readonly store = inject(AUTH_SESSION_STORE);
  private readonly rooms = new Map<string, Room>([
    [
      'demo-room-1',
      {
        id: 'demo-room-1',
        code: 'DEMO01',
        name: 'Explosión Rosa',
        status: 'waiting',
        hostPlayerId: 'demo-player',
        maxPlayers: 4,
        participants: [
          { id: 'demo-player', displayName: 'Pixelina', isReady: true },
          { id: 'bot-pink', displayName: 'Rosa', isReady: true },
        ],
      },
    ],
    [
      'demo-room-2',
      {
        id: 'demo-room-2',
        code: 'DEMO02',
        name: 'Sala Nocturna',
        status: 'waiting',
        hostPlayerId: 'bot-blue',
        maxPlayers: 2,
        participants: [{ id: 'bot-blue', displayName: 'Cyan', isReady: false }],
      },
    ],
  ]);

  async list(): Promise<Room[]> {
    await this.wait();
    return [...this.rooms.values()].map((room) => this.copy(room));
  }

  async get(roomId: string): Promise<Room> {
    await this.wait(60);
    return this.copy(this.find(roomId));
  }

  async create(request: CreateRoomRequest): Promise<Room> {
    await this.wait();
    const player = this.player();
    const room: Room = {
      id: this.id(),
      code: this.code(),
      name: request.name.trim(),
      status: 'waiting',
      hostPlayerId: player.id,
      maxPlayers: request.maxPlayers,
      participants: [{ id: player.id, displayName: player.displayName, isReady: true }],
    };
    this.rooms.set(room.id, room);
    return this.copy(room);
  }

  async joinById(roomId: string): Promise<Room> {
    await this.wait();
    return this.join(this.find(roomId));
  }

  async joinByCode(code: string): Promise<Room> {
    await this.wait();
    const room = [...this.rooms.values()].find(
      (candidate) => candidate.code.toLowerCase() === code.trim().toLowerCase(),
    );
    if (!room) throw new RoomError('not-found', 'No existe una sala con ese código.');
    return this.join(room);
  }

  async setReady(roomId: string, isReady: boolean): Promise<Room> {
    await this.wait(80);
    const room = this.find(roomId);
    const participant = room.participants.find((item) => item.id === this.player().id);
    if (!participant) throw new RoomError('not-member', 'No perteneces a esta sala.');
    participant.isReady = isReady;
    return this.copy(room);
  }

  async start(roomId: string): Promise<Room> {
    await this.wait(120);
    const room = this.find(roomId);
    if (room.hostPlayerId !== this.player().id) {
      throw new RoomError('not-host', 'Solo el anfitrión puede iniciar la partida.');
    }
    if (room.status !== 'waiting') throw new RoomError('not-waiting', 'La sala no está disponible.');
    if (room.participants.length < 2) {
      throw new RoomError('not-enough-players', 'Se necesitan al menos dos jugadores.');
    }
    if (room.participants.some((item) => !item.isReady)) {
      throw new RoomError('players-not-ready', 'Todos deben estar listos.');
    }
    room.status = 'playing';
    room.gameId = this.id();
    for (const bot of ['bot-pink', 'bot-blue', 'bot-orange']) {
      if (room.participants.length >= room.maxPlayers) break;
      if (room.participants.some((item) => item.id === bot)) continue;
      room.participants.push({
        id: bot,
        displayName: { 'bot-pink': 'Rosa', 'bot-blue': 'Cyan', 'bot-orange': 'Ámbar' }[bot] ?? 'Rival',
        isReady: true,
      });
    }
    return this.copy(room);
  }

  async returnToWaiting(roomId: string): Promise<Room> {
    await this.wait(80);
    const room = this.find(roomId);
    room.status = 'waiting';
    room.gameId = undefined;
    room.participants.forEach((item) => (item.isReady = item.id === room.hostPlayerId));
    return this.copy(room);
  }

  private join(room: Room): Room {
    if (room.status !== 'waiting') throw new RoomError('not-waiting', 'La partida ya comenzó.');
    if (room.participants.length >= room.maxPlayers) {
      throw new RoomError('full', 'La sala está llena.');
    }
    const player = this.player();
    if (room.participants.some((item) => item.id === player.id)) return this.copy(room);
    room.participants.push({
      id: player.id,
      displayName: player.displayName,
      isReady: false,
    });
    return this.copy(room);
  }

  private player() {
    const session = this.store.read();
    if (!session) throw new RoomError('invalid-data', 'Inicia sesión para continuar.');
    return session.player;
  }

  private find(roomId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new RoomError('not-found', 'No se encontró la sala.');
    return room;
  }

  private copy(room: Room): Room {
    return structuredClone(room);
  }

  private wait(ms = 100): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private id(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  }

  private code(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }
}
