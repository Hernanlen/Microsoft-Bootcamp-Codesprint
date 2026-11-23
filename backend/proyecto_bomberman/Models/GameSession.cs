namespace Bomberman.Api.Models;

public sealed class GameSession
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public int RoomId { get; init; }
    public GameSessionStatus Status { get; set; } = GameSessionStatus.Playing;
    public int? WinnerPlayerId { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset EndsAtUtc { get; set; } = DateTimeOffset.UtcNow.Add(GameDuration);
    public GameMap Map { get; init; } = new();
    public List<PlayerPosition> Players { get; init; } = [];
    public List<GameBomb> Bombs { get; init; } = [];
    public List<GameExplosion> Explosions { get; init; } = [];
    public List<GamePowerUp> PowerUps { get; init; } = [];

    public static readonly TimeSpan GameDuration = TimeSpan.FromMinutes(3);
}
