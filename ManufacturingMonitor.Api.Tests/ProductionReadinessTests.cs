using System.Net;
using System.Net.Http.Json;
using ManufacturingMonitor.Api.Data;
using ManufacturingMonitor.Api.Hosting;
using ManufacturingMonitor.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace ManufacturingMonitor.Api.Tests;

public sealed class ProductionReadinessTests : ApiTest
{
    [Fact]
    public async Task Production_defaults_to_read_only_and_excludes_development_endpoints()
    {
        await using var factory = new ApiFactory("Production", new()
        {
            ["AllowedHosts"] = "localhost",
            ["ConnectionStrings:DefaultConnection"] = $"Data Source={Path.Combine(Path.GetTempPath(), "isolated-production-configuration.db")}"
        });
        await factory.InitializeDatabaseAsync(); // DI replaces this configured path with isolated in-memory SQLite.
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/productionlogs", Record())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/openapi/v1.json")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/__qa/health")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/WeatherForecast")).StatusCode);
    }

    private sealed class EnvironmentStub(string name) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = name;
        public string ApplicationName { get; set; } = "MPMS.ProductionTests";
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    [Fact]
    public async Task Health_endpoints_expose_status_only_and_report_missing_schema_as_unready()
    {
        var healthy = await Client.GetAsync("/healthz/ready");
        Assert.Equal(HttpStatusCode.OK, healthy.StatusCode);
        Assert.Equal("{\"status\":\"Healthy\"}", await healthy.Content.ReadAsStringAsync());
        await using var empty = new ApiFactory(); // Fresh memory database, intentionally no migrations.
        using var client = empty.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/healthz/live")).StatusCode);
        var notReady = await client.GetAsync("/healthz/ready");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, notReady.StatusCode);
        Assert.Equal("{\"status\":\"Unhealthy\"}", await notReady.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Cors_allows_only_the_configured_exact_origin_without_credentials()
    {
        await using var factory = new ApiFactory(settings: new() { ["Cors:AllowedOrigins:0"] = "https://portfolio.example" });
        await factory.InitializeDatabaseAsync();
        using var client = factory.CreateClient();
        foreach (var origin in new[] { "https://portfolio.example", "https://untrusted.example" })
        {
            using var request = new HttpRequestMessage(HttpMethod.Options, "/api/productionlogs");
            request.Headers.Add("Origin", origin);
            request.Headers.Add("Access-Control-Request-Method", "POST");
            request.Headers.Add("Access-Control-Request-Headers", "Content-Type");
            var response = await client.SendAsync(request);
            if (origin == "https://portfolio.example") Assert.Equal(origin, response.Headers.GetValues("Access-Control-Allow-Origin").Single());
            else Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
            Assert.False(response.Headers.Contains("Access-Control-Allow-Credentials"));
        }
    }

    [Fact]
    public async Task Public_read_only_mode_blocks_mutations_while_preserving_reads_and_records()
    {
        await using var factory = new ApiFactory(settings: new() { ["Demo:ReadOnly"] = "true" });
        await factory.InitializeDatabaseAsync();
        var record = Record();
        await factory.AddRecordsAsync(record);
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/productionlogs", Record())).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PutAsJsonAsync($"/api/productionlogs/{record.Id}", Record())).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.DeleteAsync($"/api/productionlogs/{record.Id}")).StatusCode);
        Assert.Single((await client.GetFromJsonAsync<ProductionLog[]>("/api/productionlogs"))!);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/dashboard/summary")).StatusCode);
    }

    [Theory]
    [InlineData("Cors:AllowedOrigins:0", "*")]
    [InlineData("Cors:AllowedOrigins:0", "https://portfolio.example/path")]
    [InlineData("Cors:AllowedOrigins:0", "http://portfolio.example")]
    [InlineData("AllowedHosts", "*")]
    [InlineData("ConnectionStrings:DefaultConnection", "Data Source=mpms.db")]
    public void Invalid_production_configuration_fails_closed(string key, string value)
    {
        var values = new Dictionary<string, string?> { ["AllowedHosts"] = "demo.example", ["ConnectionStrings:DefaultConnection"] = $"Data Source={Path.Combine(Path.GetTempPath(), "separate-production.db")}" };
        values[key] = value;
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(values).Build();
        Assert.Throws<InvalidOperationException>(() => ProductionConfiguration.Validate(configuration, new EnvironmentStub("Production")));
    }

    [Fact]
    public async Task Production_initializer_uses_new_simulated_records_and_refuses_to_overwrite_data()
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await ProductionDemoInitializer.InitializeAsync(db, new EnvironmentStub("Production"), true);
        var before = (await Client.GetFromJsonAsync<ProductionLog[]>("/api/productionlogs"))!;
        Assert.Equal(84, before.Length);
        Assert.All(before, row => Assert.StartsWith(DemoProductionSeeder.NotePrefix, row.Notes!));
        await Assert.ThrowsAsync<InvalidOperationException>(() => ProductionDemoInitializer.InitializeAsync(db, new EnvironmentStub("Production"), true));
        Assert.Equal(before.Select(row => row.Id), (await Client.GetFromJsonAsync<ProductionLog[]>("/api/productionlogs"))!.Select(row => row.Id));
        await Assert.ThrowsAsync<InvalidOperationException>(() => ProductionDemoInitializer.InitializeAsync(db, new EnvironmentStub("Development"), true));
        await Assert.ThrowsAsync<InvalidOperationException>(() => ProductionDemoInitializer.InitializeAsync(db, new EnvironmentStub("Production"), false));
    }
}
