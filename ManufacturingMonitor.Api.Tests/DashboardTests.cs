using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ManufacturingMonitor.Api.Data;

namespace ManufacturingMonitor.Api.Tests;

public sealed class DashboardTests : ApiTest
{
    private async Task AddFixtureAsync()
    {
        var simulated = Record(target: 300, actual: 300, defects: 3, downtime: 20);
        simulated.Notes = DemoProductionSeeder.NotePrefix + "test] SIMULATED manufacturing data";
        await Factory.AddRecordsAsync(Record(target: 100, actual: 50, defects: 5, downtime: 10, date: "2026-11-09"), simulated, Record(line: "Line B", target: 200, actual: 100, defects: 2, downtime: 5));
    }

    [Fact]
    public async Task Summary_uses_ratios_of_sums_and_matches_daily_and_line_aggregates()
    {
        await AddFixtureAsync();
        var summary = await Client.GetFromJsonAsync<JsonElement>("/api/dashboard/summary");
        Assert.Equal(3, summary.GetProperty("recordCount").GetInt32());
        Assert.Equal(1, summary.GetProperty("simulatedRecordCount").GetInt32());
        Assert.Equal(450, summary.GetProperty("totalProduction").GetInt64());
        Assert.Equal(600, summary.GetProperty("totalTarget").GetInt64());
        Assert.Equal(10, summary.GetProperty("totalDefects").GetInt64());
        Assert.Equal(35, summary.GetProperty("totalDowntimeMinutes").GetInt64());
        Assert.Equal(75, summary.GetProperty("targetAchievement").GetDouble());
        Assert.Equal(2.22, summary.GetProperty("defectRate").GetDouble());
        var trend = (await Client.GetFromJsonAsync<JsonElement[]>("/api/dashboard/trend"))!;
        Assert.Equal(2, trend.Length);
        Assert.Equal("2026-11-09", trend[0].GetProperty("date").GetString());
        Assert.Equal(100, trend[0].GetProperty("target").GetInt64());
        Assert.Equal(50, trend[0].GetProperty("actual").GetInt64());
        Assert.Equal(5, trend[0].GetProperty("defects").GetInt64());
        Assert.Equal(400, trend[1].GetProperty("actual").GetInt64());
        var lines = (await Client.GetFromJsonAsync<JsonElement[]>("/api/dashboard/lines"))!;
        Assert.Equal(2, lines.Length);
        Assert.Equal("Line A", lines[0].GetProperty("productionLine").GetString());
        Assert.Equal(87.5, lines[0].GetProperty("achievement").GetDouble());
        Assert.Equal(2.29, lines[0].GetProperty("defectRate").GetDouble());
        Assert.Equal(450, lines.Sum(line => line.GetProperty("actual").GetInt64()));
        Assert.Equal(450, trend.Sum(day => day.GetProperty("actual").GetInt64()));
    }

    [Theory]
    [InlineData("?startDate=2026-11-10&endDate=2026-11-10&productionLine=Line%20A", 1, 300)]
    [InlineData("?startDate=2026-11-09&endDate=2026-11-10", 3, 450)]
    [InlineData("?startDate=2026-11-10", 2, 400)]
    [InlineData("?endDate=2026-11-09", 1, 50)]
    [InlineData("?productionLine=%20Line%20B%20", 1, 100)]
    [InlineData("?productionLine=Missing", 0, 0)]
    [InlineData("?productionLine=%27%20OR%201%3D1--", 0, 0)]
    [InlineData("?startDate=2026-11-11", 0, 0)]
    public async Task Every_endpoint_honors_the_same_inclusive_date_and_line_filters(string query, int count, long actual)
    {
        await AddFixtureAsync();
        var summary = await Client.GetFromJsonAsync<JsonElement>("/api/dashboard/summary" + query);
        var trend = (await Client.GetFromJsonAsync<JsonElement[]>("/api/dashboard/trend" + query))!;
        var lines = (await Client.GetFromJsonAsync<JsonElement[]>("/api/dashboard/lines" + query))!;
        Assert.Equal(count, summary.GetProperty("recordCount").GetInt32());
        Assert.Equal(actual, summary.GetProperty("totalProduction").GetInt64());
        Assert.Equal(actual, trend.Sum(row => row.GetProperty("actual").GetInt64()));
        Assert.Equal(actual, lines.Sum(row => row.GetProperty("actual").GetInt64()));
        if (query.Contains("productionLine=Line%20A")) Assert.Equal("Line A", Assert.Single(lines).GetProperty("productionLine").GetString());
        if (query.Contains("Line%20B")) Assert.Equal("Line B", Assert.Single(lines).GetProperty("productionLine").GetString());
    }

    [Theory]
    [InlineData("summary")]
    [InlineData("trend")]
    [InlineData("lines")]
    public async Task Invalid_or_reversed_dates_return_400(string endpoint)
    {
        foreach (var query in new[] { "?startDate=2026-11-11&endDate=2026-11-10", "?startDate=not-a-date", "?endDate=2026-02-30" })
            Assert.Equal(HttpStatusCode.BadRequest, (await Client.GetAsync($"/api/dashboard/{endpoint}{query}")).StatusCode);
    }

    [Fact]
    public async Task Empty_database_returns_zero_totals_empty_arrays_and_null_defect_rate()
    {
        var summary = await Client.GetFromJsonAsync<JsonElement>("/api/dashboard/summary");
        foreach (var key in new[] { "recordCount", "simulatedRecordCount", "totalProduction", "totalTarget", "totalDefects", "totalDowntimeMinutes", "targetAchievement" }) Assert.Equal(0, summary.GetProperty(key).GetDouble());
        Assert.Equal(JsonValueKind.Null, summary.GetProperty("defectRate").ValueKind);
        Assert.Empty((await Client.GetFromJsonAsync<JsonElement[]>("/api/dashboard/trend"))!);
        Assert.Empty((await Client.GetFromJsonAsync<JsonElement[]>("/api/dashboard/lines"))!);
    }

    [Fact]
    public async Task Zero_production_has_null_rates_and_totals_support_more_than_32_bits()
    {
        await Factory.AddRecordsAsync(Record(actual: 0, defects: 0));
        var summary = await Client.GetFromJsonAsync<JsonElement>("/api/dashboard/summary");
        var line = Assert.Single((await Client.GetFromJsonAsync<JsonElement[]>("/api/dashboard/lines"))!);
        Assert.Equal(JsonValueKind.Null, summary.GetProperty("defectRate").ValueKind);
        Assert.Equal(JsonValueKind.Null, line.GetProperty("defectRate").ValueKind);
        Assert.Equal(0, summary.GetProperty("targetAchievement").GetDouble());
        await Factory.AddRecordsAsync(Record(line: "Line B", target: int.MaxValue, actual: int.MaxValue, defects: 0, downtime: int.MaxValue), Record(line: "Line B", target: int.MaxValue, actual: int.MaxValue, defects: 0, downtime: int.MaxValue));
        var large = await Client.GetFromJsonAsync<JsonElement>("/api/dashboard/summary?productionLine=Line%20B");
        Assert.Equal(2L * int.MaxValue, large.GetProperty("totalProduction").GetInt64());
        Assert.Equal(2L * int.MaxValue, large.GetProperty("totalDowntimeMinutes").GetInt64());
        Assert.Equal(100, large.GetProperty("targetAchievement").GetDouble());
        Assert.Equal(2L * int.MaxValue, Assert.Single((await Client.GetFromJsonAsync<JsonElement[]>("/api/dashboard/trend?productionLine=Line%20B"))!).GetProperty("actual").GetInt64());
    }
}
