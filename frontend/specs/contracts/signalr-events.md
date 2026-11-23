# **Contrato SignalR validado**

Estado: validado contra el backend de la sesión 08 y ampliado el 11 de noviembre de 2026 con cajas destructibles, power-ups y temporizador. Ruta: `/hubs/game`. La conexión presenta el JWT mediante `accessTokenFactory`.

## **Métodos disponibles**

- `JoinGame(gameId)`: valida el JWT y la pertenencia del jugador antes de agregar la conexión al grupo de la sala.
- `MovePlayer(direction, commandId)`: acepta `up`, `down`, `left` o `right`. El servidor calcula y valida la posición; al pisar un power-up, el jugador lo recoge automáticamente.
- `PlaceBomb(commandId)`: coloca una bomba en la posición confirmada del jugador. Admite hasta `maxActiveBombs` bombas activas por jugador (inicia en 1, sube con el power-up de bomba extra).

## **Eventos disponibles**

- `PlayerConnected(playerId)`.
- `PlayerDisconnected(playerId)`.
- `PlayerMoved(playerId, x, y)`.
- `GameStateUpdated(gameState)`, con `id`, `roomId`, `status`, `winnerPlayerId`, `map`, `players`, `bombs`, `explosions`, `powerUps`, `startedAtUtc` y `endsAtUtc`.
- `CommandRejected(commandId, message)`: informa al cliente que una acción normal no pudo aplicarse. Chocar con paredes, bombas o bordes no genera una excepción del Hub.

## **Novedades del estado**

- El mapa incluye celdas `Crate = 2`: cajas destructibles que bloquean el movimiento y detienen la explosión sin dejarla pasar.
- `players` incluye `bombRange` (alcance actual de sus bombas) y `maxActiveBombs`.
- `powerUps` lista los items sobre el mapa con `kind`: `ExtraBomb`, `ExtraRange` o `ExtraLife`.
- `endsAtUtc` es la hora de cierre de la partida: el servidor termina la partida al vencer el plazo (3 minutos) y define ganador por mayor cantidad de vidas.

## **Límites actuales**

El backend no ofrece `RequestSnapshot` ni `RestartGame`. Al reconectar, el cliente vuelve a ejecutar `JoinGame`, que envía el estado actual disponible.
