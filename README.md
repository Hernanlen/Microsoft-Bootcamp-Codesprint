# Bomberman Online — Microsoft Bootcamp CodeSprint

Juego **Bomberman multijugador online** desarrollado durante el **Codesprint del bootcamp de Microsoft**. Es una aplicación *full stack*: el servidor es la fuente de verdad del estado de la partida y valida cada movimiento y bomba; el cliente dibuja el tablero en Canvas y recibe los cambios confirmados en tiempo real.

> Este repositorio reúne el **frontend y el backend** del proyecto, incluidas las carpetas de práctica de las sesiones del bootcamp. El código es el estado final de la demo (noviembre de 2026).

## Demo jugable

**https://hernanlen.github.io/Microsoft-Bootcamp-Codesprint/**

Versión jugable desplegada con GitHub Pages. Usa adaptadores locales (simulador + mocks) en lugar de la API, así que no necesita backend ni PostgreSQL: incluye bombas, cajas destructibles, power-ups, tres rivales controlados por IA, temporizador, puntajes y ranking.

- Usuario de prueba: `demo@bomberman.local`
- Contraseña: `demo1234`

El código de esta versión está en la rama `demo` y el sitio publicado en la rama `gh-pages`. La versión full stack con la API real permanece en `main`.

## Características

- **Autenticación** con JWT: registro, inicio de sesión y sesión persistida en el navegador.
- **Salas multijugador**: crear, listar, unirse por ID o por código, marcar jugadores como listos e iniciar la partida (solo el anfitrión).
- **Tiempo real con SignalR**: conexión, movimiento, bombas y estado de partida confirmados por el servidor, con aislamiento entre salas.
- **Mecánica de Bomberman**: mapa 9×9, muros, cajas destructibles, bombas con espoleta, explosiones en cruz que encadenan otras bombas y tres vidas por jugador.
- **Power-ups** al destruir cajas: más bombas simultáneas, más rango y vida extra.
- **Temporizador** de 3 minutos por partida; gana quien conserve más vidas (o el último jugador vivo).
- **Puntajes y leaderboard** persistentes: puntaje por partida, victorias y partidas jugadas, con top 20.
- **Repetir partida**: la sala vuelve al estado `waiting` conservando a sus participantes.
- **Interfaz responsive** con Angular Material, Signals y Canvas, con especificaciones y pruebas automatizadas.

## Stack

| Capa | Tecnologías |
|---|---|
| Frontend | Angular 21 (standalone + Signals), TypeScript estricto, Angular Material, Canvas API, `@microsoft/signalr`, RxJS, Vitest |
| Backend | .NET 10, ASP.NET Core, SignalR, Entity Framework Core, PostgreSQL, JWT, CORS |
| Documentación | Especificaciones `specs/`, OpenAPI, colección y entorno de Postman |

## Estructura

```text
.
├── frontend/                       # Cliente Angular (Bomberman Online)
│   ├── src/app/
│   │   ├── core/                   # Fachadas, modelos y puertos (dominio)
│   │   ├── features/               # welcome, auth, rooms, lobby, game, leaderboard
│   │   ├── infrastructure/         # Adaptadores HTTP, SignalR y almacenamiento
│   │   └── shared/                 # Componentes compartidos
│   ├── specs/                      # Requisitos, arquitectura, contratos y validación
│   └── scripts/                    # Configuración en runtime y verificación de integración
└── backend/                        # API .NET del juego
    ├── proyecto_bomberman/         # API final: Controllers, Hubs, Services, Models, Migrations
    ├── sesion 0/, sesion 1/, sesion 2/  # Ejercicios de las sesiones del bootcamp
    └── AGENTS.md                   # Guía detallada del backend y del estado de la demo
```

## Puesta en marcha

### 1. Backend

Requiere .NET SDK 10, PostgreSQL y la herramienta de migraciones.

```bash
cd backend/proyecto_bomberman
dotnet tool install --global dotnet-ef --version 10.0.13  # solo la primera vez
dotnet restore
dotnet ef database update
dotnet run
```

Escucha en `http://localhost:5271`. La API necesita dos valores de configuración que **no están incluidos en el repositorio**:

```bash
export ConnectionStrings__PostgreSQL="Host=localhost;Port=5432;Database=bomberman;Username=postgres;Password=TU_PASSWORD"
export Jwt__Key="UNA_CLAVE_DE_AL_MENOS_32_CARACTERES"
```

También puedes usar `dotnet user-secrets` en lugar de variables de entorno. Crea la base de datos `bomberman` antes de aplicar las migraciones.

### 2. Frontend

Requiere Node.js 24 y npm 11.

```bash
cd frontend
npm ci
cp .env.example .env   # ajusta las URLs si el backend no está en localhost:5271
npm start
```

Abre `http://localhost:4200`. El script `verify:backend` necesita además `BOMBERMAN_TEST_PASSWORD` en `.env` (contraseña de un usuario de prueba ya registrado).

## Verificación

```bash
cd frontend
npm run validate        # pruebas + lint + build + formato
npm run verify:backend  # integración real con el backend (requiere la API ejecutándose)
```

La colección `backend/proyecto_bomberman/Bomberman.postman_collection.json` y su entorno permiten probar los endpoints REST y el Hub desde Postman. Actualiza los valores `CHANGE_ME` del entorno con tus propias credenciales locales.

## API principal

- `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me`
- `POST /api/rooms` · `GET /api/rooms` · `POST /api/rooms/{id}/join` · `POST /api/rooms/join` · `PUT /api/rooms/{id}/ready` · `POST /api/rooms/{id}/return-to-waiting`
- `POST /api/games/{roomId}/start` · `GET /api/games/{gameId}` · `POST /api/games/{gameId}/move`
- `GET /api/games/{gameId}/scores` · `GET /api/leaderboard`
- SignalR `/hubs/game`: `JoinGame`, `MovePlayer`, `PlaceBomb`; eventos `PlayerConnected`, `PlayerDisconnected`, `PlayerMoved`, `GameStateUpdated`, `CommandRejected`.

La documentación completa del contrato está en `frontend/specs/contracts/` y en `backend/proyecto_bomberman/INTEGRACION_FRONTEND.md`.

## Estado y limitaciones conocidas

- El estado de las partidas en curso vive en memoria: se pierde si se reinicia el servidor. Las salas, los puntajes y los jugadores son persistentes.
- `PlayersController`, `UsuariosController` y `BombsController` son heredados sin autenticación; `BombService`/`BombsController` son un stub legacy que el juego no utiliza.
- Al desconectarse un jugador se notifica el evento, pero no se lo retira de la partida.
- El frontend clasifica algunos errores 403/409 según el texto del mensaje del backend (contrato frágil).
- El README de `frontend/` describe un estado anterior: bombas, explosiones, puntajes y leaderboard ya están implementados en el backend y consumidos por el cliente.

## Origen

Proyecto desarrollado en el marco del Codesprint del bootcamp de Microsoft, a partir de los repositorios `ArielM457/Bootcamp-CodeSprint-Backend` y `ArielM457/Bootcamp---Frontend--BMN`. Esta copia incluye el trabajo final de la demo y sustituye las credenciales locales por marcadores `CHANGE_ME`.
