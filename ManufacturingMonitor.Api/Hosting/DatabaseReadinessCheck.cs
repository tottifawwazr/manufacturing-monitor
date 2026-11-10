using ManufacturingMonitor.Api.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ManufacturingMonitor.Api.Hosting;

public sealed class DatabaseReadinessCheck(IServiceScopeFactory scopes) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var sqlite = new SqliteConnectionStringBuilder(db.Database.GetConnectionString());
            // A health probe must not create a missing SQLite file.
            if (sqlite.Mode != SqliteOpenMode.Memory && !File.Exists(sqlite.DataSource)) return HealthCheckResult.Unhealthy();
            await db.ProductionLogs.AsNoTracking().AnyAsync(cancellationToken);
            return HealthCheckResult.Healthy();
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested)
        {
            return HealthCheckResult.Unhealthy(); // Never expose file paths, exceptions, or connection strings.
        }
    }
}
