# **AGENTS · Bootcamp CodeSprint — Backend Bomberman**

Guía completa del proyecto: qué es, cómo está armado, cómo ejecutarlo y qué funcionalidades se agregaron el 11 de noviembre de 2026 para la demo.

---

## **1. Qué es este proyecto**

Bomberman multijugador online para el Codesprint del bootcamp. Dos repositorios que trabajan juntos:

| Repo | Carpeta local | Rol |
|---|---|---|
| `ArielM457/Bootcamp-CodeSprint-Backend` | `/home/gatocosmico/Desktop/Codesprint/Bootcamp-CodeSprint-Backend` | API .NET 10 + SignalR + PostgreSQL |
| `ArielM457/Bootcamp---Frontend--BMN` | `/home/gatocosmico/Desktop/Codesprint/Bootcamp---Frontend--BMN` | Cliente Angular 21 (standalone + Signals) |

El backend es la fuente de verdad del estado multijugador: valida cada movimiento y bomba, y confirma el estado por SignalR. El frontend nunca simula vidas, bombas, explosiones, tiempo, ganador ni puntaje (`specs/features/gameplay/spec.md` del frontend).

## **2. Cómo ejecutarlo**

### **Backend** (dentro de `proyecto_bomberman/`)

```bash
dotnet restore
dotnet ef migrations add <Nombre>
dotnet ef database update
dotnet run
```

- Escucha en `http://localhost:5271`.
- Requiere `Jwt:Key` (≥ 32 caracteres) vía Secret Manager o variable de entorno.
- PostgreSQL: base `bomberman`, usuario `postgres`, conexión en `appsettings.json` con la contraseña configurada localmente (no incluida en el repositorio).
- Herramienta de migraciones: `dotnet tool install --global dotnet-ef --version 10.0.13`.

### **Frontend** (raíz del repo)

```bash
npm install
npm start
```

- Escucha en `http://localhost:4200`.
- Requiere `.env` en la raíz:

```env
BOMBERMAN_API_URL=http://localhost:5271
BOMBERMAN_HUB_URL=http://localhost:5271/hubs/game
```

## **3. Estructura del backend**

```text
proyecto_bomberman/
├── Controllers/
│   ├── AuthController.cs          # POST /api/auth/register, /login, GET /me
│   ├── GameRoomsController.cs     # Salas: crear, listar, unirse, ready, return-to-waiting
│   ├── GamesController.cs         # Iniciar partida, obtener partida, mover (REST)
│   ├── ScoresController.cs        # (NUEVO) Puntajes por partida y leaderboard
│   ├── PlayersController.cs       # CRUD players (sin uso por el frontend, sin auth)
│   ├── UsuariosController.cs      # CRUD usuarios (sin uso por el frontend, sin auth)
│   └── BombsController.cs         # Stub legacy en memoria (no conectado al juego)
├── Hubs/GameHub.cs                # SignalR /hubs/game
├── Services/
│   ├── GameService.cs             # Núcleo del juego (estado en memoria)
│   ├── GameBombScheduler.cs       # Explosiones programadas + cierre por tiempo
│   ├── GameRoomService.cs         # Salas persistentes en PostgreSQL
│   ├── GameScoreService.cs        # (NUEVO) Fórmula SCORE-01 y ranking
│   ├── AuthService.cs             # JWT + PasswordHasher
│   ├── PlayerService.cs / UsuarioService.cs
│   └── BombService.cs             # Stub legacy
├── Models/                        # GameSession, GameMap, GameBomb, GamePowerUp, GameScore, Player...
├── Data/                          # BombermanDbContext + Configurations/
├── DTO/                           # DTOs + GameSessionMapper
├── Enums/GameStatus.cs            # Result records de las operaciones
└── Migrations/                    # Última: 20261110230913_AddScoresPowerUpsAndTimer
```

## **4. Contratos principales**

### **REST**

- `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` (JWT Bearer; claim `player_id`).
- `POST /api/rooms` · `GET /api/rooms` (disponibles) · `GET /api/rooms/{id}` · `POST /api/rooms/{id}/join` · `POST /api/rooms/join` (por código) · `PUT /api/rooms/{id}/ready`.
- `POST /api/rooms/{id}/return-to-waiting` (NUEVO): vuelve la sala a `waiting` conservando participantes; anfitrión queda listo y los demás no. 409 si la partida sigue en curso.
- `POST /api/games/{roomId}/start` (solo anfitrión, ≥ 2 jugadores, todos listos) · `GET /api/games/{gameId}` · `POST /api/games/{gameId}/move`.
- `GET /api/games/{gameId}/scores` (NUEVO): puntajes registrados de la partida; 404 si aún no existen.
- `GET /api/leaderboard` (NUEVO): top 20 por puntos, victorias y nombre. Devuelve `rank`, `playerId`, `name`, `points`, `wins`, `gamesPlayed`.

### **SignalR `/hubs/game`** (JWT por query string `access_token`)

Métodos: `JoinGame(gameId)`, `MovePlayer(direction, commandId)`, `PlaceBomb(commandId)`.
Eventos: `PlayerConnected`, `PlayerDisconnected`, `PlayerMoved`, `GameStateUpdated`, `CommandRejected`.

`GameStateUpdated` incluye: `id`, `roomId`, `status`, `winnerPlayerId`, `map` (0 libre, 1 muro, 2 caja), `players` (con `bombRange` y `maxActiveBombs`), `bombs`, `explosions`, `powerUps`, `startedAtUtc`, `endsAtUtc`.

## **5. Lógica del juego**

- Mapa 9×9 fijo. Interior con muros en coordenadas pares y **cajas destructibles** en el resto, excepto las casillas de aparición y sus vecinas.
- Movimiento: 1 celda por paso, cooldown de 180 ms; bloquean muros, cajas y bombas.
- Bombas: fuse de 2 s, rango del dueño (inicia 2). Máximo simultáneo por jugador: inicia 1, sube con power-ups.
- Explosión: cruz hasta el rango; **la primera caja se destruye y la onda no atraviesa**; encadena otras bombas (BFS); 650 ms de duración visual.
- **Power-ups**: al destruir una caja, 45% de probabilidad de aparición con kind `ExtraBomb` (+1 bomba simultánea, límite 5), `ExtraRange` (+1 rango, límite 6) o `ExtraLife` (+1 vida, límite 6). Se recogen al moverse a su casilla.
- **Temporizador**: 3 minutos por partida (`endsAtUtc`). Al vencer, `GameBombScheduler` cierra la partida; ganador = mayor cantidad de vidas (empate = sin ganador).
- Fin también cuando queda ≤ 1 jugador vivo. Explosiones posteriores al fin no aplican daño.
- Estado de partida en memoria (`ConcurrentDictionary` estático): se pierde al reiniciar el servidor; salas y puntajes son persistentes.

## **6. Cambios del 11 de noviembre de 2026 (para la demo)**

1. **Cajas destructibles** (`MapCell.Crate = 2`): generación segura para spawns, destrucción por explosión y bloqueo de la onda.
2. **Power-ups** (`Models/GamePowerUp.cs`): aparición, recogida en `Move`, atributos `BombRange` y `MaxActiveBombs` en `PlayerPosition`.
3. **Temporizador de partida** (`GameSession.EndsAtUtc`, 3 min): cierre programado por `GameBombScheduler.ScheduleTimeout` con broadcast final.
4. **Puntajes persistentes** (`Models/GameScore.cs`, tabla `game_scores`, clave `(game_id, player_id)` que impide duplicados): al terminar la partida se registran los puntajes con la fórmula SCORE-01, se suman a `players.puntaje`, `players.victorias` y `players.partidas_jugadas`, y la sala pasa a `finished`.
5. **Endpoints de puntaje** (`Controllers/ScoresController.cs`): `/api/games/{gameId}/scores` y `/api/leaderboard`.
6. **Repetir partida**: `GameRoomService.ReturnToWaitingAsync` + endpoint `POST /api/rooms/{id}/return-to-waiting`, con limpieza de la partida en memoria.
7. **Migración** `AddScoresPowerUpsAndTimer`: columnas `victorias` y `partidas_jugadas` en `players` y tabla `game_scores`.

Validado de punta a punta con una partida simulada (dos clientes SignalR): mapa con cajas, power-up `ExtraRange` en juego, fin de partida, puntaje del ganador 1955 (1000 + 100×1 vida + 5×171 s), ranking ordenado y sala devuelta a `waiting`.

## **7. Pendientes y deudas conocidas**

- `PlayersController`, `UsuariosController` y `BombsController` no tienen `[Authorize]` y el frontend no los usa. `BombsController` + `BombService` son un stub legacy (candidatos a eliminarse).
- `OnDisconnectedAsync` notifica `PlayerDisconnected` pero no retira al jugador de la partida.
- El estado de la partida vive en memoria: un reinicio pierde partidas en curso (los puntajes ya registrados persisten).
- No hay `RequestSnapshot` ni `RestartGame` en el Hub (documentado en el contrato del frontend).
- El frontend clasifica algunos errores 403/409 por texto del mensaje del backend: contrato frágil.

## **8. Notas del entorno local**

- PostgreSQL 18 en Debian: la conexión por TCP exige contraseña; configura la del rol `postgres` con la variable `ConnectionStrings__PostgreSQL` o con `dotnet user-secrets`.
- Node 24 + npm 11, .NET SDK 10.0.403.
