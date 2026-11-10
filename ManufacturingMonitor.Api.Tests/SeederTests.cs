using System.Net.Http.Json;
using System.Text.Json;
using ManufacturingMonitor.Api.Data;
using ManufacturingMonitor.Api.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;

namespace ManufacturingMonitor.Api.Tests;

public sealed class SeederTests : ApiTest
{
    [Fact]
    public async Task Normal_development_startup_does_not_automatically_seed_records()
    {
        await using var development = new ApiFactory("Development");
        await development.InitializeDatabaseAsync();
        using var client = development.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        Assert.Empty((await client.GetFromJsonAsync<ProductionLog[]>("/api/productionlogs"))!);
    }

    private sealed class TestEnvironment(string name) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = name;
        public string ApplicationName { get; set; } = "MPMS.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    [Fact]
    public async Task Repeated_development_seeding_preserves_existing_records_and_inserts_no_duplicates()
    {
        var original = Record(date: "2026-11-10");
        await Factory.AddRecordsAsync(original);
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var first = await DemoProductionSeeder.SeedAsync(db, new TestEnvironment("Development"));
        Assert.Equal(84, first.Planned);
        Assert.Equal(83, first.Inserted);
        var before = await Client.GetFromJsonAsync<JsonElement[]>("/api/productionlogs");
        var second = await DemoProductionSeeder.SeedAsync(db, new TestEnvironment("Development"));
        Assert.Equal(0, second.Inserted);
        var after = (await Client.GetFromJsonAsync<JsonElement[]>("/api/productionlogs"))!;
        Assert.Equal(JsonSerializer.Serialize(before), JsonSerializer.Serialize(after));
        Assert.Equal(84, after.Length);
        var preserved = (await Client.GetFromJsonAsync<ProductionLog>($"/api/productionlogs/{original.Id}"))!;
        Assert.Equal(original.Notes, preserved.Notes);
        Assert.Equal(original.ActualUnits, preserved.ActualUnits);
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Testing")]
    [InlineData("Staging")]
    public async Task Seeder_rejects_non_development_environments_without_writes(string environment)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await Assert.ThrowsAsync<InvalidOperationException>(() => DemoProductionSeeder.SeedAsync(db, new TestEnvironment(environment)));
        Assert.Equal(0, await db.ProductionLogs.CountAsync());
    }

    [Fact]
    public void Generator_is_deterministic_labeled_and_within_documented_ranges()
    {
        var records = DemoProductionSeeder.Generate().ToArray();
        Assert.Equal(JsonSerializer.Serialize(records), JsonSerializer.Serialize(DemoProductionSeeder.Generate()));
        Assert.Equal(84, records.Length);
        Assert.Equal(84, records.Select(x => (x.ProductionDate, x.ProductionLine, x.Shift)).Distinct().Count());
        Assert.Equal(14, records.Select(x => x.ProductionDate).Distinct().Count());
        Assert.All(records, record =>
        {
            Assert.InRange(record.ProductionDate, new DateOnly(2026, 10, 28), new DateOnly(2026, 11, 10));
            Assert.InRange(record.TargetUnits, 1800, 2600);
            Assert.InRange(100.0 * record.ActualUnits / record.TargetUnits, 84.95, 103.05);
            Assert.InRange(100.0 * record.DefectUnits / record.ActualUnits, 0.45, 3.05);
            Assert.InRange(record.DowntimeMinutes, 0, 85);
            Assert.StartsWith(DemoProductionSeeder.NotePrefix, record.Notes!);
            Assert.Contains("SIMULATED manufacturing data", record.Notes);
        });
        var achievement = records.GroupBy(x => x.ProductionLine).OrderBy(x => x.Key).Select(group => 100.0 * group.Sum(x => x.ActualUnits) / group.Sum(x => x.TargetUnits)).ToArray();
        Assert.True(achievement[0] > achievement[1] && achievement[1] > achievement[2]);
    }
}
