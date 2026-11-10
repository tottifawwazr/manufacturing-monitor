using Microsoft.Data.Sqlite;

namespace ManufacturingMonitor.Api.Hosting;

public static class ProductionConfiguration
{
    public static void Validate(IConfiguration configuration, IHostEnvironment environment)
    {
        var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        foreach (var origin in origins)
        {
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)
                || (uri.Scheme != "https" && uri.Scheme != "http")
                || uri.GetLeftPart(UriPartial.Authority) != origin || !string.IsNullOrEmpty(uri.UserInfo)
                || (environment.IsProduction() && uri.Scheme != "https"))
                throw new InvalidOperationException("Cors:AllowedOrigins must contain exact HTTP(S) origins without paths or wildcards; Production requires HTTPS.");
        }

        if (!environment.IsProduction()) return;
        var value = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(value)) throw new InvalidOperationException("Set ConnectionStrings__DefaultConnection to a separate persistent production SQLite database.");
        var sqlite = new SqliteConnectionStringBuilder(value);
        var developmentDatabase = Path.GetFullPath(Path.Combine(environment.ContentRootPath, "mpms.db"));
        if (sqlite.Mode == SqliteOpenMode.Memory || !Path.IsPathFullyQualified(sqlite.DataSource)
            || Path.GetFullPath(sqlite.DataSource).Equals(developmentDatabase, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Production requires an absolute SQLite file path on persistent storage, separate from the development mpms.db.");

        var hosts = configuration["AllowedHosts"];
        if (string.IsNullOrWhiteSpace(hosts) || hosts.Contains('*'))
            throw new InvalidOperationException("Set AllowedHosts to the exact production hostname(s), separated by semicolons.");
    }
}
