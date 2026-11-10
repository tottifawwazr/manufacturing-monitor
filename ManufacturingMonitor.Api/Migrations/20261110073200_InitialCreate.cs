using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ManufacturingMonitor.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProductionLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ProductionDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    ProductionLine = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Shift = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    TargetUnits = table.Column<int>(type: "INTEGER", nullable: false),
                    ActualUnits = table.Column<int>(type: "INTEGER", nullable: false),
                    DefectUnits = table.Column<int>(type: "INTEGER", nullable: false),
                    DowntimeMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionLogs", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductionLogs");
        }
    }
}
