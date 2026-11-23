# **CHANGELOG · Bomberman Online (frontend)**

## **11 de noviembre de 2026 — funcionalidades para la demo**

Junto con el backend se integraron cinco funcionalidades nuevas. La regla de la casa se mantuvo: el servidor confirma todo el estado; el cliente solo renderiza (`specs/features/gameplay/spec.md`).

### **Cajas destructibles**

- El backend envía celdas `Crate = 2`; el adapter (`signalr-game.adapter.ts`) las mapea a `kind: 'crate'` vía `toCellKind`.
- El renderer ya las dibujaba (`drawWoodenCrate`); ahora se ven de verdad porque el backend genera el mapa con cajas.
- La onda expansiva destruye la primera caja y no la atraviesa (lógica server-side).

### **Power-ups**

- `core/game/game.models.ts`: `PowerUpKind` (`'extra-bomb' | 'extra-range' | 'extra-life'`), `PowerUpState` y `powerUps` en `GameSnapshot`; `PlayerState` suma `bombRange` y `maxActiveBombs`.
- `canvas-renderer.ts`: `drawPowerUp` dibuja ítems con paleta por tipo (naranja bomba, cian rango, rosa vida), flotación animada y letra distintiva (B / R / +).
- HUD (`game.html`): métricas BOMBAS (simultáneas) y ALCANCE (rango actual) del jugador.
- La recogida y sus límites (5 bombas, 6 rango, 6 vidas) los calcula el servidor.

### **Temporizador de partida**

- `GameSnapshot` suma `endsAtUtc`; el backend cierra la partida al vencer los 3 minutos.
- `game.ts`: cuenta regresiva local con intervalo de 1 s (`syncCountdown`), señal `timeLeft` y `timeLow` cuando quedan ≤ 30 s.
- HUD: el bloque del timer muestra ahora `MM:SS` real ("TIEMPO RESTANTE") con estilo de alerta pulsante (`.timer--low`).

### **Puntajes y ranking**

- Módulo nuevo `core/scores/` (`score.models.ts`, `score.repository.ts`, `score.facade.ts`) con adapter `infrastructure/api/http-score.repository.ts`, registrado como `SCORE_REPOSITORY` en `app.config.ts`.
- Contratos: `GET /api/games/{gameId}/scores` y `GET /api/leaderboard`.
- Página `/ranking` real (`leaderboard.ts/html`): carga, tabla con puesto, jugador, puntos, victorias y partidas, estados de carga, vacío y error con reintento.
- Tarjeta de fin de partida: muestra los puntajes de la partida y destaca al ganador con 🏆.

### **Repetir partida (volver a la sala)**

- `RoomRepository` suma `returnToWaiting(roomId)` → `POST /api/rooms/{roomId}/return-to-waiting`; `RoomFacade.returnToWaiting` lo expone y `RoomError` clasifica 409 "en curso" como `game-in-progress`.
- Tarjeta de fin de partida: botón "Volver a la sala" que navega a `/salas/:roomId` tras devolver la sala a `waiting`.

### **Tests y validación**

- Specs actualizados: `specs/contracts/signalr-events.md` (map con cajas, `powerUps`, `endsAtUtc`, `bombRange`/`maxActiveBombs`), `specs/features/leaderboard/spec.md` (contratos ya implementados) y nuevo `specs/features/gameplay/spec-crates-powerups-timer.md` (GAME-02).
- Tests existentes ajustados a la forma nueva de `GameSnapshot`/`PlayerState` y mocks de `ScoreFacade`/`RoomFacade` en `game.spec.ts`; mock de `returnToWaiting` en `room.facade.spec.ts`.
- Validación completa: 16/16 tests, ESLint limpio, Prettier OK y build OK.

### **Cómo probar el flujo demo**

1. Dos usuarios: registro → crear sala (anfitrión) → unirse por código → invitado "listo" → anfitrión inicia.
2. En `/juego`: mover con flechas/WASD, bomba con Espacio; romper cajas para encontrar power-ups; HUD con bombas, alcance y cuenta regresiva.
3. Al terminar: tarjeta con ganador, puntos de todos y "Volver a la sala" para repetir; `/ranking` muestra el leaderboard persistido.
