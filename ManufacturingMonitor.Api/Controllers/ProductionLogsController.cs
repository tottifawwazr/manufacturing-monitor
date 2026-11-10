
using ManufacturingMonitor.Api.Data;
using ManufacturingMonitor.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ManufacturingMonitor.Api.Controllers;

[ApiController]
[Route("api/productionlogs")]
public class ProductionLogsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductionLogsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/productionlogs
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductionLog>>> GetAll()
    {
        return await _context.ProductionLogs
            .AsNoTracking()
            .OrderByDescending(x => x.ProductionDate)
            .ThenByDescending(x => x.Id)
            .ToListAsync();
    }

    // GET: api/productionlogs/1
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductionLog>> GetById(int id)
    {
        var log = await _context.ProductionLogs.FindAsync(id);

        if (log == null)
            return NotFound();

        return log;
    }

    // POST: api/productionlogs
    [HttpPost]
    public async Task<ActionResult<ProductionLog>> Create(
        ProductionLog log)
    {
        if (log.DefectUnits > log.ActualUnits)
            return BadRequest(new
            {
                message = "Defect units cannot exceed actual units."
            });

        log.Id = 0;

        _context.ProductionLogs.Add(log);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetById),
            new { id = log.Id },
            log
        );
    }

    // PUT: api/productionlogs/1
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id, ProductionLog updated)
    {
        if (updated.DefectUnits > updated.ActualUnits)
            return BadRequest(new
            {
                message = "Defect units cannot exceed actual units."
            });

        var log = await _context.ProductionLogs.FindAsync(id);

        if (log == null)
            return NotFound();

        log.ProductionDate = updated.ProductionDate;
        log.ProductionLine = updated.ProductionLine;
        log.Shift = updated.Shift;
        log.TargetUnits = updated.TargetUnits;
        log.ActualUnits = updated.ActualUnits;
        log.DefectUnits = updated.DefectUnits;
        log.DowntimeMinutes = updated.DowntimeMinutes;
        log.Notes = updated.Notes;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/productionlogs/1
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var log = await _context.ProductionLogs.FindAsync(id);

        if (log == null)
            return NotFound();

        _context.ProductionLogs.Remove(log);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
