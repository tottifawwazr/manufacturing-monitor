using System.Data;
using ManufacturingMonitor.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ManufacturingMonitor.Api.Data;

/// <summary>Opt-in, deterministic development fixtures. Never invoked by normal startup.</summary>
public static class DemoProductionSeeder
{
    public const string NotePrefix = "[SIMULATED MPMS-DEMO-20261110-v1:";
    public static readonly DateOnly ReferenceDate = new(2026, 11, 10);
    public const int DayCount = 14;

    public sealed record SeedResult(int Planned, int Inserted, int Skipped);

    public static async Task<SeedResult> SeedAsync(AppDbContext context, IHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
            throw new InvalidOperationException("Demo seeding is available only in the Development environment.");

        if ((await context.Database.GetPendingMigrationsAsync()).Any())
            throw new InvalidOperationException("Apply the existing EF migrations before running the demo seeder.");

        // Serialize the read/check/insert operation in SQLite, including concurrent seed commands.
        await using var transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var existing = await context.ProductionLogs.AsNoTracking()
            .Select(x => new { x.ProductionDate, x.ProductionLine, x.Shift, x.Notes })
            .ToListAsync();
        var occupied = existing.Select(x => Slot(x.ProductionDate, x.ProductionLine, x.Shift)).ToHashSet();
        var notes = existing.Where(x => x.Notes != null).Select(x => x.Notes!).ToList();
        var planned = Generate().ToList();
        var inserted = 0;

        foreach (var record in planned)
        {
            var slot = Slot(record.ProductionDate, record.ProductionLine, record.Shift);
            var recordNotes = record.Notes!;
            var marker = recordNotes[..(recordNotes.IndexOf(']') + 1)];
            // Preserve occupied slots regardless of origin. Also recognize a seed moved to another slot.
            if (occupied.Contains(slot) || notes.Any(note => note.Contains(marker, StringComparison.Ordinal))) continue;
            context.ProductionLogs.Add(record);
            occupied.Add(slot);
            inserted++;
        }

        await context.SaveChangesAsync();
        await transaction.CommitAsync();
        return new SeedResult(planned.Count, inserted, planned.Count - inserted);
    }

    private static (DateOnly, string, string) Slot(DateOnly date, string line, string shift) =>
        (date, line.Trim().ToUpperInvariant(), shift.Trim().ToUpperInvariant());

    public static IEnumerable<ProductionLog> Generate()
    {
        string[] lines = ["Line A", "Line B", "Line C"];
        string[] processes = ["Robotic Stamping", "Laser Welding", "Surface Treatment"];
        string[] shifts = ["Morning", "Afternoon"];
        int[] baseTargets = [2400, 2200, 1800];
        int[] baseAchievement = [9800, 9450, 8950]; // basis points: A generally outperforms B, then C.
        string[] recoveryNotes = [
            "Robotic feed alignment and a die reset reduced available stamping time.",
            "Laser focus calibration and fixture changeover reduced welding output.",
            "Bath temperature recovery and additional coating inspection extended cycle times."
        ];

        for (var day = 0; day < DayCount; day++)
        for (var line = 0; line < lines.Length; line++)
        for (var shift = 0; shift < shifts.Length; shift++)
        {
            var date = ReferenceDate.AddDays(day - DayCount + 1);
            var variation = (day * 7 + shift * 13 + line * 11) % 11;
            var target = baseTargets[line] + ((day * 3 + shift) % 5) * (line == 2 ? 100 : 50);
            var achievement = baseAchievement[line] + variation * 50;
            var outlier = (day * 2 + line * 5 + shift) % 17 == 0;
            if (outlier) achievement = new[] { 9300, 8900, 8500 }[line] + day % 4 * 50;
            var actual = (target * achievement + 5000) / 10000;
            var defectBasisPoints = line switch
            {
                0 => 50 + (day * 3 + shift * 7) % 8 * 10,
                1 => 100 + (day * 3 + shift * 7) % 11 * 10,
                _ => 160 + (day * 3 + shift * 7) % 15 * 10
            };
            var downtime = outlier ? 60 + (day * 3 + line + shift) % 26
                : Math.Clamp((10300 - achievement) / 50 + (day + shift * 9) % 13 - 8, 0, 45);
            var remark = achievement < 9500 ? recoveryNotes[line]
                : achievement < 10000 ? "Minor setup adjustments and routine quality checks reduced output slightly."
                    : "Planned output achieved with stable cycles and routine quality sampling.";
            var marker = $"{NotePrefix}{date:yyyy-MM-dd}:{line}:{shift}]";

            yield return new ProductionLog
            {
                ProductionDate = date,
                ProductionLine = lines[line],
                Shift = shifts[shift],
                TargetUnits = target,
                ActualUnits = actual,
                DefectUnits = (actual * defectBasisPoints + 5000) / 10000,
                DowntimeMinutes = downtime,
                Notes = $"{marker} SIMULATED manufacturing data — {processes[line]}. {remark}"
            };
        }
    }
}
