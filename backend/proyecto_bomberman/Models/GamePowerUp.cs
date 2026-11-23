namespace Bomberman.Api.Models;

public enum PowerUpKind
{
    ExtraBomb = 0,
    ExtraRange = 1,
    ExtraLife = 2
}

public sealed class GamePowerUp
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public int X { get; init; }
    public int Y { get; init; }
    public PowerUpKind Kind { get; init; }
}
