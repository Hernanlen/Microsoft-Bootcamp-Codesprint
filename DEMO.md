# Modo demo (despliegue estático)

Esta rama contiene el frontend con adaptadores locales (mocks + simulador) en lugar de HTTP/SignalR, para poder jugar sin backend ni PostgreSQL.

- Usuario de prueba: `demo@bomberman.local`
- Contraseña: `demo1234`
- También puedes registrar un jugador nuevo: se guarda solo en este navegador.

El flujo disponible es: inicio de sesión → sala → iniciar partida → partida con 3 rivales controlados por IA, bombas, cajas, power-ups, temporizador, puntajes y ranking simulados.

La lógica del servidor real sigue en la rama `main` (`backend/proyecto_bomberman`).
