using ManufacturingMonitor.Api.Data;
using ManufacturingMonitor.Api.Hosting;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;

var seedDemo = args.Contains("--seed-demo", StringComparer.Ordinal);
var initializeProductionDemo = args.Contains("--initialize-production-demo", StringComparer.Ordinal);
var builder = WebApplication.CreateBuilder(args.Where(arg => arg is not "--seed-demo" and not "--initialize-production-demo").ToArray());
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks().AddCheck<DatabaseReadinessCheck>("database", tags: ["ready"]);
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
{
    var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    if (origins.Length > 0) policy.WithOrigins(origins);
    policy.WithMethods("GET", "POST", "PUT", "DELETE").WithHeaders("Content-Type", "Accept");
}));

var app = builder.Build();
ProductionConfiguration.Validate(app.Configuration, app.Environment);
var readOnly = app.Configuration.GetValue("Demo:ReadOnly", app.Environment.IsProduction());

if (seedDemo || initializeProductionDemo)
{
    if ((seedDemo && (!app.Environment.IsDevelopment() || initializeProductionDemo))
        || (initializeProductionDemo && (!app.Environment.IsProduction() || !readOnly)))
    {
        Console.Error.WriteLine("Use --seed-demo only in Development, or --initialize-production-demo only in read-only Production. No records were changed.");
        Environment.ExitCode = 1;
        return;
    }
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (seedDemo)
    {
        var result = await DemoProductionSeeder.SeedAsync(db, app.Environment);
        Console.WriteLine($"SIMULATED development demo: planned {result.Planned}, inserted {result.Inserted}, skipped {result.Skipped}. Existing records preserved.");
    }
    else
    {
        await ProductionDemoInitializer.InitializeAsync(db, app.Environment, readOnly);
        Console.WriteLine("Initialized a separate production database with 84 SIMULATED manufacturing records. No development database was copied.");
    }
    return;
}

if (app.Environment.IsDevelopment()) app.MapOpenApi();
else app.UseExceptionHandler();

// TLS is terminated and HTTP redirected by the hosting edge in the Docker/Render setup.
// No forwarded-header trust is broadened. Direct TLS hosts can opt into application redirects.
if (app.Configuration.GetValue<bool>("Hosting:RedirectHttps")) app.UseHttpsRedirection();
app.UseRouting();
app.UseCors();
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    if (readOnly && context.Request.Path.StartsWithSegments("/api")
        && !HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method) && !HttpMethods.IsOptions(context.Request.Method))
    {
        await Results.Problem(statusCode: 403, title: "The public demo is read-only. Run MPMS locally to add, edit, or delete records.").ExecuteAsync(context);
        return;
    }
    await next(context);
});
app.UseAuthorization();

var healthResponse = new Func<HttpContext, Microsoft.Extensions.Diagnostics.HealthChecks.HealthReport, Task>(async (context, report) =>
{
    context.Response.Headers.CacheControl = "no-store";
    await context.Response.WriteAsJsonAsync(new { status = report.Status.ToString() });
});
app.MapHealthChecks("/healthz/live", new HealthCheckOptions { Predicate = _ => false, ResponseWriter = healthResponse });
app.MapHealthChecks("/healthz/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains("ready"), ResponseWriter = healthResponse });
app.MapControllers();
app.Map("/api/{**path}", () => Results.NotFound());
app.Map("/healthz/{**path}", () => Results.NotFound());
app.Map("/__qa/{**path}", () => Results.NotFound());

// Vite's build is copied into wwwroot by the Docker/publish procedure.
if (Directory.Exists(app.Environment.WebRootPath))
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
    app.MapFallbackToFile("index.html");
}
app.Run();
public partial class Program;
