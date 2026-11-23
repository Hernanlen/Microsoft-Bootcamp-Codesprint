namespace Bomberman.Api.Models;

public sealed class GameScore
{
    public Guid GameId { get; set; }
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public double Points { get; set; }
    public bool IsWin { get; set; }
    public int LivesRemaining { get; set; }
    public int SecondsRemaining { get; set; }
    public DateTimeOffset RegisteredAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
