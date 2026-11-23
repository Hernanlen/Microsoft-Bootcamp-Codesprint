# **GAME-02 · Cajas, power-ups, temporizador y repetición de partida**

Estado: integrado el 11 de noviembre de 2026 con el backend (migración `AddScoresPowerUpsAndTimer`).

Como jugador quiero un mapa con cajas destructibles, power-ups, un tiempo límite y poder repetir partida en la misma sala.

## **Requisitos**

- El mapa incluye celdas `Crate = 2` en las posiciones libres que no rodean los puntos de aparición.
- Las explosiones destruyen la primera caja que encuentran y no atraviesan más celdas detrás de ella.
- Al destruir una caja existe un 45% de probabilidad de que aparezca un power-up con `kind` `ExtraBomb`, `ExtraRange` o `ExtraLife`.
- Recoger un power-up ocurre al moverse a su casilla: bomba extra suma `maxActiveBombs` (límite 5), rango suma `bombRange` (límite 6) y vida suma `lives` (límite 6).
- Cada jugador inicia con alcance 2 y una bomba activa. Las bombas usan el `bombRange` del dueño.
- La partida dura 3 minutos: `endsAtUtc` llega en cada estado, el HUD muestra la cuenta regresiva y el servidor cierra la partida al vencer el plazo; si hay empate en vidas, no hay ganador.
- El HUD muestra bombas simultáneas y alcance actual del jugador.
- Al terminar la partida, la tarjeta de resultado muestra los puntajes de `/api/games/{gameId}/scores` y un botón "Volver a la sala" que llama `POST /api/rooms/{roomId}/return-to-waiting` y navega a la sala en espera.
- Los puntajes de la partida se registran una sola vez y actualizan `puntaje`, `victorias` y `partidas_jugadas` del jugador.

Depende de GAME-01, SCORE-01 y el contrato de SignalR actualizado.
