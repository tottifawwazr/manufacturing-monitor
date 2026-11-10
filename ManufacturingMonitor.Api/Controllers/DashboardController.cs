
using ManufacturingMonitor.Api.Data;
using ManufacturingMonitor.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ManufacturingMonitor.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    private IQueryable<ProductionLog> FilterLogs(
        DateOnly? startDate,
        DateOnly? endDate,
        string? productionLine)
    {
        var query = _context.ProductionLogs.AsNoTracking();

        if (startDate.HasValue)
            query = query.Where(x =>
                x.ProductionDate >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(x =>
                x.ProductionDate <= endDate.Value);

        if (!string.IsNullOrWhiteSpace(productionLine))
        {
            var line = productionLine.Trim();
            query = query.Where(x =>
                x.ProductionLine == line);
        }

        return query;
    }

    // GET: api/dashboard/summary
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate,
        [FromQuery] string? productionLine)
    {
        if (startDate > endDate)
            return BadRequest(new
            {
                message = "Start date cannot exceed end date."
            });

        var totals = await FilterLogs(
                startDate, endDate, productionLine)
            .GroupBy(x => 1)
            .Select(g => new
            {
                RecordCount = g.Count(),
                SimulatedRecordCount = g.Count(x => x.Notes != null && x.Notes.StartsWith(DemoProductionSeeder.NotePrefix)),
                TotalProduction = g.Sum(x => (long)x.ActualUnits),
                TotalTarget = g.Sum(x => (long)x.TargetUnits),
                TotalDefects = g.Sum(x => (long)x.DefectUnits),
                TotalDowntimeMinutes =
                    g.Sum(x => (long)x.DowntimeMinutes)
            })
            .SingleOrDefaultAsync();

        var production = totals?.TotalProduction ?? 0;
        var target = totals?.TotalTarget ?? 0;
        var defects = totals?.TotalDefects ?? 0;

        return Ok(new
        {
            recordCount = totals?.RecordCount ?? 0,
            simulatedRecordCount = totals?.SimulatedRecordCount ?? 0,
            totalProduction = production,
            totalTarget = target,
            totalDefects = defects,
            totalDowntimeMinutes =
                totals?.TotalDowntimeMinutes ?? 0,
            targetAchievement = target > 0
                ? Math.Round(100.0 * production / target, 2)
                : 0,
            defectRate = production > 0
                ? Math.Round(100.0 * defects / production, 2)
                : (double?)null
        });
    }

    // GET: api/dashboard/trend
    [HttpGet("trend")]
    public async Task<IActionResult> GetTrend(
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate,
        [FromQuery] string? productionLine)
    {
        if (startDate > endDate)
            return BadRequest(new
            {
                message = "Start date cannot exceed end date."
            });

        var data = await FilterLogs(
                startDate, endDate, productionLine)
            .GroupBy(x => x.ProductionDate)
            .Select(g => new
            {
                date = g.Key,
                target = g.Sum(x => (long)x.TargetUnits),
                actual = g.Sum(x => (long)x.ActualUnits),
                defects = g.Sum(x => (long)x.DefectUnits)
            })
            .OrderBy(x => x.date)
            .ToListAsync();

        return Ok(data);
    }

    // GET: api/dashboard/lines
    [HttpGet("lines")]
    public async Task<IActionResult> GetLinePerformance(
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate,
        [FromQuery] string? productionLine)
    {
        if (startDate > endDate)
            return BadRequest(new
            {
                message = "Start date cannot exceed end date."
            });

        var data = await FilterLogs(
                startDate, endDate, productionLine)
            .GroupBy(x => x.ProductionLine)
            .Select(g => new
            {
                productionLine = g.Key,
                target = g.Sum(x => (long)x.TargetUnits),
                actual = g.Sum(x => (long)x.ActualUnits),
                defects = g.Sum(x => (long)x.DefectUnits),
                downtimeMinutes =
                    g.Sum(x => (long)x.DowntimeMinutes)
            })
            .OrderBy(x => x.productionLine)
            .ToListAsync();

        var result = data.Select(x => new
        {
            x.productionLine,
            x.target,
            x.actual,
            x.defects,
            x.downtimeMinutes,
            achievement = x.target > 0
                ? Math.Round(100.0 * x.actual / x.target, 2)
                : 0,
            defectRate = x.actual > 0
                ? Math.Round(100.0 * x.defects / x.actual, 2)
                : (double?)null
        });

        return Ok(result);
    }
}
