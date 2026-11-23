using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bomberman.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddScoresPowerUpsAndTimer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "partidas_jugadas",
                table: "players",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "victorias",
                table: "players",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "game_scores",
                columns: table => new
                {
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    player_id = table.Column<int>(type: "integer", nullable: false),
                    player_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    points = table.Column<double>(type: "double precision", nullable: false),
                    is_win = table.Column<bool>(type: "boolean", nullable: false),
                    lives_remaining = table.Column<int>(type: "integer", nullable: false),
                    seconds_remaining = table.Column<int>(type: "integer", nullable: false),
                    registered_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_game_scores", x => new { x.game_id, x.player_id });
                });

            migrationBuilder.CreateIndex(
                name: "IX_game_scores_player_id",
                table: "game_scores",
                column: "player_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "game_scores");

            migrationBuilder.DropColumn(
                name: "partidas_jugadas",
                table: "players");

            migrationBuilder.DropColumn(
                name: "victorias",
                table: "players");
        }
    }
}
