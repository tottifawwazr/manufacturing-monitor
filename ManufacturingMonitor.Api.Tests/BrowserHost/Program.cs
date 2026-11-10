using ManufacturingMonitor.Api.Controllers;
using ManufacturingMonitor.Api.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

// Dedicated QA executable. It has no development connection-string configuration,
// accepts no database path, and always uses a fresh process-local SQLite database.
var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://127.0.0.1:5187");
builder.Logging.ClearProviders();
builder.Logging.AddSimpleConsole();
builder.Logging.AddFilter("Microsoft.EntityFrameworkCore", LogLevel.Warning);
var connectionString = $"Data Source=MPMS-Browser-{Guid.NewGuid():N};Mode=Memory;Cache=Shared";
await using var connection = new SqliteConnection(connectionString);
await connection.OpenAsync();
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));
builder.Services.AddControllers().AddApplicationPart(typeof(ProductionLogsController).Assembly);
var app = builder.Build();
await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    db.AddRange(DemoProductionSeeder.Generate());
    await db.SaveChangesAsync();
}
app.MapGet("/__qa/health", () => new { testOnly = true, inMemory = true });
app.MapControllers();
await app.RunAsync();
