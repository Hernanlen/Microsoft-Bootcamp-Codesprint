namespace Bomberman.Api.Models;

public sealed class PlayerPosition
{
    public const int InitialLives = 3;
    public const int InitialBombRange = 2;
    public const int InitialMaxActiveBombs = 1;
    public const int MaxBombRange = 6;
    public const int MaxActiveBombsLimit = 5;
    public const int MaxLivesLimit = 6;

    public int PlayerId { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public int Lives { get; set; } = InitialLives;
    public bool IsAlive { get; set; } = true;
    public DateTimeOffset LastMovedAtUtc { get; set; } = DateTimeOffset.MinValue;
    public int BombRange { get; set; } = InitialBombRange;
    public int MaxActiveBombs { get; set; } = InitialMaxActiveBombs;
}
