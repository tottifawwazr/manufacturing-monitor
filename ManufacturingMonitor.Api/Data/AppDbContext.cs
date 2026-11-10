
using ManufacturingMonitor.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ManufacturingMonitor.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<ProductionLog> ProductionLogs => Set<ProductionLog>();
}
