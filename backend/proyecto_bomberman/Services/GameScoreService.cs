using Bomberman.Api.Data;
using Bomberman.Api.Enums;
using Bomberman.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Bomberman.Api.Services;

public sealed class GameScoreService(BombermanDbContext dbContext)
{
    public const double WinBasePoints = 1000;
    public const double WinPointsPerLife = 100;
    public const double WinPointsPerSecond = 5;
    public const double LossBasePoints = 100;
    public const double LossPointsPerLife = 50;

    public async Task<List<GameScore>> GetByGameAsync(Guid gameId, CancellationToken cancellationToken)
    {
        return await dbContext.GameScores
            .AsNoTracking()
            .Where(score => score.GameId == gameId)
            .OrderByDescending(score => score.Points)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<LeaderboardEntry>> GetLeaderboardAsync(int limit, CancellationToken cancellationToken)
    {
        return await dbContext.Players
            .AsNoTracking()
            .Where(player => player.partidas_jugadas > 0)
            .OrderByDescending(player => player.puntaje)
            .ThenByDescending(player => player.victorias)
            .ThenBy(player => player.Nombre)            .Take(limit)
            .Select(player => new LeaderboardEntry(
                player.Id,
                player.Nombre,
                player.puntaje,
                player.victorias,
                player.partidas_jugadas))
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> RegisterAsync(GameSession game, CancellationToken cancellationToken = default)
    {
        var rows = BuildRows(game);
        if (rows.Count == 0)
        {
            return false;
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var existing = await dbContext.GameScores
            .Where(score => score.GameId == game.Id)
            .Select(score => score.PlayerId)
            .ToListAsync(cancellationToken);
        if (existing.Count > 0)
        {
            await transaction.RollbackAsync(cancellationToken);
            return false;
        }

        var playerIds = rows.Select(row => row.PlayerId).ToList();
        var players = await dbContext.Players
            .Where(player => playerIds.Contains(player.Id))
            .ToDictionaryAsync(player => player.Id, cancellationToken);

        foreach (var row in rows)
        {
            row.PlayerName = players.TryGetValue(row.PlayerId, out var foundPlayer)
                ? foundPlayer.Nombre
                : $"Jugador {row.PlayerId}";
            dbContext.GameScores.Add(row);
            if (players.TryGetValue(row.PlayerId, out var player))
            {
                player.puntaje += row.Points;
                player.partidas_jugadas += 1;
                if (row.IsWin) player.victorias += 1;
            }
        }

        var room = await dbContext.GameRooms
            .FirstOrDefaultAsync(item => item.Id == game.RoomId, cancellationToken);
        if (room is not null && room.Status != GameRoomStatus.Finished)
        {
            room.Status = GameRoomStatus.Finished;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        try
        {
            await transaction.CommitAsync(cancellationToken);
        }
        catch (Exception exception) when (
            exception.InnerException is Npgsql.PostgresException { SqlState: "23505" } ||
            exception is Npgsql.PostgresException { SqlState: "23505" })
        {
            // Otro hilo registró los puntajes de esta partida: ya existe, no duplicamos.
            await transaction.RollbackAsync(cancellationToken);
            return false;
        }

        return true;
    }

    private static List<GameScore> BuildRows(GameSession game)
    {
        var now = DateTimeOffset.UtcNow;
        var secondsRemaining = (int)Math.Max(
            0,
            Math.Floor((game.EndsAtUtc - now).TotalSeconds));

        return game.Players.Select(player => new GameScore
            {
                GameId = game.Id,
                PlayerId = player.PlayerId,
                LivesRemaining = player.Lives,
                SecondsRemaining = secondsRemaining,
                IsWin = game.WinnerPlayerId == player.PlayerId,
                Points = game.WinnerPlayerId == player.PlayerId
                    ? WinBasePoints
                      + WinPointsPerLife * player.Lives
                      + WinPointsPerSecond * secondsRemaining
                    : LossBasePoints + LossPointsPerLife * player.Lives
            })
            .ToList();
    }
}

public sealed record LeaderboardEntry(
    int PlayerId,
    string Name,
    double Points,
    int Wins,
    int GamesPlayed);
