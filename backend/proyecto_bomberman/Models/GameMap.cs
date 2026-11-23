namespace Bomberman.Api.Models;

public enum MapCell
{
    Free = 0,
    Wall = 1,
    Crate = 2
}

public sealed class GameMap
{
    public const int Size = 9;

    public MapCell[][] Cells { get; init; } = CreateInitialCells();

    public bool IsInside(int x, int y)
    {
        return x >= 0 && x < Size && y >= 0 && y < Size;
    }

    public bool IsFree(int x, int y)
    {
        return IsInside(x, y) && Cells[y][x] == MapCell.Free;
    }

    public void DestroyCrate(int x, int y)
    {
        if (IsInside(x, y) && Cells[y][x] == MapCell.Crate)
        {
            Cells[y][x] = MapCell.Free;
        }
    }

    private static MapCell[][] CreateInitialCells()
    {
        bool InBounds(int x, int y) => x >= 0 && x < Size && y >= 0 && y < Size;

        var cells = new MapCell[Size][]
        {
            [
                MapCell.Wall, MapCell.Wall, MapCell.Wall, MapCell.Wall, MapCell.Wall, MapCell.Wall, MapCell.Wall, MapCell.Wall, MapCell.Wall
            ],
            [
                MapCell.Wall, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Wall
            ],
            [
                MapCell.Wall, MapCell.Free, MapCell.Wall, MapCell.Free, MapCell.Wall, MapCell.Free, MapCell.Wall, MapCell.Free, MapCell.Wall
            ],
            [
                MapCell.Wall, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Wall
            ],
            [
                MapCell.Wall, MapCell.Free, MapCell.Wall, MapCell.Free, MapCell.Wall, MapCell.Free, MapCell.Wall, MapCell.Free, MapCell.Wall
            ],
            [
                MapCell.Wall, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Wall
            ],
            [
                MapCell.Wall, MapCell.Free, MapCell.Wall, MapCell.Free, MapCell.Wall, MapCell.Free, MapCell.Wall, MapCell.Free, MapCell.Wall
            ],
            [
                MapCell.Wall, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Free, MapCell.Wall
            ],
            [
                MapCell.Wall, MapCell.Wall, MapCell.Wall, MapCell.Wall, MapCell.Wall, MapCell.Wall, MapCell.Wall, MapCell.Wall, MapCell.Wall
            ]
        };

        foreach (var position in SpawnPositions)
        {
            cells[position.Y][position.X] = MapCell.Free;
        }

        foreach (var position in SpawnPositions)
        {
            foreach (var (deltaX, deltaY) in new[] { (0, -1), (0, 1), (-1, 0), (1, 0) })
            {
                var x = position.X + deltaX;
                var y = position.Y + deltaY;
                if (InBounds(x, y) && cells[y][x] != MapCell.Wall)
                {
                    cells[y][x] = MapCell.Free;
                }
            }
        }

        foreach (var row in cells)
        {
            for (var x = 0; x < Size; x += 1)
            {
                if (row[x] == MapCell.Free) row[x] = MapCell.Crate;
            }
        }

        foreach (var position in SpawnPositions)
        {
            cells[position.Y][position.X] = MapCell.Free;
            foreach (var (deltaX, deltaY) in new[] { (0, -1), (0, 1), (-1, 0), (1, 0) })
            {
                var x = position.X + deltaX;
                var y = position.Y + deltaY;
                if (InBounds(x, y) && cells[y][x] != MapCell.Wall)
                {
                    cells[y][x] = MapCell.Free;
                }
            }
        }

        return cells;
    }

    private static readonly (int X, int Y)[] SpawnPositions =
    [
        (1, 1),
        (7, 7),
        (7, 1),
        (1, 7),
        (3, 1),
        (5, 7),
        (5, 1),
        (3, 7)
    ];
}
