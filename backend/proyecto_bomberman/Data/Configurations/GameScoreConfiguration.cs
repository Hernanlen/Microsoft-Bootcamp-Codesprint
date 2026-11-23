using Bomberman.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Bomberman.Api.Data.Configurations;

public sealed class GameScoreConfiguration : IEntityTypeConfiguration<GameScore>
{
    public void Configure(EntityTypeBuilder<GameScore> builder)
    {
        builder.ToTable("game_scores");

        builder.HasKey(score => new { score.GameId, score.PlayerId });

        builder.Property(score => score.GameId)
            .HasColumnName("game_id");

        builder.Property(score => score.PlayerId)
            .HasColumnName("player_id");

        builder.Property(score => score.PlayerName)
            .HasColumnName("player_name")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(score => score.Points)
            .HasColumnName("points");

        builder.Property(score => score.IsWin)
            .HasColumnName("is_win");

        builder.Property(score => score.LivesRemaining)
            .HasColumnName("lives_remaining");

        builder.Property(score => score.SecondsRemaining)
            .HasColumnName("seconds_remaining");

        builder.Property(score => score.RegisteredAtUtc)
            .HasColumnName("registered_at_utc");

        builder.HasIndex(score => score.PlayerId);
    }
}
