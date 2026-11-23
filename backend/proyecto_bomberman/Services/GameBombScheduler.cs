using Bomberman.Api.DTO;
using Bomberman.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace Bomberman.Api.Services;

public sealed class GameBombScheduler(
    IServiceScopeFactory scopeFactory,
    IHubContext<GameHub> hubContext,
    ILogger<GameBombScheduler> logger)
{
    public void Schedule(Guid gameId, int roomId, Guid bombId, DateTimeOffset explodesAtUtc)
    {
        _ = RunBombAsync(gameId, roomId, bombId, explodesAtUtc);
    }

    public void ScheduleTimeout(Guid gameId, int roomId, DateTimeOffset endsAtUtc)
    {
        _ = RunTimeoutAsync(gameId, roomId, endsAtUtc);
    }

    private async Task RunBombAsync(
        Guid gameId,
        int roomId,
        Guid bombId,
        DateTimeOffset explodesAtUtc)
    {
        try
        {
            var delay = explodesAtUtc - DateTimeOffset.UtcNow;
            if (delay > TimeSpan.Zero) await Task.Delay(delay);

            using var scope = scopeFactory.CreateScope();
            var gameService = scope.ServiceProvider.GetRequiredService<GameService>();
            var result = gameService.ExplodeBomb(gameId, bombId);
            if (!result.Updated || result.Game is null || result.ExplosionId is null) return;

            await BroadcastAsync(roomId, result.Game);
            if (result.Game.Status == Models.GameSessionStatus.Finished)
            {
                await RegisterScoresAsync(scope, result.Game);
            }

            await Task.Delay(GameService.ExplosionDuration);

            var game = gameService.RemoveExplosion(gameId, result.ExplosionId.Value);
            if (game is not null) await BroadcastAsync(roomId, game);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "No se pudo procesar la explosión de la bomba {BombId}.", bombId);
        }
    }

    private async Task RunTimeoutAsync(Guid gameId, int roomId, DateTimeOffset endsAtUtc)
    {
        try
        {
            var delay = endsAtUtc - DateTimeOffset.UtcNow;
            if (delay > TimeSpan.Zero) await Task.Delay(delay);

            using var scope = scopeFactory.CreateScope();
            var gameService = scope.ServiceProvider.GetRequiredService<GameService>();
            var result = gameService.FinishByTimeout(gameId);
            if (result.Status == Enums.FinishGameStatus.GameNotFound || result.Game is null) return;

            await BroadcastAsync(roomId, result.Game);
            if (result.Status == Enums.FinishGameStatus.Success)
            {
                await RegisterScoresAsync(scope, result.Game);
            }
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "No se pudo cerrar la partida {GameId} por tiempo.", gameId);
        }
    }

    private async Task RegisterScoresAsync(IServiceScope scope, Models.GameSession game)
    {
        try
        {
            var scoreService = scope.ServiceProvider.GetRequiredService<GameScoreService>();
            await scoreService.RegisterAsync(game);
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "No se pudieron registrar los puntajes de la partida {GameId}.",
                game.Id);
        }
    }

    private Task BroadcastAsync(int roomId, Models.GameSession game)
    {
        return hubContext.Clients
            .Group($"room-{roomId}")
            .SendAsync("GameStateUpdated", GameSessionMapper.ToResponse(game));
    }
}
