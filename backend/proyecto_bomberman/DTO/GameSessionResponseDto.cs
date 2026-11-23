namespace Bomberman.Api.DTO;

public sealed class GameSessionResponseDto
{
    public Guid Id { get; set; }
    public int RoomId { get; set; }
    public string Status { get; set; } = string.Empty;
    public int? WinnerPlayerId { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset EndsAtUtc { get; set; }
    public int[][] Map { get; set; } = [];
    public IReadOnlyList<PlayerPositionResponseDto> Players { get; set; } = [];
    public IReadOnlyList<GameBombResponseDto> Bombs { get; set; } = [];
    public IReadOnlyList<GameExplosionResponseDto> Explosions { get; set; } = [];
    public IReadOnlyList<GamePowerUpResponseDto> PowerUps { get; set; } = [];
}

public sealed class PlayerPositionResponseDto
{
    public int PlayerId { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public int Lives { get; set; }
    public bool IsAlive { get; set; }
    public int BombRange { get; set; } = 2;
    public int MaxActiveBombs { get; set; } = 1;
}

public sealed class GameBombResponseDto
{
    public Guid Id { get; set; }
    public int OwnerPlayerId { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public int Range { get; set; }
    public DateTimeOffset PlacedAtUtc { get; set; }
    public DateTimeOffset ExplodesAtUtc { get; set; }
}

public sealed class GameExplosionResponseDto
{
    public Guid Id { get; set; }
    public DateTimeOffset EndsAtUtc { get; set; }
    public IReadOnlyList<ExplosionCellResponseDto> Cells { get; set; } = [];
}

public sealed class ExplosionCellResponseDto
{
    public int X { get; set; }
    public int Y { get; set; }
}

public sealed class GamePowerUpResponseDto
{
    public Guid Id { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public string Kind { get; set; } = string.Empty;
}

public sealed class GameScoreResponseDto
{
    public Guid GameId { get; set; }
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public double Points { get; set; }
    public bool IsWin { get; set; }
    public int LivesRemaining { get; set; }
    public int SecondsRemaining { get; set; }
}

public sealed class LeaderboardEntryResponseDto
{
    public int Rank { get; set; }
    public int PlayerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Points { get; set; }
    public int Wins { get; set; }
    public int GamesPlayed { get; set; }
}
