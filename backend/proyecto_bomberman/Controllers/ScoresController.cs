using Bomberman.Api.DTO;
using Bomberman.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Bomberman.Api.Controllers;

[Authorize]
[ApiController]
public sealed class ScoresController(GameScoreService scoreService) : ControllerBase
{
    [HttpGet("api/games/{gameId:guid}/scores")]
    [ProducesResponseType<IReadOnlyList<GameScoreResponseDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<GameScoreResponseDto>>> GetGameScores(
        Guid gameId,
        CancellationToken cancellationToken)
    {
        var scores = await scoreService.GetByGameAsync(gameId, cancellationToken);
        if (scores.Count == 0)
        {
            return NotFound(new { message = "Esta partida todavía no tiene puntajes registrados." });
        }

        return Ok(scores.Select(score => new GameScoreResponseDto
            {
                GameId = score.GameId,
                PlayerId = score.PlayerId,
                PlayerName = score.PlayerName,
                Points = score.Points,
                IsWin = score.IsWin,
                LivesRemaining = score.LivesRemaining,
                SecondsRemaining = score.SecondsRemaining
            })
            .ToList());
    }

    [HttpGet("api/leaderboard")]
    [ProducesResponseType<IReadOnlyList<LeaderboardEntryResponseDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<LeaderboardEntryResponseDto>>> GetLeaderboard(
        CancellationToken cancellationToken)
    {
        var entries = await scoreService.GetLeaderboardAsync(20, cancellationToken);
        var rank = 0;
        return Ok(entries
            .Select(entry => new LeaderboardEntryResponseDto
            {
                Rank = ++rank,
                PlayerId = entry.PlayerId,
                Name = entry.Name,
                Points = entry.Points,
                Wins = entry.Wins,
                GamesPlayed = entry.GamesPlayed
            })
            .ToList());
    }
}
