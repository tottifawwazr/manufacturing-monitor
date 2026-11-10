using Microsoft.EntityFrameworkCore;

namespace ManufacturingMonitor.Api.Data;

public static class ProductionDemoInitializer
{
    public static async Task InitializeAsync(AppDbContext db, IHostEnvironment environment, bool readOnly)
    {
        if (!environment.IsProduction() || !readOnly)
            throw new InvalidOperationException("Production demo initialization requires Production and Demo__ReadOnly=true.");
        await db.Database.MigrateAsync();
        await using var transaction = await db.Database.BeginTransactionAsync();
        if (await db.ProductionLogs.AnyAsync())
            throw new InvalidOperationException("The production database is not empty. No records were inserted, changed, or deleted.");
        db.AddRange(DemoProductionSeeder.Generate());
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }
}
