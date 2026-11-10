using ManufacturingMonitor.Api.Data;
using ManufacturingMonitor.Api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace ManufacturingMonitor.Api.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string connectionString = $"Data Source=MPMS-Test-{Guid.NewGuid():N};Mode=Memory;Cache=Shared";
    private readonly SqliteConnection connection;
    private readonly string environmentName;
    private readonly Dictionary<string, string?> settings;

    public ApiFactory(string environmentName = "Testing", Dictionary<string, string?>? settings = null)
    {
        this.environmentName = environmentName;
        this.settings = settings ?? [];
        connection = new SqliteConnection(connectionString);
        connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(environmentName);
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(settings));
        builder.ConfigureLogging(logging => logging.ClearProviders());
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<AppDbContext>();
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));
        });
    }

    public async Task InitializeDatabaseAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(connectionString, db.Database.GetDbConnection().ConnectionString);
        Assert.Equal(SqliteOpenMode.Memory, new SqliteConnectionStringBuilder(connectionString).Mode);
        await db.Database.MigrateAsync();
    }

    public async Task AddRecordsAsync(params ProductionLog[] records)
    {
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.AddRange(records);
        await db.SaveChangesAsync();
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await connection.DisposeAsync();
    }
}

public abstract class ApiTest : IAsyncLifetime
{
    protected ApiFactory Factory { get; } = new();
    protected HttpClient Client { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        await Factory.InitializeDatabaseAsync();
        Client = Factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), AllowAutoRedirect = false });
    }

    public async Task DisposeAsync()
    {
        Client.Dispose();
        await Factory.DisposeAsync();
    }

    protected static ProductionLog Record(string line = "Line A", int target = 100, int actual = 90, int defects = 1, int downtime = 5, string date = "2026-11-10") => new()
    {
        ProductionDate = DateOnly.Parse(date), ProductionLine = line, Shift = "Morning",
        TargetUnits = target, ActualUnits = actual, DefectUnits = defects, DowntimeMinutes = downtime, Notes = "Integration test record"
    };
}
